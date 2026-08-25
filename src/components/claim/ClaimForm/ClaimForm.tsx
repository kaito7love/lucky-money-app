import styles from "./ClaimForm.module.css";
import InputField from "@/components/auth/InputField/InputField";

interface ClaimFormProps {
    name: string;
    phone: string;
    onNameChange: (value: string) => void;
    onPhoneChange: (value: string) => void;
    onSubmit: (e: React.FormEvent) => void;
    submitting: boolean;
    error: string | null;
}

const ClaimForm = ({
    name,
    phone,
    onNameChange,
    onPhoneChange,
    onSubmit,
    submitting,
    error,
}: ClaimFormProps) => (
    <form className={styles.form} onSubmit={onSubmit}>
        <InputField
            label="Tên của bạn"
            icon="person"
            placeholder="Nguyễn Văn A"
            value={name}
            onChange={onNameChange}
            required
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
        {error && <p className={styles.errorText}>{error}</p>}
        <button className={styles.submitBtn} type="submit" disabled={submitting}>
            {submitting ? "Đang xử lý..." : "Nhận lì xì 🧧"}
        </button>
    </form>
);

export default ClaimForm;
