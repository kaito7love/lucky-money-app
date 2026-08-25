import React from "react";
import styles from "./AuthTabs.module.css";

interface Props {
    isLogin: boolean;
    onChange: (val: boolean) => void;
}

const AuthTabs = ({ isLogin, onChange }: Props) => (
    <div className={styles.tabs}>
        <div className={styles.container}>
            <button
                className={`${styles.btn} ${isLogin ? styles.active : ""}`}
                onClick={() => onChange(true)}
            >
                Đăng nhập
            </button>
            <button
                className={`${styles.btn} ${!isLogin ? styles.active : ""}`}
                onClick={() => onChange(false)}
            >
                Đăng ký
            </button>
        </div>
    </div>
);
export default AuthTabs;
