import React from "react";
import styles from "./QuickActions.module.css";

const QuickActions = () => {
    return (
        <div className={styles.grid}>
            <button className={`${styles.btn} ${styles.create}`}>
                <div className={styles.iconBox}>
                    <span className="material-symbols-outlined">add</span>
                </div>
                <div>
                    <h3 className={styles.btnTitle}>Tạo Phòng Mới</h3>
                    <p className={styles.btnDesc}>Gửi lộc đầu năm</p>
                </div>
                <span className={`material-symbols-outlined ${styles.bgIcon}`}>
                    redeem
                </span>
            </button>

            <button className={`${styles.btn} ${styles.join}`}>
                <div className={styles.iconBox}>
                    <span className="material-symbols-outlined">
                        qr_code_scanner
                    </span>
                </div>
                <div>
                    <h3 className={styles.btnTitle}>Tham Gia Phòng</h3>
                    <p className={styles.btnDesc}>Quét QR / Nhập mã</p>
                </div>
                <span className={`material-symbols-outlined ${styles.bgIcon}`}>
                    login
                </span>
            </button>
        </div>
    );
};

export default QuickActions;
