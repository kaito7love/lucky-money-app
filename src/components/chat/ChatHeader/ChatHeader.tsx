import React from "react";
import styles from "./ChatHeader.module.css";
import { useBackOrHome } from "@/lib/useBackOrHome";

interface ChatHeaderProps {
    title: string;
    members: number;
    avatarUrl: string;
}

const ChatHeader: React.FC<ChatHeaderProps> = ({
    title,
    members,
    avatarUrl,
}) => {
    const goBack = useBackOrHome();

    return (
        <header className={styles.header}>
            <button className={styles.iconBtn} onClick={goBack} aria-label="Quay lại">
                <span className="material-symbols-outlined">arrow_back</span>
            </button>
            <div className={styles.info}>
                <div className={styles.avatarWrapper}>
                    <div
                        className={styles.avatar}
                        style={{ backgroundImage: `url(${avatarUrl})` }}
                    />
                    <div className={styles.onlineStatus} />
                </div>
                <div>
                    <h2 className={styles.title}>{title}</h2>
                    <span className={styles.subtitle}>
                        {members} Thành viên • Online
                    </span>
                </div>
            </div>
            <div className={styles.actions}>
                <button className={styles.iconBtn}>
                    <span className="material-symbols-outlined">call</span>
                </button>
                <button className={styles.iconBtn}>
                    <span className="material-symbols-outlined">info</span>
                </button>
            </div>
        </header>
    );
};

export default ChatHeader;
