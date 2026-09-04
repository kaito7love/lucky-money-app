import test from "node:test";
import assert from "node:assert/strict";
import {
    VND_DENOMINATIONS,
    generateEnvelopeValues,
    validateFixedValues,
} from "./envelopes.ts";

/** Runs enough times that a bug which only shows up on some draws still
 * fails the suite, but stays fast enough to sit in a pre-commit gate. */
const RUNS = 40;

function distinct(values: number[]): number {
    return new Set(values).size;
}

test("generateEnvelopeValues splits the exact total into the exact count", () => {
    for (let i = 0; i < RUNS; i++) {
        const values = generateEnvelopeValues(500_000, 10, 20_000, 100_000);
        assert.equal(values.length, 10);
        assert.equal(
            values.reduce((a, b) => a + b, 0),
            500_000
        );
    }
});

test("generateEnvelopeValues keeps every envelope inside [min, max]", () => {
    const cases: [number, number, number, number][] = [
        [500_000, 10, 20_000, 100_000],
        [300_000, 30, 5_000, 50_000],
        [1_000_000, 10, 20_000, 200_000],
        [2_000_000, 25, 50_000, 200_000],
    ];
    for (const [total, count, min, max] of cases) {
        for (let i = 0; i < RUNS; i++) {
            for (const value of generateEnvelopeValues(total, count, min, max)) {
                assert.ok(
                    value >= min && value <= max,
                    `${value} outside [${min}, ${max}] for total=${total} count=${count}`
                );
                assert.ok(Number.isInteger(value), `${value} is not an integer`);
            }
        }
    }
});

test("generateEnvelopeValues lands on round amounts, never arbitrary ones", () => {
    // The host's complaint that started this: values like 17.342đ. Every
    // envelope should be a multiple of the smallest real note.
    const smallest = Math.min(...VND_DENOMINATIONS);
    for (let i = 0; i < RUNS; i++) {
        for (const value of generateEnvelopeValues(300_000, 30, 5_000, 50_000)) {
            assert.equal(value % smallest, 0, `${value} is not a multiple of ${smallest}`);
        }
    }
});

// Regression: all three of these once returned every envelope identical (or
// near enough to read as broken), because the coarsest "clean" step left no
// spare units to randomise with — 300.000đ over 30 bao landed on exactly 30
// units of 10.000đ, so the split was forced before any randomness ran.
test("generateEnvelopeValues does not collapse to identical envelopes", () => {
    const cases: [string, number, number, number, number][] = [
        ["300k / 30 bao / 5k-50k", 300_000, 30, 5_000, 50_000],
        ["1tr / 10 bao / 20k-200k", 1_000_000, 10, 20_000, 200_000],
        ["500k / 30 bao / 5k-100k", 500_000, 30, 5_000, 100_000],
    ];
    for (const [label, total, count, min, max] of cases) {
        let variedRuns = 0;
        for (let i = 0; i < RUNS; i++) {
            if (distinct(generateEnvelopeValues(total, count, min, max)) > 1) variedRuns++;
        }
        // Not "every run" — with enough envelopes a uniform draw is possible
        // in principle, and a test that forbids it would be flaky. A broken
        // generator scores 0 here, so the gap is unambiguous.
        assert.ok(
            variedRuns >= RUNS - 2,
            `${label}: only ${variedRuns}/${RUNS} runs produced more than one distinct value`
        );
    }
});

test("generateEnvelopeValues re-rolls differently between calls", () => {
    const signatures = new Set<string>();
    for (let i = 0; i < RUNS; i++) {
        signatures.add(generateEnvelopeValues(500_000, 10, 20_000, 100_000).sort((a, b) => a - b).join(","));
    }
    assert.ok(signatures.size > 1, "every call returned the same split");
});

test("generateEnvelopeValues handles the boundaries where the split is forced", () => {
    // total === min*count and total === max*count each admit exactly one
    // answer; the generator must return it rather than throwing.
    const atFloor = generateEnvelopeValues(300_000, 30, 10_000, 50_000);
    assert.equal(atFloor.length, 30);
    assert.ok(atFloor.every((v) => v === 10_000));

    const atCeiling = generateEnvelopeValues(300_000, 30, 5_000, 10_000);
    assert.equal(atCeiling.length, 30);
    assert.ok(atCeiling.every((v) => v === 10_000));
});

test("generateEnvelopeValues rejects impossible ranges", () => {
    // min*count > total
    assert.throws(() => generateEnvelopeValues(100_000, 30, 10_000, 50_000), /INVALID_RANGE/);
    // max*count < total
    assert.throws(() => generateEnvelopeValues(900_000, 10, 10_000, 50_000), /INVALID_RANGE/);
});

test("generateEnvelopeValues rejects malformed input", () => {
    assert.throws(() => generateEnvelopeValues(100_000, 0, 1_000, 50_000), /INVALID_INPUT/);
    assert.throws(() => generateEnvelopeValues(100_000, 10, 0, 50_000), /INVALID_INPUT/);
    assert.throws(() => generateEnvelopeValues(100_000, 10, 50_000, 1_000), /INVALID_INPUT/);
    assert.throws(() => generateEnvelopeValues(100_000.5, 10, 1_000, 50_000), /INVALID_INPUT/);
    assert.throws(() => generateEnvelopeValues(100_000, 10.5, 1_000, 50_000), /INVALID_INPUT/);
});

test("validateFixedValues accepts a split that adds up", () => {
    assert.doesNotThrow(() => validateFixedValues([10_000, 20_000, 70_000], 100_000, 3));
});

test("validateFixedValues rejects the wrong count", () => {
    assert.throws(() => validateFixedValues([50_000, 50_000], 100_000, 3), /COUNT_MISMATCH/);
});

test("validateFixedValues rejects a total that does not match", () => {
    assert.throws(() => validateFixedValues([10_000, 20_000, 60_000], 100_000, 3), /SUM_MISMATCH/);
});

test("validateFixedValues rejects non-positive or fractional envelopes", () => {
    assert.throws(() => validateFixedValues([0, 50_000, 50_000], 100_000, 3), /INVALID_VALUE/);
    assert.throws(() => validateFixedValues([-10_000, 60_000, 50_000], 100_000, 3), /INVALID_VALUE/);
    assert.throws(() => validateFixedValues([10_000.5, 39_999.5, 50_000], 100_000, 3), /INVALID_VALUE/);
});

test("VND_DENOMINATIONS holds only real notes, ascending", () => {
    assert.deepEqual(VND_DENOMINATIONS, [5_000, 10_000, 20_000, 50_000, 100_000, 200_000, 500_000]);
});
