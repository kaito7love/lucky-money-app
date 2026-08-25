import React from "react";
import styles from "./JoinRoom.module.css";
import JoinHeader from "./Header/JoinHeader";
import QRScannerHero from "./Scanner/QRScannerHero";
import RecentRooms from "./RecentRooms/RecentRooms";

const JoinRoom = () => {
    const handlePaste = async () => {
        try {
            const text = await navigator.clipboard.readText();
            const input = document.querySelector(
                `.${styles.input}`
            ) as HTMLInputElement;
            if (input) input.value = text;
        } catch (err) {
            console.error("Không thể truy cập clipboard: ", err);
        }
    };

    return (
        <div className={styles.page}>
            <JoinHeader />

            <main className={styles.main}>
                <div className={styles.heroContainer}>
                    <QRScannerHero />
                </div>

                <div className={styles.divider}>
                    <div className={styles.line}></div>
                    <span className={styles.dividerText}>Hoặc nhập mã</span>
                    <div className={styles.line}></div>
                </div>

                <div className={styles.inputSection}>
                    <div className={styles.inputWrapper}>
                        <span
                            className={`material-symbols-outlined ${styles.inputIcon}`}
                        >
                            keyboard
                        </span>
                        <input
                            type="text"
                            placeholder="Nhập mã phòng / lời mời"
                            className={styles.input}
                            spellCheck="false"
                        />
                        <button
                            className={styles.pasteBtn}
                            onClick={handlePaste}
                            type="button"
                        >
                            <span className="material-symbols-outlined">
                                content_paste
                            </span>
                        </button>
                    </div>

                    <button className={styles.submitBtn}>
                        <span>Vào phòng</span>
                        <span className="material-symbols-outlined">
                            arrow_forward
                        </span>
                    </button>
                </div>

                <RecentRooms />
            </main>

            <footer className={styles.footer}>
                <svg viewBox="0 0 1440 320" className={styles.wave}>
                    <path
                        fill="#f42525"
                        d="M0,224L48,213.3C96,203,192,181,288,181.3C384,181,480,203,576,224C672,245,768,267,864,261.3C960,256,1056,224,1152,197.3C1248,171,1344,149,1392,138.7L1440,128L1440,320L1392,320C1344,320,1248,320,1152,320C1056,320,960,320,864,320C768,320,672,320,576,320C480,320,384,320,288,320C192,320,96,320,48,320L0,320Z"
                    />
                </svg>
            </footer>
        </div>
    );
};

export default JoinRoom;
