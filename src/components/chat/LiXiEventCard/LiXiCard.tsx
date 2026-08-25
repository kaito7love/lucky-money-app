"use client";

import React, { useState, useEffect } from "react";
import styles from "./LiXiCard.module.css";

interface LiXiCard {
    senderName: string;
    packetName: string; // Thêm cái này cho giống ảnh
    claimedCount: number;
    totalCount: number;
    message: string;
    initialSeconds: number;
    onOpen?: () => void;
}

const LiXiCard: React.FC<LiXiCard> = ({
    senderName,
    packetName,
    claimedCount,
    totalCount,
    message,
    initialSeconds,
    onOpen,
}) => {
    const [seconds, setSeconds] = useState(initialSeconds);

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
                {/* Hoa văn góc phải */}
                <div className={styles.decorIcon}>
                    <span className="material-symbols-outlined">
                        local_florist
                    </span>
                </div>

                <div className={styles.content}>
                    {/* Phần đầu: Avatar & Thông tin gói */}
                    <div className={styles.topSection}>
                        <div className={styles.giftIconBox}>
                            <span className="material-symbols-outlined">
                                redeem
                            </span>
                        </div>
                        <div className={styles.infoText}>
                            <h3 className={styles.title}>
                                Lì Xì from {senderName}
                            </h3>
                            <p className={styles.subTitle}>
                                {packetName.toUpperCase()} • {claimedCount}/
                                {totalCount} CLAIMED
                            </p>
                        </div>
                    </div>

                    <div className={styles.divider} />

                    {/* Phần dưới: Lời chúc & Nút mở */}
                    <div className={styles.bottomSection}>
                        <div className={styles.leftCol}>
                            <p className={styles.messageText}>&ldquo;{message}&rdquo;</p>
                            <div className={styles.timerRow}>
                                <span className="material-symbols-outlined">
                                    timer
                                </span>
                                <span>{formatTime(seconds)} REMAINING</span>
                            </div>
                        </div>

                        <button className={styles.openBtn} onClick={onOpen}>
                            <span>OPEN</span>
                            <div className={styles.miniLixi}>
                                <div className={styles.lixiSeal} />
                            </div>
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default LiXiCard;
