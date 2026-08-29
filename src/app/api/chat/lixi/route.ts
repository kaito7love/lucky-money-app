import { randomUUID } from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { getUserBySessionToken } from "@/lib/auth";
import { readJson, writeJson } from "@/lib/jsonDb";
import { getChatRoom } from "@/lib/chatRooms";
import { createPool, poolErrorStatus } from "@/lib/pools";

interface ChatMessage {
    id: string;
    roomId: string;
    senderId: string;
    senderName: string;
    text: string;
    createdAt: string;
    lixi?: {
        poolId: string;
        qrToken: string;
        name: string;
        totalAmount: number;
        envelopeCount: number;
    };
}

const MESSAGES_FILE = "chat-messages.json";

/** Lì xì sent into a chat expires a day after it's posted, the way a real
 * red envelope handed out at a gathering stops being live once the gathering
 * ends. The in-chat composer deliberately has no expiry field — keeping the
 * quick-send form to three inputs — so the window is fixed here. Pools made
 * from /create still choose their own. */
const CHAT_LIXI_EXPIRY_HOURS = 24;

/** A reasonable [min, max] per-envelope range around the average, derived
 * automatically since the in-chat quick-create form only asks for a total
 * and an envelope count (no min/max fields). Guaranteed to satisfy
 * generateEnvelopeValues' min*count <= total <= max*count constraint. */
function deriveRange(totalAmount: number, envelopeCount: number): { min: number; max: number } {
    const avg = Math.floor(totalAmount / envelopeCount);
    const min = Math.max(1, Math.floor(avg / 2));
    const max = Math.max(avg + 1, Math.ceil(avg * 1.5));
    return { min, max };
}

export async function POST(req: NextRequest) {
    let body: {
        room_id?: string;
        session_token?: string;
        name?: string;
        total_amount?: number;
        envelope_count?: number;
    };
    try {
        body = await req.json();
    } catch {
        return NextResponse.json({ error: "INVALID_JSON" }, { status: 400 });
    }

    const roomId = body.room_id;
    if (!roomId) {
        return NextResponse.json({ error: "MISSING_ROOM_ID" }, { status: 400 });
    }
    if (!getChatRoom(roomId)) {
        return NextResponse.json({ error: "ROOM_NOT_FOUND" }, { status: 404 });
    }

    if (!body.session_token) {
        return NextResponse.json({ error: "MISSING_SESSION_TOKEN" }, { status: 401 });
    }
    const user = await getUserBySessionToken(body.session_token);
    if (!user) {
        return NextResponse.json({ error: "INVALID_SESSION" }, { status: 401 });
    }

    const totalAmount = Number(body.total_amount);
    const envelopeCount = Number(body.envelope_count);
    const { min, max } = Number.isInteger(totalAmount) && Number.isInteger(envelopeCount) && envelopeCount > 0
        ? deriveRange(totalAmount, envelopeCount)
        : { min: 0, max: 0 };

    let pool;
    try {
        pool = await createPool({
            name: body.name ?? "",
            host_phone: user.phone,
            host_name: user.name,
            total_amount: totalAmount,
            envelope_count: envelopeCount,
            mode: "random",
            min_value: min,
            max_value: max,
            expires_in_hours: CHAT_LIXI_EXPIRY_HOURS,
        });
    } catch (err) {
        const code = err instanceof Error ? err.message : "POOL_CREATE_FAILED";
        return NextResponse.json({ error: code }, { status: poolErrorStatus(code) });
    }

    const messages = await readJson<ChatMessage[]>(MESSAGES_FILE, []);
    const message: ChatMessage = {
        id: randomUUID(),
        roomId,
        senderId: user.id,
        senderName: user.name,
        text: `🧧 Đã gửi lì xì: ${body.name}`,
        createdAt: new Date().toISOString(),
        lixi: {
            poolId: pool.id,
            qrToken: pool.qr_token,
            name: body.name ?? "",
            totalAmount,
            envelopeCount,
        },
    };
    messages.push(message);
    await writeJson(MESSAGES_FILE, messages);

    return NextResponse.json({ message, host_token: pool.host_token, pool_id: pool.id });
}
