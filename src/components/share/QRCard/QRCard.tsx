import styles from "./QRCard.module.css";

interface QRCardProps {
    qrDataUrl: string | null;
    statusText: string;
    remaining: number;
    totalEnvelopes: number;
}

const QRCard = ({ qrDataUrl, statusText, remaining, totalEnvelopes }: QRCardProps) => (
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
                    {qrDataUrl ? (
                        // A base64 data: URI generated in the browser, not a
                        // fetched asset — next/image has nothing to optimize
                        // here and would only add a wrapper around it.
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                            src={qrDataUrl}
                            alt="QR nhận lì xì"
                            className={styles.qrImage}
                        />
                    ) : (
                        <div className={styles.qrPlaceholder} />
                    )}
                    <div className={styles.logoOverlay}>
                        <div className={styles.logoCircle}>LIXI</div>
                    </div>
                </div>
            </div>

            <div className={styles.statusGroup}>
                <div className={styles.statusBadge}>
                    <span className={styles.pulseDot}></span>
                    <span>
                        {statusText} • {remaining}/{totalEnvelopes} bao còn lại
                    </span>
                </div>
                <p className={styles.statusDesc}>
                    Mọi người có thể quét mã và nhận lộc ngay lập tức.
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
