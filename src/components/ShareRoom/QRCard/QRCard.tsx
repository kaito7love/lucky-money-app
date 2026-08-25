import React from "react";
import styles from "./QRCard.module.css";

const QRCard = () => (
    <div className={styles.cardContainer}>
        <div className={styles.cardBody}>
            {/* Decorative Corners */}
            <div className={`${styles.corner} ${styles.topLeft}`}></div>
            <div className={`${styles.corner} ${styles.topRight}`}></div>
            <div className={`${styles.corner} ${styles.bottomLeft}`}></div>
            <div className={`${styles.corner} ${styles.bottomRight}`}></div>

            <p className={styles.instruction}>Quét mã để tham gia ngay</p>

            <div className={styles.qrFrame}>
                <div className={styles.qrInner}>
                    <img
                        src="https://lh3.googleusercontent.com/aida-public/AB6AXuD9fPuTw7bCsSpK9O5wmvHZN0K_hX8y0tE4nuNl5N4NAgWSVWEi_n3HDDxOOMLUziJrvK1-Mbx9x6UT4bj8FUpecFy-eJ0bGCNVOhTDDHQRvF4dRt8DvlvwwM7hpxj07p7pBQhCP1tH0Z49oo_VH0cZRMu8GBlZAkgmP9OyKfpT_c0EVTnZW7GVtcDQ_kKvw9ChXcpkhA1-nvYvORcsaZad3f5gJ5oGQBszC31Ho5A_Ym_g9qW2dMAIuyNQHDTB4mWpIWnOOdUl-8oB"
                        alt="Room QR"
                        className={styles.qrImage}
                    />
                    <div className={styles.logoOverlay}>
                        <div className={styles.logoCircle}>LIXI</div>
                    </div>
                </div>
            </div>

            <div className={styles.statusGroup}>
                <div className={styles.statusBadge}>
                    <span className={styles.pulseDot}></span>
                    <span>Đang mở • 12 người tham gia</span>
                </div>
                <p className={styles.statusDesc}>
                    Mọi người có thể gửi lì xì và nhận lộc ngay lập tức.
                </p>
            </div>
        </div>

        {/* Hanging Decor */}
        <div className={`${styles.decorTag} ${styles.tagLeft}`}>
            <span>福</span>
        </div>
        <div className={`${styles.decorTag} ${styles.tagRight}`}>
            <span>Lộc</span>
        </div>
    </div>
);

export default QRCard;
