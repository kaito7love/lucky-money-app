import styles from "./AuthHeader.module.css";

const Header = () => (
    <div className={styles.header}>
        <button
            className={styles.backButton}
            onClick={() => window.history.back()}
            aria-label="Quay lại"
        >
            <span className="material-symbols-outlined">arrow_back</span>
        </button>

        <div className={styles.logoWrapper}>
            <div className={styles.mainLogo}>
                <span
                    className="material-symbols-outlined"
                    style={{
                        fontVariationSettings: "'FILL' 1",
                        fontSize: "3rem",
                    }}
                >
                    mail
                </span>
            </div>
            <div className={styles.subLogo}>
                <span className="material-symbols-outlined">paid</span>
            </div>
        </div>
        <h1 className={styles.title}>Lì Xì Tết</h1>
        <p className={styles.subtitle}>Trao lộc đầu xuân, vạn sự như ý</p>
    </div>
);
export default Header;
