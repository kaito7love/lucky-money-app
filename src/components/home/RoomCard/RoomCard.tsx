import styles from "./RoomCard.module.css";

interface RoomProps {
    name: string;
    desc: string;
    countLabel: string;
    timeLabel: string;
    hasBadge?: boolean;
    onClick?: () => void;
}

const RoomCard = ({ name, desc, countLabel, timeLabel, hasBadge, onClick }: RoomProps) => (
    <div className={styles.card} onClick={onClick}>
        <div className={styles.avatarSection}>
            <div className={styles.avatarCircle}>
                <div className={styles.avatarInitial}>{name.trim().charAt(0).toUpperCase() || "?"}</div>
            </div>
            {hasBadge && (
                <div className={styles.badge}>
                    <div className={styles.dot}></div>
                    <span>Lì Xì</span>
                </div>
            )}
        </div>
        <div className={styles.info}>
            <h3 className={styles.name}>{name}</h3>
            <p className={styles.desc}>{desc}</p>
            <div className={styles.meta}>
                <span className={styles.groupCount}>
                    <span
                        className="material-symbols-outlined"
                        style={{ fontSize: "14px" }}
                    >
                        redeem
                    </span>{" "}
                    {countLabel}
                </span>
                <span>{timeLabel}</span>
            </div>
        </div>
        <span className={`material-symbols-outlined ${styles.arrow}`}>
            chevron_right
        </span>
    </div>
);

export default RoomCard;
