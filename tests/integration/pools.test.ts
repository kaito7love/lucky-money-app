/**
 * Integration test for POST /api/pools — where the money is created.
 *
 * The invariant worth guarding above all others: the envelope rows written to
 * the database must add up to exactly the total the host asked for. Everything
 * downstream trusts that, and nothing recomputes it — claim_envelope() only
 * hands out rows that already exist.
 *
 *   npm run test:integration
 */
import test, { before, after } from "node:test";
import assert from "node:assert/strict";
import { createClient } from "@supabase/supabase-js";

const BASE_URL = process.env.TEST_BASE_URL ?? "http://localhost:3000";
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

const ENDPOINT = `${BASE_URL}/api/pools`;
/** Marks every row this file creates, so cleanup never touches real data. */
const HOST_PHONE = "0000000599";
const HOST_NAME = "Pool Test Host";

const db = createClient(SUPABASE_URL ?? "", SERVICE_ROLE_KEY ?? "", {
    auth: { persistSession: false },
});

interface CreateResponse {
    status: number;
    body: { id?: string; qr_token?: string; host_token?: string; error?: string };
}

async function create(payload: Record<string, unknown>): Promise<CreateResponse> {
    const res = await fetch(ENDPOINT, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
    });
    return { status: res.status, body: await res.json() };
}

/** A valid body; each test overrides only what it is about. */
function validBody(overrides: Record<string, unknown> = {}) {
    return {
        name: "Phòng test",
        host_phone: HOST_PHONE,
        host_name: HOST_NAME,
        total_amount: 500_000,
        envelope_count: 10,
        mode: "random",
        min_value: 20_000,
        max_value: 100_000,
        ...overrides,
    };
}

async function envelopesOf(poolId: string): Promise<number[]> {
    const { data } = await db.from("envelopes").select("value").eq("pool_id", poolId);
    return (data ?? []).map((e) => e.value);
}

before(async () => {
    if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
        throw new Error(
            "Thiếu NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY. " +
                'Chạy qua "npm run test:integration" để nạp .env.local.'
        );
    }
    try {
        await fetch(ENDPOINT, { method: "POST", body: "{}" });
    } catch {
        throw new Error(
            `Không gọi được ${ENDPOINT}. Chạy "npm run dev" trước, ` +
                "hoặc đặt TEST_BASE_URL trỏ tới deployment."
        );
    }
});

after(async () => {
    const { data } = await db.from("pools").select("id").eq("host_phone", HOST_PHONE);
    for (const pool of data ?? []) {
        await db.from("wallet_transactions").delete().eq("pool_id", pool.id);
        await db.from("envelopes").delete().eq("pool_id", pool.id);
        await db.from("pools").delete().eq("id", pool.id);
    }
    await db.from("users").delete().eq("phone", HOST_PHONE);
});

// ---------------------------------------------------------------------------
// Tiền phải khớp tuyệt đối
// ---------------------------------------------------------------------------

test("chế độ ngẫu nhiên: tổng các bao bằng đúng tổng đã nhập", async () => {
    const { status, body } = await create(validBody());
    assert.equal(status, 200, `tạo phòng thất bại: ${body.error}`);
    assert.ok(body.id && body.qr_token && body.host_token, "thiếu id/qr_token/host_token");

    const values = await envelopesOf(body.id!);
    assert.equal(values.length, 10, "số bao đã lưu không đúng");
    assert.equal(
        values.reduce((a, b) => a + b, 0),
        500_000,
        "tổng các bao lệch so với tổng phòng"
    );
});

test("chế độ ngẫu nhiên: mọi bao nằm trong khoảng min/max", async () => {
    const { body } = await create(validBody({ total_amount: 300_000, envelope_count: 30, min_value: 5_000, max_value: 50_000 }));
    const values = await envelopesOf(body.id!);
    assert.equal(values.length, 30);
    for (const value of values) {
        assert.ok(value >= 5_000 && value <= 50_000, `${value} nằm ngoài khoảng đã chọn`);
    }
});

test("chế độ tự nhập: lưu đúng từng giá trị host gửi lên", async () => {
    const fixed = [5_000, 10_000, 20_000, 50_000, 100_000];
    const { status, body } = await create(
        validBody({ mode: "fixed", total_amount: 185_000, envelope_count: 5, fixed_values: fixed })
    );
    assert.equal(status, 200, `tạo phòng thất bại: ${body.error}`);

    const values = (await envelopesOf(body.id!)).sort((a, b) => a - b);
    assert.deepEqual(values, [...fixed].sort((a, b) => a - b));
});

test("chế độ tự nhập: từ chối khi tổng không khớp", async () => {
    const { status, body } = await create(
        validBody({ mode: "fixed", total_amount: 200_000, envelope_count: 2, fixed_values: [10_000, 20_000] })
    );
    assert.equal(status, 400);
    assert.equal(body.error, "SUM_MISMATCH");
});

