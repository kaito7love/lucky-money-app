import type { HTMLAttributes } from "react";
import styles from "./InputField.module.css";

interface Props {
    label: string;
    icon?: string;
    prefix?: string;
    placeholder: string;
    type?: string;
    value?: string;
    onChange?: (value: string) => void;
    required?: boolean;
    inputMode?: HTMLAttributes<HTMLInputElement>["inputMode"];
    maxLength?: number;
}

const InputField = ({
    label,
    icon,
    prefix,
    placeholder,
    type = "text",
    value,
    onChange,
    required,
    inputMode,
    maxLength,
}: Props) => {
    const inputClasses = [
        styles.input,
        icon ? styles.hasIcon : "",
        prefix ? styles.hasPrefix : "",
    ].join(" ");

    return (
        <div className={styles.group}>
            <label className={styles.label}>{label}</label>
            <div className={styles.wrapper}>
                {icon && (
                    <span
                        className={`material-symbols-outlined ${styles.icon}`}
                    >
                        {icon}
                    </span>
                )}
                {prefix && <div className={styles.prefix}>{prefix}</div>}
                <input
                    type={type}
                    placeholder={placeholder}
                    className={inputClasses}
                    value={value}
                    onChange={onChange ? (e) => onChange(e.target.value) : undefined}
                    required={required}
                    inputMode={inputMode}
                    maxLength={maxLength}
                />
            </div>
        </div>
    );
};

export default InputField;
