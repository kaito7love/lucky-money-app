import styles from "./CreateHero.module.css";

const CreateHero = () => (
    <div className={styles.hero}>
        <div className={styles.iconContainer}>
            <span className="material-symbols-outlined">holiday_village</span>
            <div className={styles.badge}>
                <span className="material-symbols-outlined">add</span>
            </div>
        </div>
        <p className={styles.subtitle}>Bắt đầu không gian lì xì của bạn</p>
    </div>
);
export default CreateHero;
