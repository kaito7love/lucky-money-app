"use client";

import styles from "./ShareRoom.module.css";
import ShareHeader from "./Header/ShareHeader";
import QRCard from "./QRCard/QRCard";
import ClaimsList from "./ClaimsList/ClaimsList";

interface Claim {
    id: string;
    value: number;
    name: string | null;
    phone_masked: string | null;
    claimed_at: string | null;
}

interface ShareRoomProps {
    poolName: string;
    hostName: string;
    statusText: string;
    qrDataUrl: string | null;
    claimUrl: string;
    remaining: number;
    totalEnvelopes: number;
    claims: Claim[];
}

const ShareRoom = ({
    poolName,
    hostName,
    statusText,
    qrDataUrl,
    claimUrl,
    remaining,
    totalEnvelopes,
    claims,
}: ShareRoomProps) => {
    const initial = hostName.trim().charAt(0).toUpperCase() || "?";

    async function handleShare() {
        if (navigator.share) {
            try {
                await navigator.share({ title: poolName, url: claimUrl });
                return;
            } catch {
                // user cancelled or share failed — fall through to clipboard
            }
        }
        await navigator.clipboard.writeText(claimUrl);
    }

    async function handleCopy() {
        await navigator.clipboard.writeText(claimUrl);
    }

    function handleDownload() {
        if (!qrDataUrl) return;
        const a = document.createElement("a");
        a.href = qrDataUrl;
        a.download = `${poolName || "lixi"}-qr.png`;
        a.click();
    }

    return (
        <div className={styles.container}>
            {/* Background Decor */}
            <div className={styles.redHeaderBg}>
                <div className={styles.circle1}></div>
                <div className={styles.circle2}></div>
                <div className={styles.patternOverlay}></div>
            </div>

            <ShareHeader />

            <main className={styles.mainContent}>
                <div className={styles.leftColumn}>
                    {/* User Info */}
                    <div className={styles.userSection}>
                        <div className={styles.avatarWrapper}>
                            <div className={styles.avatarInitial}>{initial}</div>
                            <div className={styles.starBadge}>
                                <span className="material-icons-round">star</span>
                            </div>
                        </div>
                        <h2 className={styles.roomName}>{poolName}</h2>
                        <div className={styles.idBadge}>
                            <span>Host: {hostName}</span>
                            <button className={styles.copyBtn} onClick={handleCopy}>
                                <span className="material-icons-round">
                                    content_copy
                                </span>
                            </button>
                        </div>
                    </div>

                    <QRCard
                        qrDataUrl={qrDataUrl}
                        statusText={statusText}
                        remaining={remaining}
                        totalEnvelopes={totalEnvelopes}
                    />

                    {/* Action Buttons */}
                    <div className={styles.actionArea}>
                        <button className={styles.primaryBtn} onClick={handleShare}>
                            <span className="material-icons-round">share</span>
                            Chia Sẻ Liên Kết
                        </button>

                        <div className={styles.secondaryGroup}>
                            <button className={styles.secondaryBtn} onClick={handleCopy}>
                                <span className="material-icons-round">
                                    content_copy
                                </span>
                                Sao chép mã
                            </button>
                            <button className={styles.secondaryBtn} onClick={handleDownload}>
                                <span className="material-icons-round">
                                    download
                                </span>
                                Lưu ảnh
                            </button>
                        </div>
                    </div>
                </div>

                <div className={styles.rightColumn}>
                    <ClaimsList claims={claims} />
                </div>
            </main>
        </div>
    );
};

export default ShareRoom;
