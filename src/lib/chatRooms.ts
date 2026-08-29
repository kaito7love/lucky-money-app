export interface ChatRoomMeta {
    id: string;
    name: string;
    memberCount: number;
}

export const CHAT_ROOMS: ChatRoomMeta[] = [
    { id: "family-tet-2026", name: "Family Group - Tết 2026", memberCount: 12 },
    { id: "gia-dinh", name: "Gia Đình", memberCount: 6 },
    { id: "lop-12a", name: "Lớp 12A", memberCount: 38 },
    { id: "cong-ty", name: "Công Ty", memberCount: 24 },
    { id: "hoi-ban", name: "Hội Bạn", memberCount: 8 },
];

export function getChatRoom(id: string): ChatRoomMeta | undefined {
    return CHAT_ROOMS.find((room) => room.id === id);
}
