function gcd(a: number, b: number): number {
    return b === 0 ? a : gcd(b, a % b);
}

/** Above this many (coin × amount-unit) DP cells, decline rather than risk
 * freezing the tab — this is a manual button click, not a hot path. */
const MAX_DP_CELLS = 10_000_000;

/** How many candidate solutions to generate before scoring/ranking them.
 * Generously sized because the pool is deduplicated before ranking: walks
 * that land on an answer already found contribute nothing, and a target with
 * few valid splits burns most of the pool rediscovering the same ones. */
const POOL_SIZE = 120;
/** Random pick lands on one of this many best-scoring *distinct* candidates. */
const TOP_N = 6;
/** Higher = the random walk favors the bell-shaped ideal less strongly,
 * giving more varied (but still ideal-leaning) candidates in the pool.
 * Shape is ultimately defended by the scoring pass, so this leans toward
 * exploration: too low and every walk converges on the single best-shaped
 * answer, leaving nothing to pick between and making "Chia lại" a no-op. */
const WALK_TEMPERATURE = 40;

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

/** `dp[n][t]` = can `n` coins (drawn from `units`, repetition allowed) sum
 * to `t`. Built once, reused both to reject infeasible inputs up front and
 * to keep every step of every random walk below on a path that can still
 * finish exactly. */
function buildReachabilityTable(units: number[], count: number, totalUnits: number): boolean[][] {
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
    return dp;
}

/** One "GENERATE" pass: walks the reachability table forward one coin at a
 * time. At each step, among denominations that keep the rest solvable,
 * picks randomly with weight toward whichever is furthest behind its
 * bell-shaped ideal share — never a denomination that would make the exact
 * total/count unreachable. */
function randomWalk(
    dp: boolean[][],
    units: number[],
    count: number,
    totalUnits: number,
    ideal: number[],
    startingCounts: number[]
): number[] | null {
    const placed = [...startingCounts];
    let placedCount = 0;
    let placedUnits = 0;
    while (placedCount < count) {
        const remainingCount = count - placedCount - 1;
        const candidates: number[] = [];
        for (let i = 0; i < units.length; i++) {
            const u = units[i];
            if (placedUnits + u > totalUnits) continue;
            if (!dp[remainingCount][totalUnits - placedUnits - u]) continue;
            candidates.push(i);
        }
        if (candidates.length === 0) return null;

        const deficits = candidates.map((i) => ideal[i] - placed[i]);
        const minDeficit = Math.min(...deficits);
        const weights = deficits.map((d) => d - minDeficit + WALK_TEMPERATURE);
        const totalWeight = weights.reduce((a, b) => a + b, 0);
        let r = Math.random() * totalWeight;
        let chosen = candidates[candidates.length - 1];
        for (let j = 0; j < candidates.length; j++) {
            r -= weights[j];
            if (r <= 0) {
                chosen = candidates[j];
                break;
            }
        }

        placed[chosen] += 1;
        placedUnits += units[chosen];
        placedCount += 1;
    }
    return placed;
}

function mean(values: number[]): number {
    return values.reduce((a, b) => a + b, 0) / values.length;
}
function stddev(values: number[]): number {
    const m = mean(values);
    return Math.sqrt(mean(values.map((v) => (v - m) ** 2)));
}
function entropy(counts: number[]): number {
    const total = counts.reduce((a, b) => a + b, 0);
    return -counts.reduce((s, c) => (c > 0 ? s + (c / total) * Math.log(c / total) : s), 0);
}

/** SCORING: higher is better. Combines how closely the shape tracks the
 * bell-shaped ideal (middle weight), how evenly the money is spread across
 * denominations (balance), how evenly the coins themselves are spread
 * (diversity — meaningful even though every denomination already has
 * >=1 by construction), and an extra penalty specifically for the two
 * outermost denominations carrying too many coins. */
function scoreCandidate(counts: number[], values: number[], ideal: number[]): number {
    const k = values.length;
    const contributions = counts.map((c, i) => c * values[i]);
    const middleWeight = -counts.reduce((s, c, i) => s + (c - ideal[i]) ** 2, 0);
    const balanceScore = -stddev(contributions);
    const diversityScore = entropy(counts) * 1000;
    const outerPenalty = counts[0] + counts[k - 1];
    return middleWeight + balanceScore * 0.01 + diversityScore - outerPenalty * 50;
}

/**
 * Finds `count` values, each drawn from `denominations` (repetition
 * allowed, every denomination used **at least once**), summing exactly to
 * `total` — or null if no such combination exists. Used by the
 * denomination composer to (re)distribute its target across only the
 * notes the host already picked.
 *
 * Pipeline: every denomination is pre-assigned one coin (the "mỗi mệnh giá
 * >= 1" hard constraint — a host's explicit pick can never be silently
 * dropped from the result), reducing the problem to distributing the
 * remaining coins/amount. A pool of `POOL_SIZE` valid candidate
 * distributions is generated (`randomWalk`), each scored, and the result
 * is a random pick among the `TOP_N` best — favoring a good shape while
 * still varying from call to call.
 */
export function fillFromDenominations(
    total: number,
    count: number,
    denominations: number[]
): number[] | null {
    if (total < 0 || count < 0) return null;
    if (denominations.length === 0) return null;

    const values = [...new Set(denominations)].sort((a, b) => a - b);
    const k = values.length;
    if (count < k) return null; // not enough envelopes to give every denomination >= 1

    const g = values.reduce((a, b) => gcd(a, b));
    const baseSum = values.reduce((a, b) => a + b, 0);
    const remainingTotal = total - baseSum;
    const remainingCount = count - k;
    if (remainingTotal < 0 || remainingTotal % g !== 0) return null;

    const units = values.map((v) => v / g);
    const remainingUnits = remainingTotal / g;
    if (remainingCount * (remainingUnits + 1) > MAX_DP_CELLS) return null;

    const dp = buildReachabilityTable(units, remainingCount, remainingUnits);
    if (!dp[remainingCount][remainingUnits]) return null;

    const ideal = idealCounts(count, bellWeights(k));
    const startingCounts = new Array(k).fill(1);

    // Deduplicated: independent walks routinely land on the same split, and a
    // "top 6" made of six copies of one answer would make every re-roll return
    // that answer. Ranking distinct splits is what gives the button its
    // variety — see TOP_N.
    const seen = new Map<string, number[]>();
    for (let i = 0; i < POOL_SIZE; i++) {
        const candidate = randomWalk(dp, units, remainingCount, remainingUnits, ideal, startingCounts);
        if (candidate) seen.set(candidate.join(","), candidate);
    }
    const pool = [...seen.values()];
    if (pool.length === 0) return null;

    const ranked = pool
        .map((counts) => ({ counts, score: scoreCandidate(counts, values, ideal) }))
        .sort((a, b) => b.score - a.score);
    const top = ranked.slice(0, Math.min(TOP_N, ranked.length));
    const picked = top[Math.floor(Math.random() * top.length)];

    return values.flatMap((value, i) => Array(picked.counts[i]).fill(value));
}
