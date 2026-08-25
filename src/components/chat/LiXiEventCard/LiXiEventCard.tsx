import styles from "./LiXiEventCard.module.css";

const LiXiEventCard = () => (
    <div className={styles.wrapper}>
        <div className={styles.card}>
            <div className={styles.left}>
                <div className={styles.lixiIcon}>🧧</div>
                <div>
                    <h4 className={styles.cardTitle}>Chú Tuấn gửi Lì Xì!</h4>
                    <p className={styles.cardSub}>Pool: 2,000,000 VND</p>
                </div>
            </div>
            <button className={styles.btn}>Mở ngay</button>
        </div>
    </div>
);

export default LiXiEventCard;