test("chế độ tự nhập: từ chối khi số giá trị không khớp số bao", async () => {
    const { status, body } = await create(
        validBody({ mode: "fixed", total_amount: 30_000, envelope_count: 5, fixed_values: [10_000, 20_000] })
    );
    assert.equal(status, 400);
    assert.equal(body.error, "COUNT_MISMATCH");
});

test("chế độ tự nhập: từ chối bao có giá trị 0 hoặc âm", async () => {
    const zero = await create(
        validBody({ mode: "fixed", total_amount: 30_000, envelope_count: 3, fixed_values: [30_000, 0, 0] })
    );
    assert.equal(zero.body.error, "INVALID_VALUE");

    const negative = await create(
        validBody({ mode: "fixed", total_amount: 30_000, envelope_count: 2, fixed_values: [40_000, -10_000] })
    );
    assert.equal(negative.body.error, "INVALID_VALUE");
});

test("không tạo phòng nào khi request bị từ chối", async () => {
    const before = await db.from("pools").select("id", { head: true, count: "exact" }).eq("host_phone", HOST_PHONE);
    await create(validBody({ total_amount: -1 }));
    await create(validBody({ mode: "khong-ton-tai" }));
    const after = await db.from("pools").select("id", { head: true, count: "exact" }).eq("host_phone", HOST_PHONE);
    assert.equal(after.count, before.count, "request hỏng vẫn để lại phòng rác");
});

// ---------------------------------------------------------------------------
// Kiểm tra đầu vào
// ---------------------------------------------------------------------------

test("thiếu tên phòng bị từ chối", async () => {
    const empty = await create(validBody({ name: "" }));
    assert.equal(empty.status, 400);
    assert.equal(empty.body.error, "MISSING_NAME");

    const blank = await create(validBody({ name: "   " }));
    assert.equal(blank.body.error, "MISSING_NAME", "tên toàn khoảng trắng phải bị từ chối");
});

test("số điện thoại host không hợp lệ bị từ chối", async () => {
    for (const phone of ["", "abc", "123"]) {
        const { status, body } = await create(validBody({ host_phone: phone }));
        assert.equal(status, 400, `"${phone}" lẽ ra phải bị từ chối`);
        assert.equal(body.error, "INVALID_HOST_PHONE");
    }
});

test("tổng số tiền không hợp lệ bị từ chối", async () => {
    for (const total of [0, -1000, 1.5, "abc"]) {
        const { status, body } = await create(validBody({ total_amount: total }));
        assert.equal(status, 400, `${total} lẽ ra phải bị từ chối`);
        assert.equal(body.error, "INVALID_TOTAL_AMOUNT");
    }
});

// Regression: pools.total_amount is a Postgres `integer`, so an amount above
// its ceiling used to reach the insert and come back as a 500 telling the
// host to try again — which could never work. Typing one zero too many is the
// ordinary way to land here.
test("tổng số tiền vượt giới hạn lưu trữ bị từ chối bằng 400, không phải 500", async () => {
    const { status, body } = await create(validBody({ total_amount: 3_000_000_000, mode: "fixed", envelope_count: 1, fixed_values: [3_000_000_000] }));
    assert.equal(status, 400, "phải là lỗi nhập liệu, không phải lỗi máy chủ");
    assert.equal(body.error, "INVALID_TOTAL_AMOUNT");
});

test("số bao không hợp lệ bị từ chối, tối đa 500 bao", async () => {
    for (const count of [0, -5, 501]) {
        const { status, body } = await create(validBody({ envelope_count: count }));
        assert.equal(status, 400, `${count} bao lẽ ra phải bị từ chối`);
        assert.equal(body.error, "INVALID_ENVELOPE_COUNT");
    }
});

test("đúng 500 bao vẫn tạo được", async () => {
    const { status, body } = await create(
        validBody({ total_amount: 5_000_000, envelope_count: 500, min_value: 5_000, max_value: 50_000 })
    );
    assert.equal(status, 200, `500 bao lẽ ra phải hợp lệ: ${body.error}`);
    const values = await envelopesOf(body.id!);
    assert.equal(values.length, 500);
    assert.equal(values.reduce((a, b) => a + b, 0), 5_000_000);
});

test("chế độ chia không hợp lệ bị từ chối", async () => {
    const { status, body } = await create(validBody({ mode: "khong-ton-tai" }));
    assert.equal(status, 400);
    assert.equal(body.error, "INVALID_MODE");
});

test("chế độ ngẫu nhiên thiếu min/max bị từ chối bằng 400", async () => {
    const { status, body } = await create({
        name: "Phòng test",
        host_phone: HOST_PHONE,
        host_name: HOST_NAME,
        total_amount: 100_000,
        envelope_count: 5,
        mode: "random",
    });
    assert.equal(status, 400);
    assert.equal(body.error, "INVALID_INPUT");
});

