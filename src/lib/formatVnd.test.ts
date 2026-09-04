import test from "node:test";
import assert from "node:assert/strict";
import { formatVnd } from "./formatVnd.ts";

test("formatVnd groups thousands the Vietnamese way and appends đ", () => {
    assert.equal(formatVnd(5_000), "5.000đ");
    assert.equal(formatVnd(350_000), "350.000đ");
    assert.equal(formatVnd(1_000_000), "1.000.000đ");
});

test("formatVnd handles amounts below one thousand", () => {
    assert.equal(formatVnd(0), "0đ");
    assert.equal(formatVnd(500), "500đ");
});
