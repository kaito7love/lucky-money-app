"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import styles from "./LixiMessageCard.module.css";
import { formatVnd } from "@/lib/formatVnd";

interface LixiMessageCardProps {
    senderName: string;
    name: string;
    totalAmount: number;
    envelopeCount: number;
    qrToken: string;
}

interface PoolPreview {
    remaining: number;
    status: string;
}

const LixiMessageCard = ({ senderName, name, totalAmount, envelopeCount, qrToken }: LixiMessageCardProps) => {
    const router = useRouter();
    const [preview, setPreview] = useState<PoolPreview | null>(null);

    useEffect(() => {
        let cancelled = false;
        fetch(`/api/pools/by-qr/${qrToken}`)
            .then((res) => (res.ok ? res.json() : null))
            .then((data) => {
                if (!cancelled && data) {
                    setPreview({ remaining: data.remaining, status: data.status });
                }
            })
            .catch(() => undefined);
        return () => {
            cancelled = true;
        };
    }, [qrToken]);

    const isOpenable = !preview || (preview.status === "active" && preview.remaining > 0);

    return (
        <div className={styles.card}>
            <div className={styles.decorIcon}>
                <span className="material-symbols-outlined">local_florist</span>
            </div>
            <div className={styles.topSection}>
                <div className={styles.giftIconBox}>
                    <span className="material-symbols-outlined">redeem</span>
                </div>
                <div className={styles.infoText}>
                    <h3 className={styles.title}>Lì Xì từ {senderName}</h3>
                    <p className={styles.subTitle}>
                        {name} • {formatVnd(totalAmount)}
                    </p>
                </div>
            </div>
            <div className={styles.divider} />
            <div className={styles.bottomSection}>
                <span className={styles.statusText}>
                    {preview
                        ? isOpenable
                            ? `Còn ${preview.remaining}/${envelopeCount} bao`
                            : preview.status === "completed"
                                ? "Đã hết bao"
                                : "Đã đóng"
                        : `${envelopeCount} bao`}
                </span>
                <button
                    className={styles.openBtn}
                    onClick={() => router.push(`/claim/${qrToken}`)}
                    disabled={!isOpenable}
                >
                    {isOpenable ? "Mở ngay 🧧" : "Đã hết"}
                </button>
            </div>
        </div>
    );
};

export default LixiMessageCard;
