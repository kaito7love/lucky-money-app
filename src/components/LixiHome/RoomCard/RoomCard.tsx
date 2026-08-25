import React from "react";
import styles from "./RoomCard.module.css";

interface RoomProps {
    name: string;
    desc: string;
    members: number;
    time: string;
    img: string;
    hasBadge?: boolean;
}

const RoomCard = ({ name, desc, members, time, img, hasBadge }: RoomProps) => (
    <div className={styles.card}>
        <div className={styles.avatarSection}>
            <div className={styles.avatarCircle}>
                <img src={img} className={styles.img} alt={name} />
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
                        group
                    </span>{" "}
                    {members}
                </span>
                <span>• Active {time}</span>
            </div>
        </div>
        <span className={`material-symbols-outlined ${styles.arrow}`}>
            chevron_right
        </span>
    </div>
);

export default RoomCard;
