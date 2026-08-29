import { NextResponse } from "next/server";
import { readJson } from "@/lib/jsonDb";
import { CHAT_ROOMS } from "@/lib/chatRooms";

interface ChatMessage {
    id: string;
    roomId: string;
    text: string;
    createdAt: string;
}

export async function GET() {
    const messages = await readJson<ChatMessage[]>("chat-messages.json", []);

    const lastByRoom = new Map<string, ChatMessage>();
    for (const message of messages) {
        const current = lastByRoom.get(message.roomId);
        if (!current || new Date(message.createdAt) > new Date(current.createdAt)) {
            lastByRoom.set(message.roomId, message);
        }
    }

    const rooms = CHAT_ROOMS.map((room) => {
        const last = lastByRoom.get(room.id);
        return {
            id: room.id,
            name: room.name,
            memberCount: room.memberCount,
            lastMessage: last ? { text: last.text, createdAt: last.createdAt } : null,
        };
    });

    return NextResponse.json({ rooms });
}
