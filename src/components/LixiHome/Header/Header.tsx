import React from "react";
import styles from "./Header.module.css";

const Header = () => {
    return (
        <header className={styles.header}>
            <div className={styles.container}>
                <div className={styles.textGroup}>
                    <p className={styles.label}>Lì Xì Tết 2026</p>
                    <h1 className={styles.title}>Danh Sách Phòng</h1>
                </div>

                <div className={styles.profileArea}>
                    <div className={styles.avatarWrapper}>
                        <div
                            className={styles.avatar}
                            style={{
                                backgroundImage:
                                    "url('https://api.dicebear.com/7.x/avataaars/svg?seed=Felix')",
                            }}
                        ></div>
                        <div className={styles.statusDot}></div>
                    </div>
                </div>
            </div>
        </header>
    );
};

export default Header;
