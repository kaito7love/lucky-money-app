/** Real VND note denominations. Single source of truth shared with the
 * create-room UI's denomination picker. */
export const VND_DENOMINATIONS = [5000, 10000, 20000, 50000, 100000, 200000, 500000];

/** Largest first — tried in order so envelope values land on round amounts
 * instead of arbitrary integers. */
const CLEAN_STEPS = [...VND_DENOMINATIONS].reverse();

interface StepPlan {
  step: number;
  minUnits: number;
  maxUnits: number;
  totalUnits: number;
}

/**
 * Picks the "unit" (a VND denomination, or 1đ as the ultimate fallback) to
 * generate envelope values in. Prefers the coarsest clean denomination that
 * still leaves `slack` — spare units beyond every envelope's floor — of at
 * least one per envelope on average, since a coarse step with *no* slack
 * (e.g. 300,000đ over 30 bao landing on exactly 30 units of 10,000đ) forces
 * every envelope to be mathematically identical, which isn't "random" no
 * matter how the units then get distributed. Falls through progressively
 * finer steps, and finally to raw 1đ granularity, which — given the caller
 * already checked min*count <= total <= max*count — is always feasible.
 */
function pickStepPlan(total: number, count: number, min: number, max: number): StepPlan {
  let fallback: StepPlan | null = null;
  for (const step of CLEAN_STEPS) {
    if (total % step !== 0) continue;
    const minUnits = Math.ceil(min / step);
    const maxUnits = Math.floor(max / step);
    const totalUnits = total / step;
    if (minUnits > maxUnits) continue;
    if (minUnits * count > totalUnits || maxUnits * count < totalUnits) continue;

    const plan = { step, minUnits, maxUnits, totalUnits };
    if (!fallback) fallback = plan;
    if (totalUnits - minUnits * count >= count) return plan;
  }
  return fallback ?? { step: 1, minUnits: min, maxUnits: max, totalUnits: total };
}

/**
 * Distributes `total` units across `count` envelopes, each within
 * [min, max]. Every envelope starts at the floor (`min`), then the
 * remaining surplus is handed out one unit at a time to a uniformly random
 * envelope that still has headroom — unlike processing envelopes in a
 * fixed sequence with a shrinking budget (the classic WeChat-hongbao
 * algorithm), no single unlucky early pick can force every later envelope
 * toward the floor, since each unit's destination is independent of the
 * ones before it.
 */
function distributeUnits(total: number, count: number, min: number, max: number): number[] {
  const values = new Array(count).fill(min);
  let surplus = total - min * count;
  const headroom = new Array(count).fill(max - min);
  const eligible: number[] = [];
  for (let i = 0; i < count; i++) if (headroom[i] > 0) eligible.push(i);

  while (surplus > 0 && eligible.length > 0) {
    const pick = Math.floor(Math.random() * eligible.length);
    const envelope = eligible[pick];
    values[envelope] += 1;
    headroom[envelope] -= 1;
    surplus -= 1;
    if (headroom[envelope] === 0) eligible.splice(pick, 1);
  }
  return values;
}

/** Higher favors a result with more distinct values and a wider spread —
 * used to steer away from an outcome that happens to look monotonous
 * (most likely with a small envelope count, where an unlucky draw can
 * land on a suspiciously even-looking split by pure chance). */
function diversityScore(values: number[]): number {
  const distinct = new Set(values).size;
  const avg = values.reduce((a, b) => a + b, 0) / values.length;
  const spread = Math.sqrt(values.reduce((s, v) => s + (v - avg) ** 2, 0) / values.length);
  return distinct * 1000 + spread;
}

const POOL_SIZE = 25;
const TOP_N = 8;

/**
 * Splits `total` into `count` integer envelope values, each within
 * [min, max], summing exactly to `total`. Values land on real VND
 * denominations where possible. A pool of candidate distributions is
 * generated and the result is a random pick among the most varied-looking
 * ones, rather than the single first split found — see `pickStepPlan` and
 * `distributeUnits` for why both of those matter for actually looking
 * random instead of clustering or landing on identical values.
 */
export function generateEnvelopeValues(
  total: number,
  count: number,
  min: number,
  max: number
): number[] {
  if (!Number.isInteger(total) || !Number.isInteger(count) || !Number.isInteger(min) || !Number.isInteger(max)) {
    throw new Error("INVALID_INPUT");
  }
  if (count <= 0 || min <= 0 || max <= 0 || min > max) {
    throw new Error("INVALID_INPUT");
  }
  if (min * count > total || max * count < total) {
    throw new Error("INVALID_RANGE");
  }

  const { step, minUnits, maxUnits, totalUnits } = pickStepPlan(total, count, min, max);

  const pool: number[][] = [];
  for (let i = 0; i < POOL_SIZE; i++) {
    pool.push(distributeUnits(totalUnits, count, minUnits, maxUnits).map((v) => v * step));
  }

  const ranked = pool
    .map((values) => ({ values, score: diversityScore(values) }))
    .sort((a, b) => b.score - a.score);
  const top = ranked.slice(0, Math.min(TOP_N, ranked.length));
  const chosen = top[Math.floor(Math.random() * top.length)];

  return shuffle(chosen.values);
}

/** Fixed-mode: caller supplies exact values; just validate they add up. */
export function validateFixedValues(values: number[], expectedTotal: number, expectedCount: number): void {
  if (values.length !== expectedCount) {
    throw new Error("COUNT_MISMATCH");
  }
  if (values.some((v) => !Number.isInteger(v) || v <= 0)) {
    throw new Error("INVALID_VALUE");
  }
  const sum = values.reduce((a, b) => a + b, 0);
  if (sum !== expectedTotal) {
    throw new Error("SUM_MISMATCH");
  }
}

function shuffle<T>(arr: T[]): T[] {
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}
