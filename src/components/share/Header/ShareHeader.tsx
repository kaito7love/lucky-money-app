import styles from "./ShareHeader.module.css";

const ShareHeader = () => (
    <header className={styles.header}>
        <button
            className={styles.iconButton}
            onClick={() => window.history.back()}
        >
            <span className="material-icons-round">arrow_back</span>
        </button>
        <h1 className={styles.title}>Mời Bạn Bè</h1>
        <button className={styles.iconButton}>
            <span className="material-icons-round">more_horiz</span>
        </button>
    </header>
);

export default ShareHeader;
