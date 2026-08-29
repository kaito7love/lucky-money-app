"use client";

import { usePathname, useRouter } from "next/navigation";
import styles from "./MobileNav.module.css";
import { useSession } from "@/lib/SessionContext";

const NAV_ITEMS = [
    { href: "/", icon: "home" },
    { href: "/chat", icon: "forum" },
    { href: "/wallet", icon: "account_balance_wallet" },
];

const MobileNav = () => {
    const pathname = usePathname() ?? "";
    const router = useRouter();
    const { user } = useSession();
    const profileActive = pathname.startsWith("/profile");

    return (
        <nav className={`${styles.nav} ${user ? styles.navAutoHide : ""}`}>
            <div className={styles.navInner}>
                {NAV_ITEMS.map((item) => {
                    const active = item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
                    return (
                        <button
                            key={item.href}
                            className={active ? styles.navItemActive : styles.navItem}
                            onClick={() => router.push(item.href)}
                            aria-label={item.href}
                        >
                            <span className="material-symbols-outlined">{item.icon}</span>
                        </button>
                    );
                })}
                <button
                    className={`${styles.avatarBtn} ${profileActive ? styles.avatarBtnActive : ""}`}
                    onClick={() => router.push("/profile")}
                    aria-label="/profile"
                >
                    {user ? (
                        <span className={styles.avatarInitial}>
                            {user.name.trim().charAt(0).toUpperCase() || "?"}
                        </span>
                    ) : (
                        <span className={`material-symbols-outlined ${styles.avatarGuest}`}>
                            person
                        </span>
                    )}
                </button>
            </div>
        </nav>
    );
};

export default MobileNav;
