"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import styles from "./CreateRoom.module.css";
import CreateHeader from "./Header/CreateHeader";
import CreateHero from "./Hero/CreateHero";
import PrivacySettings from "./Privacy/PrivacySettings";
import AmountInput from "./AmountInput/AmountInput";
import DenominationComposer, { type DenominationRow } from "./DenominationComposer/DenominationComposer";
import { useSession } from "@/lib/SessionContext";
import { apiErrorMessage, NETWORK_ERROR_MESSAGE, readJson } from "@/lib/apiError";

type Mode = "random" | "fixed";

interface CreatePoolResponse {
    id: string;
    host_token: string;
    error?: string;
}

const ERROR_MESSAGES: Record<string, string> = {
    MISSING_NAME: "Vui lòng nhập tên phòng.",
    MISSING_HOST_NAME: "Vui lòng nhập tên của bạn (số điện thoại này chưa có tài khoản).",
    INVALID_HOST_PHONE: "Số điện thoại không hợp lệ.",
    INVALID_PIN: "Mã PIN phải gồm 4-6 chữ số.",
    INVALID_TOTAL_AMOUNT: "Tổng số tiền không hợp lệ (tối đa 2.147.483.647đ).",
    INVALID_ENVELOPE_COUNT: "Số bao lì xì không hợp lệ (tối đa 500).",
    INVALID_MODE: "Cách chia bao lì xì không hợp lệ.",
    INVALID_INPUT: "Giá trị min/max không hợp lệ.",
    INVALID_RANGE: "Không thể chia tổng số tiền với min/max đã chọn.",
    COUNT_MISMATCH: "Số giá trị nhập vào không khớp với số bao lì xì.",
    INVALID_VALUE: "Có giá trị bao lì xì không hợp lệ.",
    SUM_MISMATCH: "Tổng giá trị các bao không khớp với tổng số tiền.",
    INVALID_EXPIRY: "Thời gian hết hạn không hợp lệ.",
    USER_LOOKUP_FAILED: "Không thể kiểm tra số điện thoại, vui lòng thử lại.",
    USER_CREATE_FAILED: "Không thể tạo tài khoản cho số điện thoại này, vui lòng thử lại.",
    POOL_CREATE_FAILED: "Không thể tạo phòng, vui lòng thử lại.",
    ENVELOPES_CREATE_FAILED: "Không thể tạo bao lì xì, vui lòng thử lại.",
};

const CreateRoom = () => {
    const router = useRouter();
    const { user } = useSession();
    const [name, setName] = useState("");
    const [greeting, setGreeting] = useState("");
    const [hostName, setHostName] = useState("");
    const [hostPhone, setHostPhone] = useState("");
    const [totalAmount, setTotalAmount] = useState("");
    const [envelopeCount, setEnvelopeCount] = useState("");
    const [mode, setMode] = useState<Mode>("random");
    const [minValue, setMinValue] = useState("");
    const [maxValue, setMaxValue] = useState("");
    const [denominationRows, setDenominationRows] = useState<DenominationRow[]>([]);
    const [expiresInHours, setExpiresInHours] = useState("");
    const [isPrivate, setIsPrivate] = useState(false);
    const [pin, setPin] = useState("");
    const [error, setError] = useState<string | null>(null);
    const [submitting, setSubmitting] = useState(false);
    const [prefilledForUserId, setPrefilledForUserId] = useState<string | null>(null);

    if (user && user.id !== prefilledForUserId) {
        setPrefilledForUserId(user.id);
        setHostPhone(user.phone);
        setHostName(user.name);
    }

    const fixedModeReady =
        mode !== "fixed" ||
        (Number(totalAmount) > 0 &&
            Number(envelopeCount) > 0 &&
            denominationRows.reduce((sum, r) => sum + r.value * r.count, 0) === Number(totalAmount) &&
            denominationRows.reduce((sum, r) => sum + r.count, 0) === Number(envelopeCount));

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        setError(null);

        const body: Record<string, unknown> = {
            name,
            host_name: hostName,
            host_phone: hostPhone,
            total_amount: Number(totalAmount),
            envelope_count: Number(envelopeCount),
            mode,
            is_private: isPrivate,
        };
        if (isPrivate) {
            body.pin = pin;
        }

        if (mode === "random") {
            body.min_value = Number(minValue);
            body.max_value = Number(maxValue);
        } else {
            body.fixed_values = denominationRows.flatMap((r) => Array(r.count).fill(r.value));
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
            const data = await readJson<CreatePoolResponse>(res);
            if (!res.ok) {
                setError(apiErrorMessage(res, data, ERROR_MESSAGES));
                setSubmitting(false);
                return;
            }
            localStorage.setItem(`lucky_host_token_${data.id}`, data.host_token);
            router.push(`/pool/${data.id}`);
        } catch {
            setError(NETWORK_ERROR_MESSAGE);
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
                        <label>Số điện thoại của bạn (Host)</label>
                        <input
                            type="tel"
                            placeholder="09xxxxxxxx"
                            value={hostPhone}
                            onChange={(e) => setHostPhone(e.target.value)}
                            required
                        />
                    </div>

                    <div className={styles.inputGroup}>
                        <label>Tên của bạn (chỉ cần nếu SĐT này chưa có tài khoản)</label>
                        <input
                            type="text"
                            placeholder="Nguyễn Văn A"
                            value={hostName}
                            onChange={(e) => setHostName(e.target.value)}
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
                        <AmountInput
                            label="Tổng số tiền"
                            icon="payments"
                            suffix="đ"
                            placeholder="1.000.000"
                            value={totalAmount}
                            onChange={setTotalAmount}
                            required
                        />
                        <AmountInput
                            label="Số bao lì xì"
                            icon="inventory_2"
                            suffix="bao"
                            placeholder="10"
                            value={envelopeCount}
                            onChange={setEnvelopeCount}
                            required
                        />
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
                            <AmountInput
                                label="Giá trị tối thiểu / bao"
                                icon="trending_down"
                                suffix="đ"
                                value={minValue}
                                onChange={setMinValue}
                                required
                            />
                            <AmountInput
                                label="Giá trị tối đa / bao"
                                icon="trending_up"
                                suffix="đ"
                                value={maxValue}
                                onChange={setMaxValue}
                                required
                            />
                        </div>
                    ) : (
                        <div className={styles.inputGroup}>
                            <label>Giá trị từng bao</label>
                            <DenominationComposer
                                targetTotal={Number(totalAmount)}
                                targetCount={Number(envelopeCount)}
                                rows={denominationRows}
                                onRowsChange={setDenominationRows}
                            />
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

                    <PrivacySettings
                        isPrivate={isPrivate}
                        onToggle={setIsPrivate}
                        pin={pin}
                        onPinChange={setPin}
                    />

                    {error && <p className={styles.errorText}>{error}</p>}

                    <div className={styles.footer}>
                        <button
                            className={styles.submitBtn}
                            type="submit"
                            disabled={submitting || !fixedModeReady}
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
