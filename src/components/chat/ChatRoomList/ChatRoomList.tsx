"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import styles from "./ChatRoomList.module.css";
import { useBackOrHome } from "@/lib/useBackOrHome";
import { useSession } from "@/lib/SessionContext";
import { formatRelativeTime } from "@/lib/formatRelativeTime";

interface ChatRoomSummary {
    id: string;
    name: string;
    memberCount: number;
    lastMessage: { text: string; createdAt: string } | null;
}

const ChatRoomList = () => {
    const router = useRouter();
    const goBack = useBackOrHome();
    const { user, loading: sessionLoading } = useSession();
    const [rooms, setRooms] = useState<ChatRoomSummary[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!user) return;
        fetch("/api/chat/rooms")
            .then((res) => res.json())
            .then((data) => setRooms(data.rooms ?? []))
            .finally(() => setLoading(false));
    }, [user]);

    if (sessionLoading) {
        return <p className={styles.centerMessage}>Đang tải...</p>;
    }

    if (!user) {
        return (
            <div className={styles.signedOut}>
                <button
                    className={styles.signedOutBackBtn}
                    onClick={() => window.history.back()}
                    aria-label="Quay lại"
                >
                    <span className="material-symbols-outlined">arrow_back</span>
                </button>
                <span className="material-symbols-outlined">forum</span>
                <p>Đăng nhập để xem danh sách trò chuyện.</p>
                <button className={styles.loginBtn} onClick={() => router.push("/auth")}>
                    Đăng nhập / Đăng ký
                </button>
            </div>
        );
    }

    return (
        <div className={styles.page}>
            <header className={styles.header}>
                <button className={styles.backBtn} onClick={goBack} aria-label="Quay lại">
                    <span className="material-symbols-outlined">arrow_back</span>
                </button>
                <h1 className={styles.title}>Trò chuyện</h1>
                <div className={styles.spacer}></div>
            </header>

            <main className={styles.main}>
                {loading ? (
                    <p className={styles.centerMessage}>Đang tải...</p>
                ) : (
                    rooms.map((room) => (
                        <button
                            key={room.id}
                            className={styles.card}
                            onClick={() => router.push(`/chat/${room.id}`)}
                        >
                            <div className={styles.avatar}>
                                {room.name.trim().charAt(0).toUpperCase() || "?"}
                            </div>
                            <div className={styles.info}>
                                <div className={styles.topRow}>
                                    <span className={styles.name}>{room.name}</span>
                                    {room.lastMessage && (
                                        <span className={styles.time}>
                                            {formatRelativeTime(room.lastMessage.createdAt)}
                                        </span>
                                    )}
                                </div>
                                <div className={styles.bottomRow}>
                                    <span className={styles.preview}>
                                        {room.lastMessage?.text ?? "Chưa có tin nhắn nào"}
                                    </span>
                                    <span className={styles.members}>{room.memberCount} thành viên</span>
                                </div>
                            </div>
                        </button>
                    ))
                )}
            </main>
        </div>
    );
};

export default ChatRoomList;
