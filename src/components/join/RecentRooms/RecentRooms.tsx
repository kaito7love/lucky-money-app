import styles from "./RecentRooms.module.css";

const rooms = [
    { id: 1, name: "Gia Đình", img: "8" },
    { id: 2, name: "Lớp 12A", img: "9" },
    { id: 3, name: "Công Ty", img: "10" },
    { id: 4, name: "Hội Bạn", img: "11" },
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
                        <img
                            src={`http://googleusercontent.com/profile/picture/${room.img}`}
                            alt={room.name}
                        />
                    </div>
                    <span>{room.name}</span>
                </button>
            ))}
        </div>
    </div>
);

export default RecentRooms;
