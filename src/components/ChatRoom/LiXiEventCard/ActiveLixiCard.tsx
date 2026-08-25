import React, { useState, useEffect } from "react";
import styles from "./ActiveLixiCard.module.css";

interface ActiveLixiCardProps {
    senderName: string;
    claimedCount: number;
    totalCount: number;
    message: string;
    initialSeconds: number;
    onOpen?: () => void;
}

const ActiveLixiCard: React.FC<ActiveLixiCardProps> = ({
    senderName,
    claimedCount,
    totalCount,
    message,
    initialSeconds,
    onOpen,
}) => {
    const [seconds, setSeconds] = useState(initialSeconds);

    // Logic đếm ngược đơn giản
    useEffect(() => {
        if (seconds <= 0) return;
        const timer = setInterval(() => setSeconds((prev) => prev - 1), 1000);
        return () => clearInterval(timer);
    }, [seconds]);

    const formatTime = (s: number) => {
        const mins = Math.floor(s / 60);
        const secs = s % 60;
        return `${mins.toString().padStart(2, "0")}:${secs
            .toString()
            .padStart(2, "0")}`;
    };

    return (
        <div className={styles.container}>
            <div className={styles.card}>
                {/* Họa tiết hoa mai trang trí góc */}
                <div className={styles.decorIcon}>
                    <span className="material-symbols-outlined">
                        local_florist
                    </span>
                </div>

                <div className={styles.content}>
                    {/* Header của Card */}
                    <div className={styles.header}>
                        <div className={styles.iconWrapper}>
                            <span className="material-symbols-outlined">
                                redeem
                            </span>
                        </div>
                        <div className={styles.headerInfo}>
                            <p className={styles.senderText}>
                                Lì Xì từ {senderName}
                            </p>
                            <p className={styles.subText}>
                                Big Dragon Packet • {claimedCount}/{totalCount}{" "}
                                đã nhận
                            </p>
                        </div>
                    </div>

                    <div className={styles.divider} />

                    {/* Body & Footer */}
                    <div className={styles.footer}>
                        <div className={styles.messageGroup}>
                            <p className={styles.message}>"{message}"</p>
                            <div className={styles.timerGroup}>
                                <span
                                    className={`material-symbols-outlined ${styles.timerIcon}`}
                                >
                                    timer
                                </span>
                                <p className={styles.timerText}>
                                    {formatTime(seconds)} CÒN LẠI
                                </p>
                            </div>
                        </div>

                        <button className={styles.openButton} onClick={onOpen}>
                            <span>MỞ NGAY 🧧</span>
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ActiveLixiCard;
