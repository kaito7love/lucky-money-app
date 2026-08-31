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
    expiresAt: string | null;
}

/** Coarse near the deadline's start, precise near its end: a 24h window reads
 * better as "23h 5m" than as a ticking "23:05:41", but the last hour is
 * exactly when seconds start to matter. */
function formatCountdown(ms: number): string {
    const total = Math.floor(ms / 1000);
    const hours = Math.floor(total / 3600);
    const minutes = Math.floor((total % 3600) / 60);
    const seconds = total % 60;
    if (hours > 0) return `${hours}h ${minutes}m`;
    return `${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`;
}

const LixiMessageCard = ({ senderName, name, totalAmount, envelopeCount, qrToken }: LixiMessageCardProps) => {
    const router = useRouter();
    const [preview, setPreview] = useState<PoolPreview | null>(null);
    const [now, setNow] = useState(() => Date.now());

    useEffect(() => {
        let cancelled = false;
        fetch(`/api/pools/by-qr/${qrToken}`)
            .then((res) => (res.ok ? res.json() : null))
            .then((data) => {
                if (!cancelled && data) {
                    setPreview({
                        remaining: data.remaining,
                        status: data.status,
                        expiresAt: data.expires_at ?? null,
                    });
                }
            })
            .catch(() => undefined);
        return () => {
            cancelled = true;
        };
    }, [qrToken]);

    // Re-derived from the absolute deadline on every tick rather than counted
    // down from a duration, so a reload doesn't restart the clock. Only the
    // clock itself lives in state — the remaining time is derived during
    // render, so no effect has to write state to keep the two in sync.
    const deadline = preview?.expiresAt ? new Date(preview.expiresAt).getTime() : null;

    useEffect(() => {
        if (deadline === null) return;
        const timer = setInterval(() => setNow(Date.now()), 1000);
        return () => clearInterval(timer);
    }, [deadline]);

    const msLeft = deadline === null ? null : deadline - now;

    // The server flips an expired pool's status on the next read, but the card
    // shouldn't stay openable until then.
    const expired = (msLeft !== null && msLeft <= 0) || preview?.status === "expired";
    const isOpenable = !preview || (preview.status === "active" && preview.remaining > 0 && !expired);

    function statusLabel(): string {
        if (!preview) return `${envelopeCount} bao`;
        if (isOpenable) return `Còn ${preview.remaining}/${envelopeCount} bao`;
        if (preview.status === "completed" || preview.remaining === 0) return "Đã hết bao";
        if (expired) return "Đã hết hạn";
        return "Đã đóng";
    }

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
                <div className={styles.statusGroup}>
                    <span className={styles.statusText}>{statusLabel()}</span>
                    {msLeft !== null && msLeft > 0 && (
                        <span className={styles.timerText}>
                            <span className={`material-symbols-outlined ${styles.timerIcon}`}>timer</span>
                            Còn {formatCountdown(msLeft)}
                        </span>
                    )}
                </div>
                <button
                    className={styles.openBtn}
                    onClick={() => router.push(`/claim/${qrToken}`)}
                    disabled={!isOpenable}
                >
                    {isOpenable ? "Mở ngay 🧧" : expired ? "Hết hạn" : "Đã hết"}
                </button>
            </div>
        </div>
    );
};

export default LixiMessageCard;
