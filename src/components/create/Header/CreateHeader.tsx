import styles from "./CreateHeader.module.css";

const CreateHeader = () => (
    <header className={styles.header}>
        <button
            className={styles.backButton}
            onClick={() => window.history.back()}
        >
            <span className="material-symbols-outlined">
                arrow_back_ios_new
            </span>
        </button>
        <h1 className={styles.title}>Tạo Phòng Mới</h1>
        <div className={styles.spacer}></div>
    </header>
);
export default CreateHeader;
