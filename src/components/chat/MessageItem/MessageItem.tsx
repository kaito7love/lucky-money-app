import React from "react";
import styles from "./MessageItem.module.css";

interface MessageProps {
    text?: string;
    sender?: string;
    avatar?: string;
    isMine?: boolean;
    status?: string;
}

const MessageItem: React.FC<MessageProps> = ({
    text,
    sender,
    avatar,
    isMine,
    status,
}) => (
    <div
        className={`${styles.container} ${
            isMine ? styles.mine : styles.others
        }`}
    >
        {!isMine && avatar && (
            <div
                className={styles.avatar}
                style={{ backgroundImage: `url(${avatar})` }}
            />
        )}
        <div className={styles.msgBody}>
            {!isMine && <span className={styles.sender}>{sender}</span>}
            <div className={styles.bubble}>
                <p>{text}</p>
            </div>
            {status && <span className={styles.status}>{status}</span>}
        </div>
    </div>
);

export default MessageItem;
