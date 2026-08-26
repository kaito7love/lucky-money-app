"use client";

import { useState } from "react";
import styles from "./ShareHeader.module.css";

interface ShareHeaderProps {
    onClosePool?: () => void;
}

const ShareHeader = ({ onClosePool }: ShareHeaderProps) => {
    const [menuOpen, setMenuOpen] = useState(false);

    return (
        <header className={styles.header}>
            <button
                className={styles.iconButton}
                onClick={() => window.history.back()}
            >
                <span className="material-icons-round">arrow_back</span>
            </button>
            <h1 className={styles.title}>Mời Bạn Bè</h1>
            {onClosePool ? (
                <div className={styles.menuWrapper}>
                    <button
                        className={styles.iconButton}
                        onClick={() => setMenuOpen((v) => !v)}
                    >
                        <span className="material-icons-round">more_horiz</span>
                    </button>
                    {menuOpen && (
                        <>
                            <div
                                className={styles.menuBackdrop}
                                onClick={() => setMenuOpen(false)}
                            />
                            <div className={styles.menu}>
                                <button
                                    className={styles.menuItem}
                                    onClick={() => {
                                        setMenuOpen(false);
                                        onClosePool();
                                    }}
                                >
                                    <span className="material-icons-round">block</span>
                                    Đóng phòng sớm
                                </button>
                            </div>
                        </>
                    )}
                </div>
            ) : (
                <div className={styles.spacer} />
            )}
        </header>
    );
};

export default ShareHeader;
