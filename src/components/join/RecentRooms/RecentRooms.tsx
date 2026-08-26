import styles from "./RecentRooms.module.css";

const rooms = [
    { id: 1, name: "Gia Đình" },
    { id: 2, name: "Lớp 12A" },
    { id: 3, name: "Công Ty" },
    { id: 4, name: "Hội Bạn" },
];

const RecentRooms = () => (
    <div className={styles.container}>
        <div className={styles.header}>
            <h3>Phòng gần đây</h3>
            <button>Xem tất cả</button>
        </div>
        <div className={styles.scrollArea}>
            {rooms.map((room) => (
                <button key={room.id} className={styles.roomItem}>
                    <div className={styles.avatar}>
                        <div className={styles.avatarInitial}>
                            {room.name.trim().charAt(0).toUpperCase() || "?"}
                        </div>
                    </div>
                    <span>{room.name}</span>
                </button>
            ))}
        </div>
    </div>
);

export default RecentRooms;
