import styles from "./ProfileHeader.module.css";
import { useBackOrHome } from "@/lib/useBackOrHome";

interface ProfileHeaderProps {
    name: string;
    phone: string;
}

const ProfileHeader = ({ name, phone }: ProfileHeaderProps) => {
    const goBack = useBackOrHome();

    return (
        <div className={styles.header}>
            <div className={styles.patternOverlay}></div>

            <div className={styles.topBar}>
                <button className={styles.backBtn} onClick={goBack}>
                    <span className="material-symbols-outlined">arrow_back</span>
                </button>
                <h2 className={styles.title}>Hồ sơ của tôi</h2>
                <div className={styles.spacer}></div>
            </div>

            <div className={styles.profileInfo}>
                <div className={styles.avatarWrapper}>
                    <div className={styles.avatarInitial}>
                        {name.trim().charAt(0).toUpperCase() || "?"}
                    </div>
                    <div className={styles.onlineStatus}></div>
                </div>
                <div className={styles.textInfo}>
                    <p className={styles.userName}>{name}</p>
                    <p className={styles.userPhone}>{phone}</p>
                </div>
            </div>
        </div>
    );
};

export default ProfileHeader;
