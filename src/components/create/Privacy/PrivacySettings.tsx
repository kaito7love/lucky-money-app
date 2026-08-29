import styles from "./PrivacySettings.module.css";

interface PrivacySettingsProps {
    isPrivate: boolean;
    onToggle: (value: boolean) => void;
    pin: string;
    onPinChange: (value: string) => void;
}

const PrivacySettings = ({ isPrivate, onToggle, pin, onPinChange }: PrivacySettingsProps) => (
    <div className={styles.card}>
        <div className={styles.row}>
            <div className={styles.info}>
                <div className={styles.iconBox}>
                    <span className="material-symbols-outlined">lock</span>
                </div>
                <div>
                    <p className={styles.title}>Chế độ riêng tư</p>
                    <p className={styles.desc}>
                        Cần đúng mã PIN mới nhận được lì xì
                    </p>
                </div>
            </div>
            <label className={styles.switch}>
                <input
                    type="checkbox"
                    checked={isPrivate}
                    onChange={(e) => onToggle(e.target.checked)}
                />
                <span className={styles.slider}></span>
            </label>
        </div>

        {isPrivate && (
            <>
                <div className={styles.divider}></div>
                <div className={styles.pinRow}>
                    <label className={styles.pinLabel} htmlFor="privacy-pin">
                        Mã PIN (4-6 chữ số)
                    </label>
                    <input
                        id="privacy-pin"
                        className={styles.pinInput}
                        type="text"
                        inputMode="numeric"
                        pattern="[0-9]{4,6}"
                        maxLength={6}
                        placeholder="123456"
                        value={pin}
                        onChange={(e) => onPinChange(e.target.value.replace(/\D/g, ""))}
                        required
                    />
                </div>
            </>
        )}

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
