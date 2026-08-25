"use client";

import styles from "./EnvelopeRevealCard.module.css";

interface EnvelopeRevealCardProps {
    stage: "closed" | "opened";
    hostName: string;
    claimedValue: number;
    claimantName: string;
    onOpen: () => void;
}

const EnvelopeRevealCard = ({
    stage,
    hostName,
    claimedValue,
    claimantName,
    onOpen,
}: EnvelopeRevealCardProps) => {
    if (stage === "closed") {
        return (
            <button className={styles.closedCard} onClick={onOpen}>
                <span className={styles.seal}>福</span>
                <span className={styles.tapHint}>Chạm để mở</span>
            </button>
        );
    }

    return (
        <div className={styles.openedCard}>
            <div className={styles.decorIcon}>
                <span className="material-symbols-outlined">local_florist</span>
            </div>
            <p className={styles.emoji}>🧧</p>
            <p className={styles.subTitle}>Lì Xì từ {hostName}</p>
            <p className={styles.receivedLabel}>Bạn đã nhận được</p>
            <p className={styles.value}>{claimedValue.toLocaleString("vi-VN")}đ</p>
            <p className={styles.claimant}>{claimantName}</p>
        </div>
    );
};

export default EnvelopeRevealCard;
