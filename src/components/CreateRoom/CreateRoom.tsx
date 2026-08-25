import React from "react";
import styles from "./CreateRoom.module.css";
import CreateHeader from "./Header/CreateHeader";
import CreateHero from "./Hero/CreateHero";
import PrivacySettings from "./Privacy/PrivacySettings";

const CreateRoom = () => {
    return (
        <div className={styles.pageWrapper}>
            <div className={styles.bgPattern}></div>
            <CreateHeader />
            <main className={styles.main}>
                <CreateHero />
                <form
                    className={styles.form}
                    onSubmit={(e) => e.preventDefault()}
                >
                    <div className={styles.inputGroup}>
                        <label>Tên Phòng (Room Name)</label>
                        <input
                            type="text"
                            placeholder="Ví dụ: Tết Sum Vầy 2026"
                        />
                    </div>
                    <div className={styles.inputGroup}>
                        <label>Lời Chúc (Tết Greeting)</label>
                        <textarea
                            placeholder="Chúc mừng năm mới!"
                            rows={3}
                        ></textarea>
                    </div>
                    <PrivacySettings />
                    <div className={styles.footer}>
                        <button className={styles.submitBtn}>
                            <span>Tạo Phòng & Chia Sẻ</span>
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
