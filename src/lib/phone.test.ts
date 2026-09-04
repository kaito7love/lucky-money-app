import test from "node:test";
import assert from "node:assert/strict";
import { isValidPhone, normalizePhone } from "./phone.ts";

test("normalizePhone strips the separators people actually type", () => {
    assert.equal(normalizePhone(" 0987 654 321 "), "0987654321");
    assert.equal(normalizePhone("0987-654-321"), "0987654321");
    assert.equal(normalizePhone("+84 987-654 321"), "+84987654321");
});

test("normalizePhone leaves an already-clean number alone", () => {
    assert.equal(normalizePhone("0987654321"), "0987654321");
});

test("isValidPhone accepts Vietnamese numbers in both local and +84 form", () => {
    assert.ok(isValidPhone("0987654321"));
    assert.ok(isValidPhone("+84987654321"));
});

test("isValidPhone enforces the 8-15 digit bounds", () => {
    assert.ok(isValidPhone("12345678"), "8 digits is the floor and should pass");
    assert.ok(isValidPhone("123456789012345"), "15 digits is the ceiling and should pass");
    assert.ok(!isValidPhone("1234567"), "7 digits is below the floor");
    assert.ok(!isValidPhone("1234567890123456"), "16 digits is above the ceiling");
});

test("isValidPhone rejects anything that is not digits", () => {
    assert.ok(!isValidPhone(""));
    assert.ok(!isValidPhone("not-a-phone"));
    assert.ok(!isValidPhone("0987 654 321"), "spaces must be normalized away first");
    assert.ok(!isValidPhone("098765432a"));
    assert.ok(!isValidPhone("+"));
});

test("normalizePhone then isValidPhone is the pairing the API routes rely on", () => {
    // The routes always normalize before validating; a number that only fails
    // because of formatting must survive that pairing.
    assert.ok(isValidPhone(normalizePhone("0987 654-321")));
});
