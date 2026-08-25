import styles from "./ProfileHeader.module.css";

const ProfileHeader = () => (
    <div className={styles.header}>
        <div className={styles.patternOverlay}></div>

        <div className={styles.topBar}>
            <button className={styles.backBtn}>
                <span className="material-symbols-outlined">arrow_back</span>
            </button>
            <h2 className={styles.title}>Hồ sơ của tôi</h2>
            <div className={styles.spacer}></div>
        </div>

        <div className={styles.profileInfo}>
            <div className={styles.avatarWrapper}>
                <img
                    src="https://lh3.googleusercontent.com/aida-public/AB6AXuB5UQzZ0YY77B9TxmGldTWwCjnSB7lYgQPMPJk2SRSqARo91cd48Raeh2RXQse1ZTYUY2dwoV4Uz2gz8RA2It_nGhqDfIDcIBA4fuHFQHIwuiJYpvBh_jEpb6gPrjlc6-zEKWARFry2S1NztSgsKvPQdxoZ9vRURcOdstiDeaIWyMwOKgjpF6wktvoeHfxxsEOzdhs9ooNM3KWcmbFas6VI_68oyA2QP8gCfL62yJx7mrCg3J1B0kqXyh7A_mqCTa3VKGplyVmB6CSj"
                    alt="Avatar"
                    className={styles.avatar}
                />
                <div className={styles.onlineStatus}></div>
            </div>
            <div className={styles.textInfo}>
                <p className={styles.userName}>Nguyễn Văn A</p>
                <p className={styles.userPhone}>09xx xxx 789</p>
            </div>
        </div>
    </div>
);

export default ProfileHeader;
