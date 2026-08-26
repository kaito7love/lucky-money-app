"use client";

import { useEffect, useState } from "react";
import styles from "./ChatRoom.module.css";
import ChatHeader from "./ChatHeader/ChatHeader";
import MessageItem from "./MessageItem/MessageItem";
import LiXiEventCard from "./LiXiEventCard/LiXiEventCard";
import ChatInput from "./ChatInput/ChatInput";
import ActiveLixiCard from "./LiXiEventCard/ActiveLixiCard";
import LiXiCard from "./LiXiEventCard/LiXiCard";
import { useSession } from "@/lib/SessionContext";

interface ChatMessage {
    id: string;
    senderId: string;
    senderName: string;
    text: string;
    createdAt: string;
}

const ChatRoom = () => {
    const { user } = useSession();
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetch("/api/chat/messages")
            .then((res) => res.json())
            .then((data) => setMessages(data.messages ?? []))
            .finally(() => setLoading(false));
    }, []);

    return (
        <div className={styles.container}>
            <ChatHeader
                title="Family Group - Tết 2026"
                members={12}
                avatarUrl="https://lh3.googleusercontent.com/aida-public/AB6AXuDeps3lMt9x3VkVqfN165zaLwImreFEed4zMwss4B9V_P2lmB9RNS0Xy_MQkXeg-Y9oGLHpsTh3HkrK0A1Kmpmg4XHgiTIuxRcITZZaFELtxIHRydhLdhFruRs1wjqLC1jcDmebkA8y2-5s6XFpe9YQcw5lm4_ccVjhQbKiWWlcxK-tNJZRYN8bHM4KhF64DNEnErqDpSq0q9uC_vbLcfbx6YcQvdy-TFjAeErMaDNAQHC_qkvcbf8dYnu_Hq_jcm_oMoFVIpgIfyLy"
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
                </div>
            </main>

            <ChatInput onSent={(message) => setMessages((prev) => [...prev, message])} />
        </div>
    );
};

export default ChatRoom;
