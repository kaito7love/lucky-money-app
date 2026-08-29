"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import styles from "./RecentRooms.module.css";

interface ChatRoomSummary {
    id: string;
    name: string;
}

const RecentRooms = () => {
    const router = useRouter();
    const [rooms, setRooms] = useState<ChatRoomSummary[]>([]);

    useEffect(() => {
        fetch("/api/chat/rooms")
            .then((res) => res.json())
            .then((data) => setRooms(data.rooms ?? []));
    }, []);

    if (rooms.length === 0) return null;

    return (
        <div className={styles.container}>
            <div className={styles.header}>
                <h3>Phòng chat</h3>
            </div>
            <div className={styles.scrollArea}>
                {rooms.map((room) => (
                    <button
                        key={room.id}
                        className={styles.roomItem}
                        onClick={() => router.push(`/chat/${room.id}`)}
                    >
                        <div className={styles.avatar}>
                            <div className={styles.avatarInitial}>
                                {room.name.trim().charAt(0).toUpperCase() || "?"}
                            </div>
                        </div>
                        <span>{room.name}</span>
                    </button>
                ))}
            </div>
        </div>
    );
};

export default RecentRooms;
