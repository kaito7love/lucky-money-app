import styles from "./PrivacySettings.module.css";

const PrivacySettings = () => (
    <div className={styles.card}>
        <div className={styles.row}>
            <div className={styles.info}>
                <div className={styles.iconBox}>
                    <span className="material-symbols-outlined">lock</span>
                </div>
                <div>
                    <p className={styles.title}>Chế độ riêng tư</p>
                    <p className={styles.desc}>
                        Chỉ người có liên kết mới vào được
                    </p>
                </div>
            </div>
            <label className={styles.switch}>
                <input type="checkbox" defaultChecked />
                <span className={styles.slider}></span>
            </label>
        </div>
        <div className={styles.divider}></div>
        <div className={styles.qrRow}>
            <span className={`material-symbols-outlined ${styles.qrIcon}`}>
                qr_code_2
            </span>
            <p className={styles.qrText}>Mã QR tham gia sẽ được tạo tự động</p>
        </div>
    </div>
);
export default PrivacySettings;
