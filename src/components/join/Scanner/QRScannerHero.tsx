import styles from "./QRScannerHero.module.css";

const QRScannerHero = () => (
    <div className={styles.wrapper}>
        <button className={styles.scannerCard}>
            <div className={styles.bgImage}></div>
            <div className={styles.overlay}></div>

            <div className={styles.content}>
                <div className={styles.scannerFrame}>
                    {/* 4 Corner borders */}
                    <div className={`${styles.corner} ${styles.tl}`}></div>
                    <div className={`${styles.corner} ${styles.tr}`}></div>
                    <div className={`${styles.corner} ${styles.bl}`}></div>
                    <div className={`${styles.corner} ${styles.br}`}></div>

                    <span
                        className={`material-symbols-outlined ${styles.icon}`}
                    >
                        qr_code_scanner
                    </span>
                    <div className={styles.scanLine}></div>
                </div>

                <h2 className={styles.title}>Quét mã nhận Lì Xì</h2>
                <p className={styles.subtitle}>Chạm để mở camera và quét</p>
            </div>
        </button>
    </div>
);

export default QRScannerHero;
