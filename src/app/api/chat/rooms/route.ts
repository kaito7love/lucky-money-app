import { NextResponse } from "next/server";
import { getLastMessageByRoom } from "@/lib/chatMessages";
import { CHAT_ROOMS } from "@/lib/chatRooms";

export async function GET() {
    // The room list itself is static, but its previews are not: unwrapped, a
    // failed lookup left Next to answer with a bare 500 and no body, which the
    // chat list could only render as "no rooms".
    let lastByRoom;
    try {
        lastByRoom = await getLastMessageByRoom();
    } catch (err) {
        const code = err instanceof Error ? err.message : "MESSAGES_FETCH_FAILED";
        return NextResponse.json(
            { error: code, message: "Không thể tải danh sách phòng, vui lòng thử lại." },
            { status: 500 }
        );
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