test("khoảng min/max không chia được bị từ chối", async () => {
    // 10 bao, mỗi bao tối thiểu 100.000đ thì không thể chỉ có 100.000đ tổng.
    const { status, body } = await create(
        validBody({ total_amount: 100_000, envelope_count: 10, min_value: 100_000, max_value: 200_000 })
    );
    assert.equal(status, 400);
    assert.equal(body.error, "INVALID_RANGE");
});

test("body không phải JSON bị từ chối", async () => {
    const res = await fetch(ENDPOINT, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: "khong-phai-json",
    });
    assert.equal(res.status, 400);
    assert.equal((await res.json()).error, "INVALID_JSON");
});

// ---------------------------------------------------------------------------
// Phòng riêng tư
// ---------------------------------------------------------------------------

test("phòng riêng tư thiếu PIN bị từ chối", async () => {
    const { status, body } = await create(validBody({ is_private: true }));
    assert.equal(status, 400);
    assert.equal(body.error, "INVALID_PIN");
});

test("PIN sai định dạng bị từ chối", async () => {
    for (const pin of ["123", "1234567", "abcd", "12 34"]) {
        const { body } = await create(validBody({ is_private: true, pin }));
        assert.equal(body.error, "INVALID_PIN", `PIN "${pin}" lẽ ra phải bị từ chối`);
    }
});

test("PIN được lưu dạng băm, không lưu nguyên văn", async () => {
    const pin = "482913";
    const { status, body } = await create(validBody({ is_private: true, pin }));
    assert.equal(status, 200, `tạo phòng thất bại: ${body.error}`);

    const { data } = await db
        .from("pools")
        .select("is_private, pin_hash")
        .eq("id", body.id!)
        .single();
    assert.equal(data!.is_private, true);
    assert.ok(data!.pin_hash, "không lưu pin_hash");
    assert.ok(!data!.pin_hash.includes(pin), "PIN bị lưu nguyên văn trong database");
});

test("phòng công khai không lưu pin_hash", async () => {
    const { body } = await create(validBody({ is_private: false, pin: "482913" }));
    const { data } = await db.from("pools").select("is_private, pin_hash").eq("id", body.id!).single();
    assert.equal(data!.is_private, false);
    assert.equal(data!.pin_hash, null, "phòng công khai không được giữ PIN");
});

// ---------------------------------------------------------------------------
// Hạn nhận
// ---------------------------------------------------------------------------

test("đặt hạn nhận thì lưu đúng mốc thời gian", async () => {
    const { status, body } = await create(validBody({ expires_in_hours: 24 }));
    assert.equal(status, 200, `tạo phòng thất bại: ${body.error}`);

    const { data } = await db.from("pools").select("expires_at").eq("id", body.id!).single();
    const expiry = new Date(data!.expires_at).getTime();
    const expected = Date.now() + 24 * 60 * 60 * 1000;
    assert.ok(Math.abs(expiry - expected) < 60_000, "mốc hết hạn lệch quá 1 phút");
});

test("không đặt hạn thì phòng không có hạn", async () => {
    const { body } = await create(validBody());
    const { data } = await db.from("pools").select("expires_at").eq("id", body.id!).single();
    assert.equal(data!.expires_at, null);
});

test("hạn nhận âm bị từ chối", async () => {
    const { status, body } = await create(validBody({ expires_in_hours: -5 }));
    assert.equal(status, 400);
    assert.equal(body.error, "INVALID_EXPIRY");
});

// Regression: a large enough number of hours overflowed Date, and the
// RangeError from toISOString() escaped as the API's error code — the client
// received {"error":"Invalid time value"}, which maps to no message at all.
test("hạn nhận quá lớn trả về mã lỗi chuẩn, không rò lỗi nội bộ", async () => {
    const { status, body } = await create(validBody({ expires_in_hours: 10_000_000_000 }));
    assert.equal(status, 400);
    assert.equal(body.error, "INVALID_EXPIRY", "rò thông báo lỗi nội bộ ra client");
});

// ---------------------------------------------------------------------------
// Chủ phòng
// ---------------------------------------------------------------------------

test("số điện thoại mới mà thiếu tên chủ phòng bị từ chối", async () => {
    const { status, body } = await create({
        name: "Phòng test",
        host_phone: "0000000598",
        total_amount: 100_000,
        envelope_count: 5,
        mode: "random",
        min_value: 10_000,
        max_value: 50_000,
    });
    assert.equal(status, 400);
    assert.equal(body.error, "MISSING_HOST_NAME");

    const { count } = await db
        .from("users")
        .select("id", { head: true, count: "exact" })
        .eq("phone", "0000000598");
    assert.equal(count, 0, "không được tạo tài khoản khi request bị từ chối");
});

test("mỗi phòng có host_token và qr_token riêng", async () => {
    const a = await create(validBody());
    const b = await create(validBody());
    assert.notEqual(a.body.host_token, b.body.host_token, "host_token bị trùng giữa hai phòng");
    assert.notEqual(a.body.qr_token, b.body.qr_token, "qr_token bị trùng giữa hai phòng");
});
