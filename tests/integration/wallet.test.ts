/**
 * Integration test for /api/wallet/[phone].
 *
 * The balance this endpoint returns is the only number a guest ever sees for
 * "how much lì xì did I get", so it has to survive the awkward case: the same
 * person claiming from two pools in the same moment. Reading it off the newest
 * row's balance_after did not, because created_at defaults to now() — the
 * transaction's start time, not the moment of the insert — so the row that
 * committed second can carry the earlier timestamp.
 *
 *   npm run test:integration
 */
import test, { before, after } from "node:test";
import assert from "node:assert/strict";
import { createClient } from "@supabase/supabase-js";

const BASE_URL = process.env.TEST_BASE_URL ?? "http://localhost:3000";
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

const TEST_HOST_PHONE = "0000000499";
const TEST_CLAIMANT_PREFIX = "09980000";

const db = createClient(SUPABASE_URL ?? "", SERVICE_ROLE_KEY ?? "", {
    auth: { persistSession: false },
});

const createdPools: string[] = [];
const usedPhones: string[] = [];

async function makePool(value: number): Promise<string> {
    const { data, error } = await db
        .from("pools")
        .insert({
            name: "Wallet test",
            host_name: "Test Host",
            host_phone: TEST_HOST_PHONE,
            total_amount: value,
            envelope_count: 1,
            mode: "fixed",
            status: "active",
        })
        .select("id")
        .single();
    if (error || !data) throw new Error(`Không tạo được pool test: ${error?.message}`);
    await db.from("envelopes").insert({ pool_id: data.id, value });
    createdPools.push(data.id);
    return data.id;
}

function claim(poolId: string, phone: string) {
    return db.rpc("claim_envelope", { p_pool_id: poolId, p_name: "Người A", p_phone: phone });
}

async function wallet(phone: string) {
    const res = await fetch(`${BASE_URL}/api/wallet/${encodeURIComponent(phone)}`);
    assert.equal(res.status, 200, `ví trả về HTTP ${res.status}`);
    return res.json();
}

before(async () => {
    if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
        throw new Error(
            "Thiếu NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY. " +
                'Chạy qua "npm run test:integration" để nạp .env.local.'
        );
    }
    try {
        await fetch(`${BASE_URL}/api/wallet/0000000000`);
    } catch {
        throw new Error(
            `Không gọi được ${BASE_URL}. Chạy "npm run dev" trước, ` +
                "hoặc đặt TEST_BASE_URL trỏ tới deployment."
        );
    }
});

after(async () => {
    for (const poolId of createdPools) {
        await db.from("wallet_transactions").delete().eq("pool_id", poolId);
        await db.from("envelopes").delete().eq("pool_id", poolId);
        await db.from("pools").delete().eq("id", poolId);
    }
    for (const phone of usedPhones) {
        await db.from("wallet_transactions").delete().eq("phone_number", phone);
    }
});

test("số điện thoại chưa nhận gì trả về số dư 0", async () => {
    const phone = `${TEST_CLAIMANT_PREFIX}00`;
    usedPhones.push(phone);
    const body = await wallet(phone);
    assert.equal(body.balance, 0);
    assert.deepEqual(body.transactions, []);
});

test("nhận lần lượt thì số dư bằng tổng đã nhận", async () => {
    const phone = `${TEST_CLAIMANT_PREFIX}01`;
    usedPhones.push(phone);
    await claim(await makePool(50_000), phone);
    await claim(await makePool(20_000), phone);

    const body = await wallet(phone);
    assert.equal(body.balance, 70_000);
    assert.equal(body.transactions.length, 2);
});

// Regression: hai lượt nhận chồng nhau có thể ghi created_at ngược thứ tự,
// nên lấy balance_after của bản ghi "mới nhất" ra hiển thị là sai. Người dùng
// nhận đủ 100.000đ mà ví báo 30.000đ, và sai vĩnh viễn vì cột đó được lưu.
test("nhận ở hai phòng cùng lúc: ví vẫn hiện đúng tổng", async () => {
    const phone = `${TEST_CLAIMANT_PREFIX}02`;
    usedPhones.push(phone);
    const a = await makePool(70_000);
    const b = await makePool(30_000);

    await Promise.all([claim(a, phone), claim(b, phone)]);

    const body = await wallet(phone);
    assert.equal(body.transactions.length, 2, "thiếu giao dịch");
    assert.equal(body.balance, 100_000, "ví hiển thị sai tổng đã nhận");
});

test("số dư không phụ thuộc thứ tự bản ghi trả về", async () => {
    // Chốt lại tính chất khiến bug trên không thể tái diễn: số dư là tổng của
    // ledger, mà tổng thì không có thứ tự nào làm sai được.
    const phone = `${TEST_CLAIMANT_PREFIX}03`;
    usedPhones.push(phone);
    const pools = await Promise.all([makePool(10_000), makePool(20_000), makePool(50_000)]);
    await Promise.all(pools.map((p) => claim(p, phone)));

    const body = await wallet(phone);
    const summed = body.transactions.reduce(
        (sum: number, t: { amount: number }) => sum + t.amount,
        0
    );
    assert.equal(body.balance, summed);
    assert.equal(body.balance, 80_000);
});
