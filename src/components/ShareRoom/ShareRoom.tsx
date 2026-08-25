import React from "react";
import styles from "./ShareRoom.module.css";
import ShareHeader from "./Header/ShareHeader";
import QRCard from "./QRCard/QRCard";

const ShareRoom: React.FC = () => {
    return (
        <div className={styles.container}>
            {/* Background Decor */}
            <div className={styles.redHeaderBg}>
                <div className={styles.circle1}></div>
                <div className={styles.circle2}></div>
                <div className={styles.patternOverlay}></div>
            </div>

            <ShareHeader />

            <main className={styles.mainContent}>
                {/* User Info */}
                <div className={styles.userSection}>
                    <div className={styles.avatarWrapper}>
                        <img
                            src="https://lh3.googleusercontent.com/aida-public/AB6AXuDtEmQ3-tlrRGPnqsKJ8gw7rvHi92NAQkbuclp9ZICoXroLS2cYYN81ladgM0aUle_JzxPKLODz7Z1nJQ6zJuOfBk3-1ZshJrOw3v_UJjGsJgEdJ_86P8hnrU7ApbwbknH03gIeqm1uEvQI88hHo4TIO5heMYCK_TlYR4Sm_MQ9IaECdeJp8vkXNTWoM32PNAmDySDp7Hw9WQ4dH0ciKxDgme6ghMAfqo1vQTaTzPIptQYLrd4KnLRGe53NLsxs_j1_7KLQcVZandN8"
                            className={styles.avatar}
                            alt="User"
                        />
                        <div className={styles.starBadge}>
                            <span className="material-icons-round">star</span>
                        </div>
                    </div>
                    <h2 className={styles.roomName}>Phòng Lì Xì Của Lan</h2>
                    <div className={styles.idBadge}>
                        <span>ID: 8868</span>
                        <button className={styles.copyBtn}>
                            <span className="material-icons-round">
                                content_copy
                            </span>
                        </button>
                    </div>
                </div>

                <QRCard />

                {/* Action Buttons */}
                <div className={styles.actionArea}>
                    <button className={styles.primaryBtn}>
                        <span className="material-icons-round">share</span>
                        Chia Sẻ Liên Kết
                    </button>

                    <div className={styles.secondaryGroup}>
                        <button className={styles.secondaryBtn}>
                            <span className="material-icons-round">
                                content_copy
                            </span>
                            Sao chép mã
                        </button>
                        <button className={styles.secondaryBtn}>
                            <span className="material-icons-round">
                                download
                            </span>
                            Lưu ảnh
                        </button>
                    </div>
                </div>
            </main>
        </div>
    );
};

export default ShareRoom;
