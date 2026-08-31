import styles from "./AmountInput.module.css";

interface AmountInputProps {
    label: string;
    icon: string;
    placeholder?: string;
    suffix: string;
    value: string;
    onChange: (value: string) => void;
    required?: boolean;
}

const AmountInput = ({
    label,
    icon,
    placeholder,
    suffix,
    value,
    onChange,
    required,
}: AmountInputProps) => {
    const formatted = value ? Number(value).toLocaleString("vi-VN") : "";

    return (
        <div className={styles.group}>
            <label className={styles.label}>{label}</label>
            <div className={styles.wrapper}>
                <span className={styles.iconBox}>
                    <span className="material-symbols-outlined">{icon}</span>
                </span>
                <input
                    type="text"
                    inputMode="numeric"
                    placeholder={placeholder}
                    value={formatted}
                    onChange={(e) => onChange(e.target.value.replace(/\D/g, ""))}
                    required={required}
                    className={styles.input}
                />
                <span className={styles.suffix}>{suffix}</span>
            </div>
        </div>
    );
};

export default AmountInput;
