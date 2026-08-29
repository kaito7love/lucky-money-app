"use client";

import { useEffect, useRef, useState } from "react";
import jsQR from "jsqr";
import styles from "./QRScannerHero.module.css";

interface QRScannerHeroProps {
    onScan: (text: string) => void;
}

const QRScannerHero = ({ onScan }: QRScannerHeroProps) => {
    const [scanning, setScanning] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const videoRef = useRef<HTMLVideoElement>(null);
    const streamRef = useRef<MediaStream | null>(null);
    const frameRef = useRef<number>(0);

    function stopScanning() {
        cancelAnimationFrame(frameRef.current);
        streamRef.current?.getTracks().forEach((track) => track.stop());
        streamRef.current = null;
        setScanning(false);
    }

    async function startScanning() {
        setError(null);
        try {
            const stream = await navigator.mediaDevices.getUserMedia({
                video: { facingMode: "environment" },
                audio: false,
            });
            streamRef.current = stream;
            setScanning(true);
        } catch {
            setError("Không thể truy cập camera. Vui lòng cấp quyền hoặc nhập mã thủ công.");
        }
    }

    useEffect(() => {
        if (!scanning) return;
        const video = videoRef.current;
        const stream = streamRef.current;
        if (!video || !stream) return;

        video.srcObject = stream;
        video.play().catch(() => undefined);

        const canvas = document.createElement("canvas");
        const ctx = canvas.getContext("2d", { willReadFrequently: true });

        function tick() {
            if (video && ctx && video.readyState === video.HAVE_ENOUGH_DATA) {
                canvas.width = video.videoWidth;
                canvas.height = video.videoHeight;
                ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
                const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
                const code = jsQR(imageData.data, imageData.width, imageData.height);
                if (code?.data) {
                    stopScanning();
                    onScan(code.data);
                    return;
                }
            }
            frameRef.current = requestAnimationFrame(tick);
        }
        frameRef.current = requestAnimationFrame(tick);

        return () => cancelAnimationFrame(frameRef.current);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [scanning]);

    // Release the camera if the user navigates away mid-scan.
    useEffect(() => stopScanning, []);

    return (
        <div className={styles.wrapper}>
            <button
                className={styles.scannerCard}
                onClick={startScanning}
                type="button"
                aria-label="Mở camera quét mã"
            >
                <div className={styles.bgImage}></div>
                <div className={styles.overlay}></div>

                <div className={styles.content}>
                    <div className={styles.scannerFrame}>
                        <div className={`${styles.corner} ${styles.tl}`}></div>
                        <div className={`${styles.corner} ${styles.tr}`}></div>
                        <div className={`${styles.corner} ${styles.bl}`}></div>
                        <div className={`${styles.corner} ${styles.br}`}></div>

                        <span className={`material-symbols-outlined ${styles.icon}`}>
                            qr_code_scanner
                        </span>
                        <div className={styles.scanLine}></div>
                    </div>

                    <h2 className={styles.title}>Quét mã nhận Lì Xì</h2>
                    <p className={styles.subtitle}>Chạm để mở camera và quét</p>
                </div>
            </button>

            {error && <p className={styles.errorText}>{error}</p>}

            {scanning && (
                <div className={styles.cameraOverlay}>
                    <video ref={videoRef} className={styles.video} playsInline muted />
                    <div className={styles.cameraScannerFrame}>
                        <div className={`${styles.corner} ${styles.tl}`}></div>
                        <div className={`${styles.corner} ${styles.tr}`}></div>
                        <div className={`${styles.corner} ${styles.bl}`}></div>
                        <div className={`${styles.corner} ${styles.br}`}></div>
                    </div>
                    <p className={styles.cameraHint}>Đưa mã QR vào khung để quét</p>
                    <button
                        className={styles.closeBtn}
                        onClick={stopScanning}
                        type="button"
                        aria-label="Đóng camera"
                    >
                        <span className="material-symbols-outlined">close</span>
                    </button>
                </div>
            )}
        </div>
    );
};

export default QRScannerHero;
