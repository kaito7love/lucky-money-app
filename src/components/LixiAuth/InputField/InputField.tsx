import React from "react";
import styles from "./InputField.module.css";

interface Props {
    label: string;
    icon?: string;
    prefix?: string;
    placeholder: string;
    type?: string;
}

const InputField = ({
    label,
    icon,
    prefix,
    placeholder,
    type = "text",
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
                />
            </div>
        </div>
    );
};

export default InputField;
