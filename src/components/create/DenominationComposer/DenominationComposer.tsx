import { useState, type Dispatch, type SetStateAction } from "react";
import { generateEnvelopeValues, VND_DENOMINATIONS } from "@/lib/envelopes";
import { fillFromDenominations } from "@/lib/fillFromDenominations";
import { formatVnd } from "@/lib/formatVnd";
import styles from "./DenominationComposer.module.css";

export interface DenominationRow {
    value: number;
    count: number;
}

interface DenominationComposerProps {
    targetTotal: number;
    targetCount: number;
    rows: DenominationRow[];
    onRowsChange: Dispatch<SetStateAction<DenominationRow[]>>;
}

function setCount(rows: DenominationRow[], value: number, count: number): DenominationRow[] {
    if (count <= 0) {
        return rows.filter((r) => r.value !== value);
    }
    if (rows.some((r) => r.value === value)) {
        return rows.map((r) => (r.value === value ? { ...r, count } : r));
    }
    return [...rows, { value, count }].sort((a, b) => a.value - b.value);
}

const DenominationComposer = ({
    targetTotal,
    targetCount,
    rows,
    onRowsChange,
}: DenominationComposerProps) => {
    const [autoFillError, setAutoFillError] = useState<string | null>(null);

    const selectedTotal = rows.reduce((sum, r) => sum + r.value * r.count, 0);
    const selectedCount = rows.reduce((sum, r) => sum + r.count, 0);
    const hasTarget = targetTotal > 0 && targetCount > 0;
    const isComplete = hasTarget && selectedTotal === targetTotal && selectedCount === targetCount;

    const totalDiff = targetTotal - selectedTotal;
    const countDiff = targetCount - selectedCount;
    const diffParts: string[] = [];
    if (totalDiff !== 0) {
        diffParts.push(`${totalDiff > 0 ? "Còn thiếu" : "Dư"} ${formatVnd(Math.abs(totalDiff))}`);
    }
    if (countDiff !== 0) {
        diffParts.push(`${countDiff > 0 ? "thiếu" : "dư"} ${Math.abs(countDiff)} bao`);
    }

    function mutateRows(updater: (prev: DenominationRow[]) => DenominationRow[]) {
        setAutoFillError(null);
        onRowsChange(updater);
    }

    /** With rows already picked: recompute the whole target from scratch
     * using only those same denominations (handles both "còn thiếu" and
     * "dư" alike, and gives a different-looking split each click since
     * fillFromDenominations weighs its choice randomly). With none picked
     * yet: generate a full random-but-clean split to start from. */
    function handleAutoFill() {
        setAutoFillError(null);
        if (!hasTarget) return;

        if (rows.length > 0) {
            const filled = fillFromDenominations(
                targetTotal,
                targetCount,
                rows.map((r) => r.value)
            );
            if (!filled) {
                setAutoFillError(
                    rows.length > targetCount
                        ? "Số bao ít hơn số mệnh giá đã chọn — bớt mệnh giá hoặc tăng số bao."
                        : "Không thể chia đúng mục tiêu chỉ với các mệnh giá đã chọn — thử thêm mệnh giá khác."
                );
                return;
            }
            const grouped = new Map<number, number>();
            for (const v of filled) grouped.set(v, (grouped.get(v) ?? 0) + 1);
            onRowsChange(
                [...grouped.entries()]
                    .map(([value, count]) => ({ value, count }))
                    .sort((a, b) => a.value - b.value)
            );
            return;
        }

        if (targetCount > targetTotal) return;
        const avg = Math.floor(targetTotal / targetCount);
        const min = Math.max(1000, Math.floor(avg / 2));
        const max = Math.max(avg + 1000, Math.ceil(avg * 1.5));
        try {
            const values = generateEnvelopeValues(targetTotal, targetCount, min, max);
            const grouped = new Map<number, number>();
            for (const v of values) grouped.set(v, (grouped.get(v) ?? 0) + 1);
            onRowsChange(
                [...grouped.entries()]
                    .map(([value, count]) => ({ value, count }))
                    .sort((a, b) => a.value - b.value)
            );
        } catch {
            // Target total/count don't admit any split — leave rows untouched.
        }
    }

    return (
        <div className={styles.group}>
            <div className={styles.chips}>
                {VND_DENOMINATIONS.map((value) => (
                    <button
                        key={value}
                        type="button"
                        className={styles.chip}
                        onClick={() =>
                            mutateRows((prev) =>
                                setCount(prev, value, (prev.find((r) => r.value === value)?.count ?? 0) + 1)
                            )
                        }
                    >
                        + {formatVnd(value)}
                    </button>
                ))}
            </div>

            {rows.length > 0 && (
                <div className={styles.rows}>
                    {rows.map((row) => (
                        <div key={row.value} className={styles.row}>
                            <span className={styles.rowValue}>{formatVnd(row.value)}</span>
                            <div className={styles.stepper}>
                                <button
                                    type="button"
                                    className={styles.stepBtn}
                                    onClick={() => mutateRows((prev) => setCount(prev, row.value, row.count - 1))}
                                    aria-label="Giảm"
                                >
                                    −
                                </button>
                                <input
                                    type="text"
                                    inputMode="numeric"
                                    className={styles.countInput}
                                    value={row.count}
                                    onChange={(e) => {
                                        const count = Number(e.target.value.replace(/\D/g, "")) || 0;
                                        mutateRows((prev) => setCount(prev, row.value, count));
                                    }}
                                />
                                <button
                                    type="button"
                                    className={styles.stepBtn}
                                    onClick={() => mutateRows((prev) => setCount(prev, row.value, row.count + 1))}
                                    aria-label="Tăng"
                                >
                                    +
                                </button>
                            </div>
                            <button
                                type="button"
                                className={styles.removeBtn}
                                onClick={() => mutateRows((prev) => prev.filter((r) => r.value !== row.value))}
                                aria-label="Xoá"
                            >
                                <span className="material-symbols-outlined">close</span>
                            </button>
                        </div>
                    ))}
                </div>
            )}

            <button
                type="button"
                className={styles.autoFillBtn}
                onClick={handleAutoFill}
                disabled={!hasTarget || (rows.length === 0 && targetCount > targetTotal)}
            >
                <span className="material-symbols-outlined">auto_awesome</span>
                {rows.length > 0 ? "Chia lại" : "Tự động điền"}
            </button>
            {autoFillError && <p className={styles.autoFillError}>{autoFillError}</p>}

            <div className={`${styles.summary} ${isComplete ? styles.summaryDone : ""}`}>
                <span className="material-symbols-outlined">
                    {isComplete ? "check_circle" : "info"}
                </span>
                <div>
                    <p className={styles.summaryMain}>
                        {formatVnd(selectedTotal)} · {selectedCount} bao
                    </p>
                    {!hasTarget ? (
                        <p className={styles.summarySub}>Nhập Tổng số tiền và Số bao lì xì ở trên trước.</p>
                    ) : isComplete ? (
                        <p className={styles.summarySub}>Đủ rồi, sẵn sàng tạo phòng.</p>
                    ) : (
                        <p className={styles.summarySub}>{diffParts.join(" · ")}</p>
                    )}
                </div>
            </div>
        </div>
    );
};

export default DenominationComposer;
