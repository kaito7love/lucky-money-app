"use client";

import { useRouter } from "next/navigation";
import styles from "./HomeHeader.module.css";
import { useSession } from "@/lib/SessionContext";

const Header = () => {
    const router = useRouter();
    const { user } = useSession();

    return (
        <header className={styles.header}>
            <div className={styles.container}>
                <div className={styles.textGroup}>
                    <p className={styles.label}>Lì Xì Tết 2026</p>
                    <h1 className={styles.title}>Danh Sách Phòng</h1>
                </div>

                <button
                    type="button"
                    className={styles.profileArea}
                    onClick={() => router.push("/profile")}
                    aria-label="/profile"
                >
                    <div className={styles.avatarWrapper}>
                        {user ? (
                            <div className={styles.avatar}>
                                {user.name.trim().charAt(0).toUpperCase() || "?"}
                            </div>
                        ) : (
                            <div className={styles.avatarGuest}>
                                <span className="material-symbols-outlined">person</span>
                            </div>
                        )}
                        {user && <div className={styles.statusDot}></div>}
                    </div>
                </button>
            </div>
        </header>
    );
};

export default Header;
