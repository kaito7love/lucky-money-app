"use client";

import { usePathname, useRouter } from "next/navigation";
import styles from "./MobileNav.module.css";

const NAV_ITEMS = [
    { href: "/", icon: "home", label: "Trang chủ" },
    { href: "/chat", icon: "forum", label: "Trò chuyện" },
    { href: "/wallet", icon: "account_balance_wallet", label: "Ví" },
    { href: "/profile", icon: "settings", label: "Cài đặt" },
];

const MobileNav = () => {
    const pathname = usePathname() ?? "";
    const router = useRouter();

    return (
        <nav className={styles.nav}>
            <div className={styles.navInner}>
                {NAV_ITEMS.map((item) => {
                    const active = item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
                    return (
                        <button
                            key={item.href}
                            className={active ? styles.navItemActive : styles.navItem}
                            onClick={() => router.push(item.href)}
                        >
                            <span className={`material-symbols-outlined${active ? " filled" : ""}`}>
                                {item.icon}
                            </span>
                            <span>{item.label}</span>
                        </button>
                    );
                })}
            </div>
        </nav>
    );
};

export default MobileNav;
