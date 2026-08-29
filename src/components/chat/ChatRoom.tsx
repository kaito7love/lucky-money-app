"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import styles from "./ChatRoom.module.css";
import ChatHeader from "./ChatHeader/ChatHeader";
import MessageItem from "./MessageItem/MessageItem";
import LiXiEventCard from "./LiXiEventCard/LiXiEventCard";
import ChatInput from "./ChatInput/ChatInput";
import ActiveLixiCard from "./LiXiEventCard/ActiveLixiCard";
import LiXiCard from "./LiXiEventCard/LiXiCard";
import { useSession } from "@/lib/SessionContext";
import { getChatRoom } from "@/lib/chatRooms";

interface ChatMessage {
    id: string;
    senderId: string;
    senderName: string;
    text: string;
    createdAt: string;
}

interface ChatRoomProps {
    roomId: string;
}

const ChatRoom = ({ roomId }: ChatRoomProps) => {
    const { user } = useSession();
    const router = useRouter();
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [loading, setLoading] = useState(true);
    const bottomRef = useRef<HTMLDivElement>(null);

    const room = getChatRoom(roomId);

    useEffect(() => {
        let cancelled = false;
        fetch(`/api/chat/messages?room_id=${roomId}`)
            .then((res) => res.json())
            .then((data) => {
                if (cancelled) return;
                setMessages(data.messages ?? []);
            })
            .finally(() => {
                if (!cancelled) setLoading(false);
            });
        return () => {
            cancelled = true;
        };
    }, [roomId]);

    useEffect(() => {
        if (loading) return;
        bottomRef.current?.scrollIntoView({ block: "end" });
    }, [loading, messages]);

    return (
        <div className={styles.container}>
            <ChatHeader
                title={room?.name ?? "Trò chuyện"}
                members={room?.memberCount ?? 0}
                onBack={() => router.push("/chat")}
            />

            <main className={styles.scrollArea}>
                <div className={styles.patternLayer} />

                <div className={styles.chatContent}>
                    <div className={styles.dateTag}>
                        <span>Jan 29, 2026 (Mùng 1)</span>
                    </div>

                    <LiXiEventCard />
                    <LiXiCard
                        senderName="Minh Pham"
                        packetName="Big Dragon Packet"
                        claimedCount={50}
                        totalCount={100}
                        message="Wishing you wealth and health!"
                        initialSeconds={299} // Tương đương 04:59
                        onOpen={() => alert("Chúc mừng năm mới!")}
                    />

                    <ActiveLixiCard
                        senderName="Minh Pham"
                        claimedCount={50}
                        totalCount={100}
                        message="Wishing you wealth and health!"
                        initialSeconds={299} // 4:59
                        onOpen={() => console.log("Lì xì opened!")}
                    />

                    {loading ? (
                        <p className={styles.centerMessage}>Đang tải tin nhắn...</p>
                    ) : messages.length === 0 ? (
                        <p className={styles.centerMessage}>Chưa có tin nhắn nào, hãy là người đầu tiên!</p>
                    ) : (
                        messages.map((m) => (
                            <MessageItem
                                key={m.id}
                                sender={m.senderName}
                                text={m.text}
                                isMine={user?.id === m.senderId}
                            />
                        ))
                    )}
                    <div ref={bottomRef} />
                </div>
            </main>

            <ChatInput
                roomId={roomId}
                onSent={(message) => setMessages((prev) => [...prev, message])}
            />
        </div>
    );
};

export default ChatRoom;
