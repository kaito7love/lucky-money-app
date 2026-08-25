import React from "react";

import styles from "./LixiHome.module.css";
import Header from "./Header/Header";
import RoomCard from "./RoomCard/RoomCard";

const LixiHome = () => {
    return (
        <div className={styles.page}>
            <Header />
            <main className={styles.main}>
                {/* Quick Actions */}
                <div className={styles.grid}>
                    <button
                        className={`${styles.actionBtn} ${styles.createBtn}`}
                    >
                        <div className={styles.iconWrapper}>
                            <span className="material-symbols-outlined">
                                add
                            </span>
                        </div>
                        <div className={styles.actionText}>
                            <h3>Tạo Phòng Mới</h3>
                            <p>Gửi lộc đầu năm</p>
                        </div>
                        <span
                            className={`material-symbols-outlined ${styles.bgIcon}`}
                        >
                            redeem
                        </span>
                    </button>
                    <button className={`${styles.actionBtn} ${styles.joinBtn}`}>
                        <div
                            className={`${styles.iconWrapper} ${styles.orangeIcon}`}
                        >
                            <span className="material-symbols-outlined">
                                qr_code_scanner
                            </span>
                        </div>
                        <div className={styles.actionText}>
                            <h3 style={{ color: "#1b0e0e" }}>Tham Gia Phòng</h3>
                            <p style={{ color: "#994d51" }}>
                                Quét QR / Nhập mã
                            </p>
                        </div>
                        <span
                            className={`material-symbols-outlined ${styles.bgIconOrange}`}
                        >
                            login
                        </span>
                    </button>
                </div>

                {/* Room List */}
                <div className={styles.section}>
                    <div className={styles.sectionHeader}>
                        <h2>Phòng Của Bạn</h2>
                        <button className={styles.sortBtn}>
                            Sắp xếp{" "}
                            <span className="material-symbols-outlined">
                                sort
                            </span>
                        </button>
                    </div>
                    <div className={styles.roomList}>
                        <RoomCard
                            name="Gia Đình Sum Vầy 2024"
                            desc="Chúc mừng năm mới cả nhà! 🧧"
                            members={8}
                            time="2m ago"
                            img="https://lh3.googleusercontent.com/aida-public/AB6AXuDbZyDJGRRZmKZyRjPtP2RGz47iOYkC8_-XGjDxKXM_xOIjoAfiX2fI175CzbGGIibGhHk5l8dvJCka5RpAPYe_aR5GTL1d2Iw929bAt6J0iv3wYgYLUki1Spiw6QIYl7m92S4tqVZHRRB8RUDuWLsUJLNCtCQLMedkjHcYlhcM6jw0CR3TMD8ms4t4byj-d0ddt2iy_vh_pPSw57gEs1oQlX03tDESGX6hlt8vdDH2GFqZ1o0YSvob15p4YTZlMw4TNZ-gf9TUk8Pu"
                            hasBadge
                        />
                        <RoomCard
                            name="Team Công Ty ABC"
                            desc="Nhận lộc đầu năm nào mọi người..."
                            members={15}
                            time="1h ago"
                            img="https://lh3.googleusercontent.com/aida-public/AB6AXuCqVK5eNE4l_BunZcxQXclxHQGDnN68r5gZI5QCRtJ2rh0zZNkeJyE8ICipdU1iqUeS9pBGWushNYs91H1FacfHsK1qRcVGcEjQOduLGdwCwuAbVISuX8WhHtmW3Ia2ntMrO5ztG-ga3Oy66huTNd9xz91ncfkuguKRQ5l6_FZLsUaHLB0qOUdRUEkmJHrptWHPgduFLPNn0vFGwlmtAOiRIW6mCbyqmY8-kadxMZ8SJ716fs8E_p8FWI2VkRHf2G_-a7U5Soqrmv-3"
                        />
                        <RoomCard
                            name="Hội Bạn Thân Cấp 3"
                            desc="Mai đi cafe không?"
                            members={6}
                            time="5h ago"
                            img="https://lh3.googleusercontent.com/aida-public/AB6AXuDStqmTOmO1A0nn4_a62CHBveUssI_rb-DywZBdoxp1K711LnusOKJ7WqYs3JqtTxtjKCNIdPrBCdS2vjBcwgDOfzLiB1kSq7-gS4XHsOUdpeVBzvJP-of4x7gXPM1fGpJoOVmit4wwpDzDu6cIMUiHDmbTyqOsCyGM3ICQm00m5wMzIXoEGapFHL25t_jMj78ki2DIOZ72ua7oa7mDJ6AcrCGPLQt8S6CkgemjBbqtmhaSlZYMq-eir-lrK6YuMto5E_Qq0ww8Z7zn"
                        />
                    </div>
                </div>
            </main>

            {/* Navigation */}
            <nav className={styles.nav}>
                <div className={styles.navInner}>
                    <button className={styles.navItemActive}>
                        <span className="material-symbols-outlined filled">
                            home
                        </span>
                        <span>Trang chủ</span>
                    </button>
                    <button className={styles.navItem}>
                        <span className="material-symbols-outlined">
                            account_balance_wallet
                        </span>
                        <span>Ví</span>
                    </button>
                    <button className={styles.navItem}>
                        <span className="material-symbols-outlined">
                            settings
                        </span>
                        <span>Cài đặt</span>
                    </button>
                </div>
            </nav>
        </div>
    );
};

export default LixiHome;
