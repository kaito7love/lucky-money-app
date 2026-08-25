"use client";

import { useState } from "react";
import styles from "./LixiAuth.module.css";
import Header from "./Header/AuthHeader";
import AuthTabs from "./AuthTabs/AuthTabs";
import InputField from "./InputField/InputField";

const LixiAuth = () => {
    const [isLogin, setIsLogin] = useState(true);

    return (
        <div className={styles.page}>
            <Header />

            <main className={styles.formContainer}>
                <div className={styles.card}>
                    <AuthTabs isLogin={isLogin} onChange={setIsLogin} />

                    <div className={styles.formBody}>
                        {/* CHỈ HIỆN HỌ TÊN KHI ĐĂNG KÝ */}
                        {!isLogin && (
                            <InputField
                                label="Họ và tên"
                                icon="person"
                                placeholder="Nguyễn Văn A"
                            />
                        )}

                        <InputField
                            label="Số điện thoại"
                            prefix="+84"
                            placeholder="090 123 4567"
                            type="tel"
                        />

                        <InputField
                            label="Mật khẩu"
                            icon="lock"
                            placeholder="••••••••"
                            type="password"
                        />

                        <button className={styles.submitBtn}>
                            {isLogin ? "Đăng nhập" : "Tạo tài khoản"}
                            <span className="material-symbols-outlined">
                                arrow_forward
                            </span>
                        </button>
                    </div>

                    <footer className={styles.footer}>
                        <p className={styles.footerText}>
                            {isLogin
                                ? "Chào mừng bạn quay trở lại"
                                : "Chào mừng bạn gia nhập cộng đồng Lì Xì"}
                            <br />
                            <a href="#" className={styles.link}>
                                Điều khoản & Chính sách
                            </a>
                        </p>
                    </footer>
                </div>
            </main>
        </div>
    );
};

export default LixiAuth;
