import React from "react";
import styles from "./JoinHeader.module.css";

const JoinHeader = () => (
    <header className={styles.header}>
        <button
            className={styles.backBtn}
            onClick={() => window.history.back()}
        >
            <span className="material-symbols-outlined">arrow_back</span>
        </button>
        <h1 className={styles.title}>Tham gia phòng</h1>
        <div className={styles.spacer}></div>
    </header>
);

export default JoinHeader;
