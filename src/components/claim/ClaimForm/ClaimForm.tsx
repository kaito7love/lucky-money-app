import styles from "./ClaimForm.module.css";
import InputField from "@/components/auth/InputField/InputField";

interface ClaimFormProps {
    name: string;
    phone: string;
    pin: string;
    isPrivate: boolean;
    onNameChange: (value: string) => void;
    onPhoneChange: (value: string) => void;
    onPinChange: (value: string) => void;
    onSubmit: (e: React.FormEvent) => void;
    submitting: boolean;
    error: string | null;
}

const ClaimForm = ({
    name,
    phone,
    pin,
    isPrivate,
    onNameChange,
    onPhoneChange,
    onPinChange,
    onSubmit,
    submitting,
    error,
}: ClaimFormProps) => (
    <form className={styles.form} onSubmit={onSubmit}>
        <InputField
            label="Tên của bạn (chỉ cần nếu lần đầu dùng SĐT này)"
            icon="person"
            placeholder="Nguyễn Văn A"
            value={name}
            onChange={onNameChange}
        />
        <InputField
            label="Số điện thoại"
            icon="call"
            placeholder="09xxxxxxxx"
            type="tel"
            value={phone}
            onChange={onPhoneChange}
            required
        />
        {isPrivate && (
            <InputField
                label="Mã PIN phòng"
                icon="lock"
                placeholder="123456"
                value={pin}
                onChange={(v) => onPinChange(v.replace(/\D/g, ""))}
                inputMode="numeric"
                maxLength={6}
                required
            />
        )}
        {error && <p className={styles.errorText}>{error}</p>}
        <button className={styles.submitBtn} type="submit" disabled={submitting}>
            {submitting ? "Đang xử lý..." : "Nhận lì xì 🧧"}
        </button>
    </form>
);

export default ClaimForm;
