import styles from "./ClaimsList.module.css";
import { formatVnd } from "@/lib/formatVnd";

interface Claim {
    id: string;
    value: number;
    name: string | null;
    phone_masked: string | null;
}

interface ClaimsListProps {
    claims: Claim[];
}

const ClaimsList = ({ claims }: ClaimsListProps) => (
    <div className={styles.wrapper}>
        <h3 className={styles.title}>Danh Sách Đã Nhận</h3>
        {claims.length === 0 ? (
            <p className={styles.empty}>Chưa có ai nhận lì xì.</p>
        ) : (
            <ul className={styles.list}>
                {claims.map((c) => (
                    <li key={c.id} className={styles.item}>
                        <span>
                            <span className={styles.name}>{c.name}</span>{" "}
                            <span className={styles.phone}>{c.phone_masked}</span>
                        </span>
                        <span className={styles.value}>
                            {formatVnd(c.value)}
                        </span>
                    </li>
                ))}
            </ul>
        )}
    </div>
);

export default ClaimsList;
