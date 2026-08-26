"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useSession } from "@/lib/SessionContext";
import styles from "./Sidebar.module.css";

const NAV_ITEMS = [
    { href: "/", icon: "home", label: "Trang chủ" },
    { href: "/create", icon: "redeem", label: "Tạo phòng" },
    { href: "/join", icon: "qr_code_scanner", label: "Tham gia" },
    { href: "/wallet", icon: "account_balance_wallet", label: "Ví" },
    { href: "/profile", icon: "person", label: "Hồ sơ" },
];

const Sidebar = () => {
    const pathname = usePathname() ?? "";
    const router = useRouter();
    const { user, loading, logout } = useSession();

    // No account, no sidebar — desktop looks exactly like mobile until signed in.
    if (loading || !user) return null;

    return (
        <aside className={styles.sidebar}>
            <div className={styles.brand}>
                <span className={styles.brandEmoji}>🧧</span>
                <span className={styles.brandName}>Lì Xì Tết</span>
            </div>

            <nav className={styles.nav}>
                {NAV_ITEMS.map((item) => {
                    const active = item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
                    return (
                        <Link
                            key={item.href}
                            href={item.href}
                            className={`${styles.navItem} ${active ? styles.navItemActive : ""}`}
                        >
                            <span className="material-symbols-outlined">{item.icon}</span>
                            <span>{item.label}</span>
                        </Link>
                    );
                })}
            </nav>

            <div className={styles.account}>
                <div className={styles.accountInfo}>
                    <div className={styles.avatarInitial}>
                        {user.name.trim().charAt(0).toUpperCase() || "?"}
                    </div>
                    <div className={styles.accountText}>
                        <p className={styles.accountName}>{user.name}</p>
                        <p className={styles.accountPhone}>{user.phone}</p>
                    </div>
                </div>
                <button
                    className={styles.logoutBtn}
                    onClick={() => {
                        logout();
                        router.push("/auth");
                    }}
                >
                    <span className="material-symbols-outlined">logout</span>
                    Đăng xuất
                </button>
            </div>
        </aside>
    );
};

export default Sidebar;
