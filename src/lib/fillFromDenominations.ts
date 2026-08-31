function gcd(a: number, b: number): number {
    return b === 0 ? a : gcd(b, a % b);
}

/** Above this many (coin × amount-unit) DP cells, decline rather than risk
 * freezing the tab — this is a manual button click, not a hot path. */
const MAX_DP_CELLS = 10_000_000;

/**
 * Finds `count` values, each drawn from `denominations` (repetition
 * allowed), summing exactly to `total` — or null if no such combination
 * exists. Used to fill the *remaining* gap in the denomination composer
 * using only the notes the host already picked, rather than introducing
 * new ones.
 *
 * Exact bounded coin-change via DP (`dp[n][t]` = can `n` coins sum to
 * `t`), scaled down to the denominations' GCD to keep the table small.
 * Backtracking picks randomly among valid options at each step so the
 * result varies between calls instead of always favoring one denomination.
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

    const units = [...new Set(denominations.map((d) => d / g))].sort((a, b) => a - b);
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

    const result: number[] = [];
    let n = count;
    let t = totalUnits;
    while (n > 0) {
        const options = units.filter((u) => t - u >= 0 && dp[n - 1][t - u]);
        const u = options[Math.floor(Math.random() * options.length)];
        result.push(u * g);
        n -= 1;
        t -= u;
    }
    return result;
}
