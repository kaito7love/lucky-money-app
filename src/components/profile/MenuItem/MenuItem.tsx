import React from "react";
import styles from "./MenuItem.module.css";

interface MenuItemProps {
    icon: string;
    label: string;
    value?: string;
    badge?: number;
    color?: string;
    onClick?: () => void;
}

const MenuItem: React.FC<MenuItemProps> = ({
    icon,
    label,
    value,
    badge,
    onClick,
}) => (
    <button className={styles.item} onClick={onClick}>
        <div className={styles.iconWrapper}>
            <span className="material-symbols-outlined">{icon}</span>
        </div>
        <p className={styles.label}>{label}</p>
        <div className={styles.rightContent}>
            {badge && <div className={styles.badge}>{badge}</div>}
            {value && <span className={styles.value}>{value}</span>}
            <span className={`material-symbols-outlined ${styles.chevron}`}>
                chevron_right
            </span>
        </div>
    </button>
);

export default MenuItem;
