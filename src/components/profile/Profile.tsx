"use client";

import { useRouter } from "next/navigation";
import styles from "./Profile.module.css";
import ProfileHeader from "./ProfileHeader/ProfileHeader";
import MenuItem from "./MenuItem/MenuItem";
import { useSession } from "@/lib/SessionContext";
import MobileNav from "@/components/layout/MobileNav";

const Profile = () => {
    const router = useRouter();
    const { user, loading, logout } = useSession();

    if (loading) {
        return (
            <>
                <p className={styles.centerMessage}>Đang tải...</p>
                <MobileNav />
            </>
        );
    }

    if (!user) {
        return (
            <div className={styles.signedOut}>
                <button
                    className={styles.backBtn}
                    onClick={() => window.history.back()}
                    aria-label="Quay lại"
                >
                    <span className="material-symbols-outlined">arrow_back</span>
                </button>
                <span className={`material-symbols-outlined ${styles.signedOutIcon}`}>
                    account_circle
                </span>
                <p>Bạn chưa đăng nhập.</p>
                <button
                    className={styles.loginBtn}
                    onClick={() => router.push("/auth")}
                >
                    Đăng nhập / Đăng ký
                </button>
                <MobileNav />
            </div>
        );
    }

    return (
        <div className={styles.container}>
            <ProfileHeader name={user.name} phone={user.phone} />

            <main className={styles.content}>
                {/* Status Card */}
                <div className={styles.statusCard}>
                    <div className={styles.statusInfo}>
                        <span className={styles.statusLabel}>Trạng thái</span>
                        <div className={styles.verified}>
                            <span className="material-symbols-outlined">
                                verified
                            </span>
                            <span>Đã xác minh</span>
                        </div>
                    </div>
                    <div className={styles.divider}></div>
                    <div
                        className={`${styles.statusInfo} ${styles.alignRight}`}
                    >
                        <span className={styles.statusLabel}>Thành viên</span>
                        <span className={styles.rankText}>Vàng</span>
                    </div>
                </div>

                {/* Settings Group 1 */}
                <section className={styles.section}>
                    <h3 className={styles.sectionTitle}>Cài đặt tài khoản</h3>
                    <div className={styles.menuList}>
                        <MenuItem icon="qr_code_2" label="Mã QR của tôi" />
                        <MenuItem
                            icon="notifications"
                            label="Thông báo"
                            badge={3}
                        />
                        <MenuItem icon="lock" label="Riêng tư & Bảo mật" />
                        <MenuItem
                            icon="language"
                            label="Ngôn ngữ"
                            value="Tiếng Việt"
                        />
                    </div>
                </section>

                {/* Settings Group 2 */}
                <section className={styles.section}>
                    <h3 className={styles.sectionTitle}>Hỗ trợ</h3>
                    <MenuItem icon="help" label="Trung tâm trợ giúp" />
                </section>

                {/* Logout */}
                <div className={styles.logoutWrapper}>
                    <button
                        className={styles.logoutBtn}
                        onClick={async () => {
                            await logout();
                            router.push("/auth");
                        }}
                    >
                        <span className="material-symbols-outlined">
                            logout
                        </span>
                        <span>Đăng xuất</span>
                    </button>
                    <p className={styles.version}>
                        Phiên bản 2.4.0 (Build 2026)
                    </p>
                </div>
            </main>

            <MobileNav />
        </div>
    );
};

export default Profile;
