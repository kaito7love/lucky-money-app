"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import styles from "./CreateRoom.module.css";
import CreateHeader from "./Header/CreateHeader";
import CreateHero from "./Hero/CreateHero";
import PrivacySettings from "./Privacy/PrivacySettings";

type Mode = "random" | "fixed";

const CreateRoom = () => {
    const router = useRouter();
    const [name, setName] = useState("");
    const [greeting, setGreeting] = useState("");
    const [hostName, setHostName] = useState("");
    const [totalAmount, setTotalAmount] = useState("");
    const [envelopeCount, setEnvelopeCount] = useState("");
    const [mode, setMode] = useState<Mode>("random");
    const [minValue, setMinValue] = useState("");
    const [maxValue, setMaxValue] = useState("");
    const [fixedValuesText, setFixedValuesText] = useState("");
    const [expiresInHours, setExpiresInHours] = useState("");
    const [error, setError] = useState<string | null>(null);
    const [submitting, setSubmitting] = useState(false);

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        setError(null);

        const body: Record<string, unknown> = {
            name,
            host_name: hostName,
            total_amount: Number(totalAmount),
            envelope_count: Number(envelopeCount),
            mode,
        };

        if (mode === "random") {
            body.min_value = Number(minValue);
            body.max_value = Number(maxValue);
        } else {
            const values = fixedValuesText
                .split(/[\n,]+/)
                .map((v) => v.trim())
                .filter(Boolean)
                .map(Number);
            body.fixed_values = values;
        }

        if (expiresInHours) {
            body.expires_in_hours = Number(expiresInHours);
        }

        setSubmitting(true);
        try {
            const res = await fetch("/api/pools", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(body),
            });
            const data = await res.json();
            if (!res.ok) {
                setError(data.error ?? "Có lỗi xảy ra");
                setSubmitting(false);
                return;
            }
            localStorage.setItem(`lucky_host_token_${data.id}`, data.host_token);
            router.push(`/pool/${data.id}`);
        } catch {
            setError("Không thể kết nối máy chủ.");
            setSubmitting(false);
        }
    }

    return (
        <div className={styles.pageWrapper}>
            <div className={styles.bgPattern}></div>
            <CreateHeader />
            <main className={styles.main}>
                <CreateHero />
                <form className={styles.form} onSubmit={handleSubmit}>
                    <div className={styles.inputGroup}>
                        <label>Tên Phòng (Room Name)</label>
                        <input
                            type="text"
                            placeholder="Ví dụ: Tết Sum Vầy 2026"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            required
                        />
                    </div>

                    <div className={styles.inputGroup}>
                        <label>Tên của bạn (Host)</label>
                        <input
                            type="text"
                            placeholder="Nguyễn Văn A"
                            value={hostName}
                            onChange={(e) => setHostName(e.target.value)}
                            required
                        />
                    </div>

                    <div className={styles.inputGroup}>
                        <label>Lời Chúc (Tết Greeting)</label>
                        <textarea
                            placeholder="Chúc mừng năm mới!"
                            rows={3}
                            value={greeting}
                            onChange={(e) => setGreeting(e.target.value)}
                        ></textarea>
                    </div>

                    <div className={styles.row}>
                        <div className={styles.inputGroup}>
                            <label>Tổng số tiền</label>
                            <input
                                type="number"
                                min={1}
                                placeholder="1000000"
                                value={totalAmount}
                                onChange={(e) => setTotalAmount(e.target.value)}
                                required
                            />
                        </div>
                        <div className={styles.inputGroup}>
                            <label>Số bao lì xì</label>
                            <input
                                type="number"
                                min={1}
                                max={500}
                                placeholder="10"
                                value={envelopeCount}
                                onChange={(e) => setEnvelopeCount(e.target.value)}
                                required
                            />
                        </div>
                    </div>

                    <div className={styles.inputGroup}>
                        <label>Cách chia bao lì xì</label>
                        <div className={styles.radioGroup}>
                            <label className={styles.radioOption}>
                                <input
                                    type="radio"
                                    name="mode"
                                    checked={mode === "random"}
                                    onChange={() => setMode("random")}
                                />
                                Ngẫu nhiên (min/max)
                            </label>
                            <label className={styles.radioOption}>
                                <input
                                    type="radio"
                                    name="mode"
                                    checked={mode === "fixed"}
                                    onChange={() => setMode("fixed")}
                                />
                                Tự nhập giá trị từng bao
                            </label>
                        </div>
                    </div>

                    {mode === "random" ? (
                        <div className={styles.row}>
                            <div className={styles.inputGroup}>
                                <label>Giá trị tối thiểu / bao</label>
                                <input
                                    type="number"
                                    min={1}
                                    value={minValue}
                                    onChange={(e) => setMinValue(e.target.value)}
                                    required
                                />
                            </div>
                            <div className={styles.inputGroup}>
                                <label>Giá trị tối đa / bao</label>
                                <input
                                    type="number"
                                    min={1}
                                    value={maxValue}
                                    onChange={(e) => setMaxValue(e.target.value)}
                                    required
                                />
                            </div>
                        </div>
                    ) : (
                        <div className={styles.inputGroup}>
                            <label>
                                Giá trị từng bao (cách nhau bằng dấu phẩy hoặc
                                xuống dòng)
                            </label>
                            <textarea
                                rows={3}
                                placeholder="50000, 50000, 20000, 10000..."
                                value={fixedValuesText}
                                onChange={(e) =>
                                    setFixedValuesText(e.target.value)
                                }
                                required
                            ></textarea>
                        </div>
                    )}

                    <div className={styles.inputGroup}>
                        <label>Hết hạn sau (giờ, để trống nếu không giới hạn)</label>
                        <input
                            type="number"
                            min={1}
                            value={expiresInHours}
                            onChange={(e) => setExpiresInHours(e.target.value)}
                        />
                    </div>

                    <PrivacySettings />

                    {error && <p className={styles.errorText}>{error}</p>}

                    <div className={styles.footer}>
                        <button
                            className={styles.submitBtn}
                            type="submit"
                            disabled={submitting}
                        >
                            <span>
                                {submitting
                                    ? "Đang tạo..."
                                    : "Tạo Phòng & Chia Sẻ"}
                            </span>
                            <span className="material-symbols-outlined">
                                arrow_forward
                            </span>
                        </button>
                        <p className={styles.terms}>
                            Bằng cách tạo phòng, bạn đồng ý với Điều khoản của
                            chúng tôi.
                        </p>
                    </div>
                </form>
            </main>
        </div>
    );
};
export default CreateRoom;
