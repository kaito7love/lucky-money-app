import { randomUUID } from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { getUserBySessionToken } from "@/lib/auth";
import { readJson, writeJson } from "@/lib/jsonDb";
import { getChatRoom } from "@/lib/chatRooms";

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

export async function GET(req: NextRequest) {
    const roomId = req.nextUrl.searchParams.get("room_id");
    if (!roomId) {
        return NextResponse.json({ error: "MISSING_ROOM_ID" }, { status: 400 });
    }
    if (!getChatRoom(roomId)) {
        return NextResponse.json({ error: "ROOM_NOT_FOUND" }, { status: 404 });
    }

    const messages = await readJson<ChatMessage[]>(MESSAGES_FILE, []);
    return NextResponse.json({ messages: messages.filter((m) => m.roomId === roomId) });
}

export async function POST(req: NextRequest) {
    let body: { room_id?: string; session_token?: string; text?: string };
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

    const text = body.text?.trim();
    if (!text) {
        return NextResponse.json({ error: "EMPTY_TEXT" }, { status: 400 });
    }

    const messages = await readJson<ChatMessage[]>(MESSAGES_FILE, []);
    const message: ChatMessage = {
        id: randomUUID(),
        roomId,
        senderId: user.id,
        senderName: user.name,
        text,
        createdAt: new Date().toISOString(),
    };
    messages.push(message);
    await writeJson(MESSAGES_FILE, messages);

    return NextResponse.json({ message });
}
