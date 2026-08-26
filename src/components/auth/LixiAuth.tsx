"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import styles from "./LixiAuth.module.css";
import Header from "./Header/AuthHeader";
import AuthTabs from "./AuthTabs/AuthTabs";
import InputField from "./InputField/InputField";
import { useSession } from "@/lib/SessionContext";

const LixiAuth = () => {
    const router = useRouter();
    const { login } = useSession();
    const [isLogin, setIsLogin] = useState(true);
    const [name, setName] = useState("");
    const [phone, setPhone] = useState("");
    const [password, setPassword] = useState("");
    const [error, setError] = useState<string | null>(null);
    const [submitting, setSubmitting] = useState(false);

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        setError(null);
        setSubmitting(true);
        try {
            const res = await fetch(isLogin ? "/api/auth/login" : "/api/auth/register", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(isLogin ? { phone, password } : { name, phone, password }),
            });
            const data = await res.json();
            if (!res.ok) {
                setError(data.message ?? "Có lỗi xảy ra, vui lòng thử lại.");
                setSubmitting(false);
                return;
            }
            login(data.session_token, data.user);
            router.push("/profile");
        } catch {
            setError("Không thể kết nối máy chủ.");
            setSubmitting(false);
        }
    }

    return (
        <div className={styles.page}>
            <Header />

            <main className={styles.formContainer}>
                <div className={styles.card}>
                    <AuthTabs isLogin={isLogin} onChange={setIsLogin} />

                    <form className={styles.formBody} onSubmit={handleSubmit}>
                        {/* CHỈ HIỆN HỌ TÊN KHI ĐĂNG KÝ */}
                        {!isLogin && (
                            <InputField
                                label="Họ và tên"
                                icon="person"
                                placeholder="Nguyễn Văn A"
                                value={name}
                                onChange={setName}
                                required
                            />
                        )}

                        <InputField
                            label="Số điện thoại"
                            prefix="+84"
                            placeholder="090 123 4567"
                            type="tel"
                            value={phone}
                            onChange={setPhone}
                            required
                        />

                        <InputField
                            label="Mật khẩu"
                            icon="lock"
                            placeholder="••••••••"
                            type="password"
                            value={password}
                            onChange={setPassword}
                            required
                        />

                        {error && <p className={styles.errorText}>{error}</p>}

                        <button className={styles.submitBtn} type="submit" disabled={submitting}>
                            {submitting ? "Đang xử lý..." : isLogin ? "Đăng nhập" : "Tạo tài khoản"}
                            <span className="material-symbols-outlined">
                                arrow_forward
                            </span>
                        </button>
                    </form>

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
