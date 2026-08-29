"use client";

import { useRouter } from "next/navigation";

import styles from "./LixiHome.module.css";
import Header from "./Header/HomeHeader";
import RoomCard from "./RoomCard/RoomCard";
import { useMyRooms } from "@/lib/useMyRooms";
import { useSession } from "@/lib/SessionContext";
import { formatRelativeTime } from "@/lib/formatRelativeTime";
import { POOL_STATUS_LABEL } from "@/lib/poolStatusLabel";

const LixiHome = () => {
    const router = useRouter();
    const { rooms, loading } = useMyRooms();
    const { user } = useSession();

    return (
        <div className={styles.page}>
            <Header />
            <main className={styles.main}>
                {/* Quick Actions */}
                <div className={styles.grid}>
                    <button
                        className={`${styles.actionBtn} ${styles.createBtn}`}
                        onClick={() => router.push("/create")}
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
                    <button
                        className={`${styles.actionBtn} ${styles.joinBtn}`}
                        onClick={() => router.push("/join")}
                    >

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
                    </div>
                    <div className={styles.roomList}>
                        {loading ? (
                            <p className={styles.roomListMessage}>Đang tải...</p>
                        ) : rooms.length === 0 ? (
                            <p className={styles.roomListMessage}>
                                {user
                                    ? "Bạn chưa tạo phòng lì xì nào."
                                    : "Bạn chưa tạo phòng lì xì nào trên thiết bị này. Đăng nhập để xem phòng đã tạo trên thiết bị khác."}
                            </p>
                        ) : (
                            rooms.map((room) => (
                                <RoomCard
                                    key={room.id}
                                    name={room.name}
                                    desc={`Host: ${room.hostName}`}
                                    countLabel={`${room.claimedCount}/${room.totalEnvelopes} đã nhận`}
                                    timeLabel={`${POOL_STATUS_LABEL[room.status] ?? room.status} · ${formatRelativeTime(room.createdAt)}`}
                                    hasBadge={room.status === "active"}
                                    onClick={() => router.push(`/pool/${room.id}`)}
                                />
                            ))
                        )}
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
                    <button
                        className={styles.navItem}
                        onClick={() => router.push("/chat")}
                    >
                        <span className="material-symbols-outlined">
                            forum
                        </span>
                        <span>Trò chuyện</span>
                    </button>
                    <button
                        className={styles.navItem}
                        onClick={() => router.push("/wallet")}
                    >
                        <span className="material-symbols-outlined">
                            account_balance_wallet
                        </span>
                        <span>Ví</span>
                    </button>
                    <button
                        className={styles.navItem}
                        onClick={() => router.push("/profile")}
                    >
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
