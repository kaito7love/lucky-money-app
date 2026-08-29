"use client";

import { useRouter } from "next/navigation";
import styles from "./RecentRooms.module.css";

const RecentRooms = () => {
    const router = useRouter();

    return (
        <div className={styles.container}>
            <div className={styles.header}>
                <h3>Phòng chat</h3>
            </div>
            <div className={styles.scrollArea}>
                <button
                    className={styles.roomItem}
                    onClick={() => router.push("/chat")}
                >
                    <div className={styles.avatar}>
                        <div className={styles.avatarInitial}>F</div>
                    </div>
                    <span>Family Group</span>
                </button>
            </div>
        </div>
    );
};

export default RecentRooms;
