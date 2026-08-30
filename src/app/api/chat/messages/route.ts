import { NextRequest, NextResponse } from "next/server";
import { getUserBySessionToken } from "@/lib/auth";
import { getMessagesByRoom, insertMessage } from "@/lib/chatMessages";
import { getChatRoom } from "@/lib/chatRooms";

export async function GET(req: NextRequest) {
    const roomId = req.nextUrl.searchParams.get("room_id");
    if (!roomId) {
        return NextResponse.json({ error: "MISSING_ROOM_ID" }, { status: 400 });
    }
    if (!getChatRoom(roomId)) {
        return NextResponse.json({ error: "ROOM_NOT_FOUND" }, { status: 404 });
    }

    const messages = await getMessagesByRoom(roomId);
    return NextResponse.json({ messages });
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

    const message = await insertMessage({ roomId, senderId: user.id, senderName: user.name, text });
    return NextResponse.json({ message });
}
