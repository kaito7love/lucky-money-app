import { NextResponse } from "next/server";
import { getLastMessageByRoom } from "@/lib/chatMessages";
import { CHAT_ROOMS } from "@/lib/chatRooms";

export async function GET() {
    const lastByRoom = await getLastMessageByRoom();

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
