"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import styles from "./ChatInput.module.css";
import { useSession } from "@/lib/SessionContext";
import LixiComposer from "@/components/chat/LixiComposer/LixiComposer";

interface ChatMessage {
    id: string;
    senderId: string;
    senderName: string;
    text: string;
    createdAt: string;
    lixi?: {
        poolId: string;
        qrToken: string;
        name: string;
        totalAmount: number;
        envelopeCount: number;
    };
}

interface ChatInputProps {
    roomId: string;
    onSent: (message: ChatMessage) => void;
}

const ChatInput = ({ roomId, onSent }: ChatInputProps) => {
    const { user, token } = useSession();
    const router = useRouter();
    const [text, setText] = useState("");
    const [sending, setSending] = useState(false);
    const [composerOpen, setComposerOpen] = useState(false);

    if (!user) {
        return (
            <footer className={styles.footer}>
                <button
                    className={styles.loginPrompt}
                    onClick={() => router.push("/auth")}
                >
                    Đăng nhập để trò chuyện
                </button>
            </footer>
        );
    }

    async function handleSend() {
        const trimmed = text.trim();
        if (!trimmed || sending) return;
        setSending(true);
        try {
            const res = await fetch("/api/chat/messages", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ room_id: roomId, session_token: token, text: trimmed }),
            });
            if (res.ok) {
                const data = await res.json();
                onSent(data.message);
                setText("");
            }
        } finally {
            setSending(false);
        }
    }

    return (
        <footer className={styles.footer}>
            <div className={styles.mainInput}>
                <button className={styles.utilBtn}>
                    <span className="material-symbols-outlined">add_circle</span>
                </button>
                <div className={styles.field}>
                    <input
                        type="text"
                        placeholder="Gửi lời chúc..."
                        value={text}
                        onChange={(e) => setText(e.target.value)}
                        onKeyDown={(e) => {
                            if (e.key === "Enter") handleSend();
                        }}
                    />
                    <span className="material-symbols-outlined">
                        sentiment_satisfied
                    </span>
                </div>
                <button
                    className={styles.sendBtn}
                    onClick={handleSend}
                    disabled={sending}
                >
                    <span className="material-symbols-outlined">send</span>
                </button>
            </div>
            <div className={styles.shortcuts}>
                <button className={styles.chipLixi} onClick={() => setComposerOpen(true)}>
                    <span className="material-symbols-outlined">attach_money</span>{" "}
                    Lì Xì
                </button>
                <button className={styles.chipGift}>
                    <span className="material-symbols-outlined">card_giftcard</span>{" "}
                    Quà tặng
                </button>
            </div>

            {composerOpen && (
                <LixiComposer
                    roomId={roomId}
                    onClose={() => setComposerOpen(false)}
                    onCreated={(message) => {
                        onSent(message);
                        setComposerOpen(false);
                    }}
                />
            )}
        </footer>
    );
};

export default ChatInput;
