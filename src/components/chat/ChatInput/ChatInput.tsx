import styles from "./ChatInput.module.css";

const ChatInput = () => (
    <footer className={styles.footer}>
        <div className={styles.mainInput}>
            <button className={styles.utilBtn}>
                <span className="material-symbols-outlined">add_circle</span>
            </button>
            <div className={styles.field}>
                <input type="text" placeholder="Gửi lời chúc..." />
                <span className="material-symbols-outlined">
                    sentiment_satisfied
                </span>
            </div>
            <button className={styles.sendBtn}>
                <span className="material-symbols-outlined">send</span>
            </button>
        </div>
        <div className={styles.shortcuts}>
            <button className={styles.chipLixi}>
                <span className="material-symbols-outlined">attach_money</span>{" "}
                Lì Xì
            </button>
            <button className={styles.chipGift}>
                <span className="material-symbols-outlined">card_giftcard</span>{" "}
                Quà tặng
            </button>
        </div>
    </footer>
);

export default ChatInput;
