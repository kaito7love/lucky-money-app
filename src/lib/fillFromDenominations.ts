function gcd(a: number, b: number): number {
    return b === 0 ? a : gcd(b, a % b);
}

/** Above this many (coin × amount-unit) DP cells, decline rather than risk
 * freezing the tab — this is a manual button click, not a hot path. */
const MAX_DP_CELLS = 10_000_000;

/** Triangular/pyramid shape over `k` sorted positions: low at both ends,
 * peaking in the middle (e.g. k=6 → [1,2,3,3,2,1]). */
function bellWeights(k: number): number[] {
    return Array.from({ length: k }, (_, i) => Math.min(i, k - 1 - i) + 1);
}

/** Bell-shaped target count per denomination, summing to exactly `count`
 * (largest-remainder rounding keeps the total exact). */
function idealCounts(count: number, weights: number[]): number[] {
    const totalWeight = weights.reduce((a, b) => a + b, 0);
    const raw = weights.map((w) => (count * w) / totalWeight);
    const floors = raw.map(Math.floor);
    const remaining = count - floors.reduce((a, b) => a + b, 0);
    const byFraction = raw
        .map((r, i) => [r - Math.floor(r), i] as const)
        .sort((a, b) => b[0] - a[0]);
    const result = [...floors];
    for (let i = 0; i < remaining; i++) result[byFraction[i][1]] += 1;
    return result;
}

/**
 * Finds `count` values, each drawn from `denominations` (repetition
 * allowed), summing exactly to `total` — or null if no such combination
 * exists. Used to fill the *remaining* gap in the denomination composer
 * using only the notes the host already picked, rather than introducing
 * new ones.
 *
 * Feasibility is decided by exact bounded coin-change DP (`dp[n][t]` = can
 * `n` coins sum to `t`), scaled down to the denominations' GCD to keep the
 * table small. Which feasible coin gets picked at each step is not random:
 * it walks the DP forward, at every step choosing — among denominations
 * that still leave the remainder solvable — the one furthest behind its
 * bell-shaped ideal share (`idealCounts`). That biases the result toward
 * fewer coins at the smallest/largest denominations and more in the
 * middle, without ever picking a denomination that would make the exact
 * total or count unreachable.
 */
export function fillFromDenominations(
    total: number,
    count: number,
    denominations: number[]
): number[] | null {
    if (total < 0 || count < 0) return null;
    if (count === 0) return total === 0 ? [] : null;
    if (denominations.length === 0) return null;

    const g = denominations.reduce((a, b) => gcd(a, b));
    if (total % g !== 0) return null;

    const values = [...new Set(denominations)].sort((a, b) => a - b);
    const units = values.map((v) => v / g);
    const totalUnits = total / g;
    if (count * (totalUnits + 1) > MAX_DP_CELLS) return null;

    const dp: boolean[][] = Array.from({ length: count + 1 }, () => new Array(totalUnits + 1).fill(false));
    dp[0][0] = true;
    for (let n = 1; n <= count; n++) {
        for (let t = 0; t <= totalUnits; t++) {
            for (const u of units) {
                if (t - u >= 0 && dp[n - 1][t - u]) {
                    dp[n][t] = true;
                    break;
                }
            }
        }
    }
    if (!dp[count][totalUnits]) return null;

    const ideal = idealCounts(count, bellWeights(values.length));
    const placed = new Array(values.length).fill(0);
    let placedCount = 0;
    let placedUnits = 0;
    while (placedCount < count) {
        const remainingCount = count - placedCount - 1;
        let bestIndex = -1;
        let bestDeficit = -Infinity;
        for (let i = 0; i < units.length; i++) {
            const u = units[i];
            if (placedUnits + u > totalUnits) continue;
            if (!dp[remainingCount][totalUnits - placedUnits - u]) continue;
            const deficit = ideal[i] - placed[i];
            if (deficit > bestDeficit) {
                bestDeficit = deficit;
                bestIndex = i;
            }
        }
        // dp[count][totalUnits] being true guarantees a feasible choice
        // exists at every step; bestIndex === -1 would mean that guarantee
        // was violated somewhere above.
        if (bestIndex === -1) return null;
        placed[bestIndex] += 1;
        placedUnits += units[bestIndex];
        placedCount += 1;
    }

    return values.flatMap((value, i) => Array(placed[i]).fill(value));
}
