import styles from "./AuthHeader.module.css";
import { useBackOrHome } from "@/lib/useBackOrHome";

const Header = () => {
    const goBack = useBackOrHome();

    return (
        <>
            <div className={styles.stickyBar}>
                <button
                    className={styles.backButton}
                    onClick={goBack}
                    aria-label="Quay lại"
                >
                    <span className="material-symbols-outlined">arrow_back</span>
                </button>
            </div>

            <div className={styles.header}>
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
        </>
    );
};
export default Header;
