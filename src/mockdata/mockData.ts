export interface LiXiData {
    id: string;
    sender: string;
    packetType: string;
    claimed: number;
    total: number;
    message: string;
    remainingTime: string;
}

export const lixiMessages: LiXiData[] = [
    {
        id: "lx-001",
        sender: "Minh Pham",
        packetType: "Big Dragon Packet",
        claimed: 50,
        total: 100,
        message: "Wishing you wealth and health!",
        remainingTime: "04:59",
    },
    {
        id: "lx-002",
        sender: "Anh Tuấn",
        packetType: "Golden Envelope",
        claimed: 12,
        total: 20,
        message: "Phát tài phát lộc nhé cả nhà! 🧧",
        remainingTime: "10:00",
    },
];
