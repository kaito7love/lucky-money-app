"use client";

import { useState } from "react";
import styles from "./LixiComposer.module.css";
import { useSession } from "@/lib/SessionContext";

interface ChatLixiMessage {
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

interface LixiComposerProps {
    roomId: string;
    onCreated: (message: ChatLixiMessage) => void;
    onClose: () => void;
}

const ERROR_MESSAGES: Record<string, string> = {
    MISSING_NAME: "Vui lòng nhập tên lì xì.",
    INVALID_TOTAL_AMOUNT: "Tổng số tiền không hợp lệ.",
    INVALID_ENVELOPE_COUNT: "Số bao lì xì không hợp lệ (tối đa 500).",
    INVALID_RANGE: "Không thể chia đều tổng tiền cho số bao này, thử số khác.",
};

const LixiComposer = ({ roomId, onCreated, onClose }: LixiComposerProps) => {
    const { token } = useSession();
    const [name, setName] = useState("");
    const [totalAmount, setTotalAmount] = useState("");
    const [envelopeCount, setEnvelopeCount] = useState("");
    const [error, setError] = useState<string | null>(null);
    const [submitting, setSubmitting] = useState(false);

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        setError(null);
        setSubmitting(true);
        try {
            const res = await fetch("/api/chat/lixi", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    room_id: roomId,
                    session_token: token,
                    name,
                    total_amount: Number(totalAmount),
                    envelope_count: Number(envelopeCount),
                }),
            });
            const data = await res.json();
            if (!res.ok) {
                setError(ERROR_MESSAGES[data.error] ?? "Không thể tạo lì xì, vui lòng thử lại.");
                setSubmitting(false);
                return;
            }
            if (data.pool_id && data.host_token) {
                localStorage.setItem(`lucky_host_token_${data.pool_id}`, data.host_token);
            }
            onCreated(data.message);
        } catch {
            setError("Không thể kết nối máy chủ.");
            setSubmitting(false);
        }
    }

    return (
        <div className={styles.backdrop} onClick={onClose}>
            <div className={styles.sheet} onClick={(e) => e.stopPropagation()}>
                <div className={styles.header}>
                    <h2>🧧 Gửi lì xì vào phòng</h2>
                    <button className={styles.closeBtn} onClick={onClose} aria-label="Đóng" type="button">
                        <span className="material-symbols-outlined">close</span>
                    </button>
                </div>

                <form className={styles.form} onSubmit={handleSubmit}>
                    <div className={styles.field}>
                        <label>Tên lì xì</label>
                        <input
                            type="text"
                            placeholder="Chúc mừng năm mới!"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            required
                        />
                    </div>
                    <div className={styles.row}>
                        <div className={styles.field}>
                            <label>Tổng số tiền</label>
                            <input
                                type="number"
                                min={1}
                                placeholder="100000"
                                value={totalAmount}
                                onChange={(e) => setTotalAmount(e.target.value)}
                                required
                            />
                        </div>
                        <div className={styles.field}>
                            <label>Số bao</label>
                            <input
                                type="number"
                                min={1}
                                max={500}
                                placeholder="5"
                                value={envelopeCount}
                                onChange={(e) => setEnvelopeCount(e.target.value)}
                                required
                            />
                        </div>
                    </div>

                    {error && <p className={styles.errorText}>{error}</p>}

                    <button className={styles.submitBtn} type="submit" disabled={submitting}>
                        {submitting ? "Đang tạo..." : "Gửi lì xì"}
                    </button>
                </form>
            </div>
        </div>
    );
};

export default LixiComposer;
