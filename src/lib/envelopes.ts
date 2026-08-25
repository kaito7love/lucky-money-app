/**
 * Splits `total` into `count` integer envelope values, each within
 * [min, max], summing exactly to `total`.
 *
 * Variant of the WeChat/hongbao random-split algorithm: at each step the
 * upper bound is capped so enough remains for every later envelope to still
 * reach `min`. This keeps the distribution feeling random while guaranteeing
 * no envelope ever falls outside [min, max].
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

  const values: number[] = [];
  let remaining = total;
  let remainingCount = count;

  for (let i = 0; i < count - 1; i++) {
    // Bounds on this envelope's value so the *rest* can still land within
    // [min, max] each: remaining' = remaining - value must stay in
    // [min*(remainingCount-1), max*(remainingCount-1)].
    const lowerBound = Math.max(min, remaining - max * (remainingCount - 1));
    const upperBound = Math.min(max, remaining - min * (remainingCount - 1));
    const value = Math.floor(Math.random() * (upperBound - lowerBound + 1)) + lowerBound;
    values.push(value);
    remaining -= value;
    remainingCount -= 1;
  }

  // Last envelope takes whatever is left; the loop invariant guarantees
  // min <= remaining <= max at this point.
  values.push(remaining);

  return shuffle(values);
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
