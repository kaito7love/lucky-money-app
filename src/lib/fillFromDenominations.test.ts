import test from "node:test";
import assert from "node:assert/strict";
import { fillFromDenominations } from "./fillFromDenominations.ts";

const RUNS = 60;

function signature(values: number[]): string {
    return [...values].sort((a, b) => a - b).join(",");
}

function assertWellFormed(
    values: number[] | null,
    total: number,
    count: number,
    denominations: number[]
): asserts values is number[] {
    assert.ok(values, "expected a split, got null");
    assert.equal(values.length, count, "wrong number of envelopes");
    assert.equal(
        values.reduce((a, b) => a + b, 0),
        total,
        "envelopes do not add up to the target"
    );
    for (const value of values) {
        assert.ok(
            denominations.includes(value),
            `${value} is not one of the chosen denominations`
        );
    }
}

test("fillFromDenominations hits the exact total and count", () => {
    const denominations = [5_000, 10_000, 20_000, 50_000];
    for (let i = 0; i < RUNS; i++) {
        assertWellFormed(
            fillFromDenominations(350_000, 21, denominations),
            350_000,
            21,
            denominations
        );
    }
});

// The host asked for this explicitly: a denomination they picked must never
// be silently dropped from the result.
test("fillFromDenominations uses every denomination the host picked", () => {
    const cases: [number, number, number[]][] = [
        [350_000, 21, [10_000, 15_000, 20_000]],
        [350_000, 21, [5_000, 10_000, 20_000, 50_000]],
        [1_000_000, 20, [20_000, 50_000, 100_000]],
        [2_000_000, 40, [10_000, 20_000, 50_000, 100_000, 200_000]],
    ];
    for (const [total, count, denominations] of cases) {
        for (let i = 0; i < RUNS; i++) {
            const values = fillFromDenominations(total, count, denominations);
            assertWellFormed(values, total, count, denominations);
            for (const denomination of denominations) {
                assert.ok(
                    values.includes(denomination),
                    `dropped ${denomination} from ${total}/${count} with [${denominations}]`
                );
            }
        }
    }
});

// Regression: "Chia lại" used to return the same split 52 times out of 60,
// because the candidate pool was ranked without deduplication — the "top 6"
// were six copies of one answer, so picking randomly among them could only
// ever return that answer.
test("fillFromDenominations produces a different split across re-rolls", () => {
    const signatures = new Set<string>();
    for (let i = 0; i < RUNS; i++) {
        const values = fillFromDenominations(350_000, 21, [10_000, 15_000, 20_000]);
        assert.ok(values);
        signatures.add(signature(values));
    }
    // Exactly six splits satisfy this target; the deduplicated pool reaches
    // all of them. The pre-fix code reached two, so this threshold separates
    // the two behaviours without depending on hitting all six every time.
    assert.ok(
        signatures.size >= 4,
        `only ${signatures.size} distinct splits across ${RUNS} re-rolls`
    );
});

test("fillFromDenominations returns null when there are fewer bao than denominations", () => {
    // Every denomination needs at least one envelope, so this cannot be met.
    assert.equal(fillFromDenominations(100_000, 2, [5_000, 10_000, 20_000]), null);
});

test("fillFromDenominations returns null when the target is unreachable", () => {
    // 10 bao averaging 50.000đ: using the required 100.000đ note at least
    // once forces some other envelope below the 50.000đ floor.
    assert.equal(fillFromDenominations(500_000, 10, [50_000, 100_000]), null);
    // Not divisible by the gcd of the chosen notes.
    assert.equal(fillFromDenominations(105_000, 5, [10_000, 20_000]), null);
});

test("fillFromDenominations rejects degenerate input", () => {
    assert.equal(fillFromDenominations(100_000, 5, []), null);
    assert.equal(fillFromDenominations(-100_000, 5, [10_000]), null);
    assert.equal(fillFromDenominations(100_000, -5, [10_000]), null);
});

test("fillFromDenominations tolerates duplicate denominations", () => {
    const values = fillFromDenominations(100_000, 5, [20_000, 20_000, 20_000]);
    assertWellFormed(values, 100_000, 5, [20_000]);
});

test("fillFromDenominations handles a single denomination that divides evenly", () => {
    const values = fillFromDenominations(100_000, 5, [20_000]);
    assertWellFormed(values, 100_000, 5, [20_000]);
    assert.ok(values.every((v) => v === 20_000));
});

test("fillFromDenominations stays fast enough for a button click", () => {
    const started = Date.now();
    const values = fillFromDenominations(
        20_000_000,
        100,
        [5_000, 10_000, 20_000, 50_000, 100_000, 200_000, 500_000]
    );
    assert.ok(values);
    assert.ok(Date.now() - started < 2_000, "took longer than 2s");
});
