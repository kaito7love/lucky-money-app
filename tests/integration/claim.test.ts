/**
 * Integration test for POST /api/claim — the route wrapped around
 * claim_envelope().
 *
 * The function itself is covered in claimEnvelope.test.ts. What lives only
 * here is everything the route adds: the PIN gate on a private pool, the rate
 * limits that keep a six-digit PIN from being guessed by anyone holding the QR
 * link, and the mapping from the function's raised codes to HTTP statuses.
 *
 *   npm run test:integration
 *
 * Caller identity comes from x-forwarded-for, so each test can act as its own
 * visitor and the per-caller budgets stay isolated.
 */
import test, { before, after } from "node:test";
import assert from "node:assert/strict";
import { createClient } from "@supabase/supabase-js";

const BASE_URL = process.env.TEST_BASE_URL ?? "http://localhost:3000";
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

const CLAIM_URL = `${BASE_URL}/api/claim`;
const POOLS_URL = `${BASE_URL}/api/pools`;

/** Marks every row this file creates, so cleanup never touches real data. */
const HOST_PHONE = "0000000699";
const GUEST_PREFIX = "09970000";
/** Matches CLAIM_PIN_PER_CALLER_POOL.limit in src/lib/rateLimit.ts. */
const PIN_ATTEMPTS_PER_CALLER = 5;

const db = createClient(SUPABASE_URL ?? "", SERVICE_ROLE_KEY ?? "", {
    auth: { persistSession: false },
});

const createdPools: string[] = [];

interface Pool {
    id: string;
    qrToken: string;
}

async function makePool(options: { pin?: string; values?: number[] } = {}): Promise<Pool> {
    const values = options.values ?? [50_000, 50_000];
    const res = await fetch(POOLS_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            name: "Claim route test",
            host_phone: HOST_PHONE,
            host_name: "Claim Test Host",
            total_amount: values.reduce((a, b) => a + b, 0),
            envelope_count: values.length,
            mode: "fixed",
            fixed_values: values,
            is_private: Boolean(options.pin),
            pin: options.pin,
        }),
    });
    const body = await res.json();
    assert.equal(res.status, 200, `không tạo được phòng test: ${body.error}`);
    createdPools.push(body.id);
    return { id: body.id, qrToken: body.qr_token };
}

interface ClaimResponse {
    status: number;
    body: {
        value?: number;
        remaining?: number;
        name?: string;
        error?: string;
        /** Câu tiếng Việt route gửi kèm mã lỗi để màn nhận lộc hiển thị. */
        message?: string;
    };
}

async function claim(
    qrToken: string,
    phone: string,
    options: { pin?: string; name?: string; caller?: string } = {}
): Promise<ClaimResponse> {
    const headers: Record<string, string> = { "Content-Type": "application/json" };
    // Drives callerKey() in src/lib/rateLimit.ts, so each test gets its own budget.
    if (options.caller) headers["x-forwarded-for"] = options.caller;

    const res = await fetch(CLAIM_URL, {
        method: "POST",
        headers,
        body: JSON.stringify({
            qr_token: qrToken,
            phone,
            name: options.name ?? "Người nhận",
            pin: options.pin,
        }),
    });
    return { status: res.status, body: await res.json() };
}

async function unclaimedCount(poolId: string): Promise<number> {
    const { count } = await db
        .from("envelopes")
        .select("id", { head: true, count: "exact" })
        .eq("pool_id", poolId)
        .eq("is_claimed", false);
    return count ?? 0;
}

before(async () => {
    if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
        throw new Error(
            "Thiếu NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY. " +
                'Chạy qua "npm run test:integration" để nạp .env.local.'
        );
    }
    try {
        await fetch(CLAIM_URL, { method: "POST", body: "{}" });
    } catch {
        throw new Error(
            `Không gọi được ${CLAIM_URL}. Chạy "npm run dev" trước, ` +
                "hoặc đặt TEST_BASE_URL trỏ tới deployment."
        );
    }
});

after(async () => {
    for (const poolId of createdPools) {
        await db.from("rate_limit_attempts").delete().like("key", `%${poolId}%`);
        await db.from("wallet_transactions").delete().eq("pool_id", poolId);
        await db.from("envelopes").delete().eq("pool_id", poolId);
        await db.from("pools").delete().eq("id", poolId);
    }
    await db.from("users").delete().eq("phone", HOST_PHONE);
    await db.from("users").delete().like("phone", `${GUEST_PREFIX}%`);
});

// ---------------------------------------------------------------------------
// Nhận bình thường
// ---------------------------------------------------------------------------

test("phòng công khai: nhận được và trả về đúng giá trị", async () => {
    const pool = await makePool({ values: [70_000, 30_000] });
    const { status, body } = await claim(pool.qrToken, `${GUEST_PREFIX}01`);

    assert.equal(status, 200, `bị từ chối: ${body.error}`);
    assert.ok([70_000, 30_000].includes(body.value!), `giá trị lạ: ${body.value}`);
    assert.equal(body.remaining, 1);
    assert.equal(body.name, "Người nhận");
});

test("phòng công khai không cần PIN, gửi kèm PIN cũng không sao", async () => {
    const pool = await makePool();
    const { status } = await claim(pool.qrToken, `${GUEST_PREFIX}02`, { pin: "999999" });
    assert.equal(status, 200, "PIN thừa không được làm hỏng lượt nhận");
});

// ---------------------------------------------------------------------------
// Cổng PIN của phòng riêng tư
// ---------------------------------------------------------------------------

test("phòng riêng tư: thiếu PIN bị từ chối", async () => {
    const pool = await makePool({ pin: "482913" });
    const { status, body } = await claim(pool.qrToken, `${GUEST_PREFIX}10`, { caller: "10.0.0.10" });

    assert.equal(status, 403);
    assert.equal(body.error, "INVALID_PIN");
});

test("phòng riêng tư: PIN sai bị từ chối", async () => {
    const pool = await makePool({ pin: "482913" });
    const { status, body } = await claim(pool.qrToken, `${GUEST_PREFIX}11`, {
        pin: "000000",
        caller: "10.0.0.11",
    });

    assert.equal(status, 403);
    assert.equal(body.error, "INVALID_PIN");
});

// Đoán PIN mà vẫn lấy được bao thì cổng PIN coi như không tồn tại.
test("PIN sai không được lấy mất bao nào", async () => {
    const pool = await makePool({ pin: "482913", values: [50_000, 50_000] });
    assert.equal(await unclaimedCount(pool.id), 2);

    await claim(pool.qrToken, `${GUEST_PREFIX}12`, { pin: "111111", caller: "10.0.0.12" });
    await claim(pool.qrToken, `${GUEST_PREFIX}13`, { pin: "222222", caller: "10.0.0.13" });

    assert.equal(await unclaimedCount(pool.id), 2, "PIN sai vẫn tiêu mất bao");
});

test("phòng riêng tư: PIN đúng thì nhận được", async () => {
    const pool = await makePool({ pin: "482913" });
    const { status, body } = await claim(pool.qrToken, `${GUEST_PREFIX}14`, {
        pin: "482913",
        caller: "10.0.0.14",
    });

    assert.equal(status, 200, `PIN đúng vẫn bị từ chối: ${body.error}`);
    assert.equal(body.value, 50_000);
});

test("PIN có khoảng trắng thừa vẫn được chấp nhận", async () => {
    const pool = await makePool({ pin: "482913" });
    const { status } = await claim(pool.qrToken, `${GUEST_PREFIX}15`, {
        pin: "  482913  ",
        caller: "10.0.0.15",
    });
    assert.equal(status, 200, "người dùng copy-paste PIN kèm khoảng trắng không nên bị chặn");
});

// ---------------------------------------------------------------------------
// Giới hạn số lần thử PIN
// ---------------------------------------------------------------------------

// PIN chỉ có 4-6 chữ số: không chặn thì người cầm link QR dò hết phòng.
test("thử sai PIN quá số lần cho phép thì bị khoá", async () => {
    const pool = await makePool({ pin: "482913" });
    const caller = "10.0.0.20";

    for (let i = 0; i < PIN_ATTEMPTS_PER_CALLER; i++) {
        const { status } = await claim(pool.qrToken, `${GUEST_PREFIX}2${i}`, {
            pin: "000000",
            caller,
        });
        assert.equal(status, 403, `lần thử thứ ${i + 1} lẽ ra vẫn trong hạn mức`);
    }

    const blocked = await claim(pool.qrToken, `${GUEST_PREFIX}29`, { pin: "000000", caller });
    assert.equal(blocked.status, 429);
    assert.equal(blocked.body.error, "TOO_MANY_PIN_ATTEMPTS");
});

// Khoá theo người gọi mà khoá luôn cả phòng thì một kẻ phá đám chặn được
// toàn bộ khách của phòng đó.
test("người khác không bị khoá lây", async () => {
    const pool = await makePool({ pin: "482913" });

    for (let i = 0; i < PIN_ATTEMPTS_PER_CALLER + 1; i++) {
        await claim(pool.qrToken, `${GUEST_PREFIX}3${i}`, { pin: "000000", caller: "10.0.0.30" });
    }

    const other = await claim(pool.qrToken, `${GUEST_PREFIX}39`, {
        pin: "482913",
        caller: "10.0.0.31",
    });
    assert.equal(other.status, 200, `khách vô can bị khoá lây: ${other.body.error}`);
});

// Hạn mức tính theo từng phòng, nên đoán bừa ở phòng này không được khoá
// người ta khỏi phòng khác.
test("bị khoá ở phòng này không ảnh hưởng phòng khác", async () => {
    const guarded = await makePool({ pin: "482913" });
    const other = await makePool({ pin: "482913" });
    const caller = "10.0.0.40";

    for (let i = 0; i < PIN_ATTEMPTS_PER_CALLER + 1; i++) {
        await claim(guarded.qrToken, `${GUEST_PREFIX}4${i}`, { pin: "000000", caller });
    }

    const elsewhere = await claim(other.qrToken, `${GUEST_PREFIX}49`, { pin: "482913", caller });
    assert.equal(elsewhere.status, 200, `bị khoá lây sang phòng khác: ${elsewhere.body.error}`);
});

test("nhập đúng PIN thì xoá hết lần thử sai trước đó", async () => {
    const pool = await makePool({ pin: "482913", values: [50_000, 50_000, 50_000] });
    const caller = "10.0.0.50";

    // Thử sai vài lần, nhưng chưa chạm hạn mức.
    for (let i = 0; i < 3; i++) {
        await claim(pool.qrToken, `${GUEST_PREFIX}5${i}`, { pin: "000000", caller });
    }
    const success = await claim(pool.qrToken, `${GUEST_PREFIX}58`, { pin: "482913", caller });
    assert.equal(success.status, 200, `PIN đúng bị từ chối: ${success.body.error}`);

    // Sau khi thành công, ngân sách phải được cấp lại từ đầu.
    for (let i = 0; i < PIN_ATTEMPTS_PER_CALLER; i++) {
        const { status } = await claim(pool.qrToken, `${GUEST_PREFIX}6${i}`, {
            pin: "000000",
            caller,
        });
        assert.notEqual(status, 429, `lần thử ${i + 1} sau khi thành công đã bị khoá quá sớm`);
    }
});

// Phòng công khai không có bí mật nào để đoán, và một bao một số điện thoại
// đã tự giới hạn khách rồi.
test("phòng công khai không bị giới hạn số lần thử", async () => {
    const pool = await makePool({ values: Array(8).fill(10_000) });
    const caller = "10.0.0.60";

    for (let i = 0; i < 8; i++) {
        const { status, body } = await claim(pool.qrToken, `${GUEST_PREFIX}7${i}`, { caller });
        assert.equal(status, 200, `lượt nhận thứ ${i + 1} bị chặn oan: ${body.error}`);
    }
});

// ---------------------------------------------------------------------------
// Ánh xạ mã lỗi sang HTTP status
// ---------------------------------------------------------------------------

test("nhận lần hai bằng cùng số điện thoại trả về 409", async () => {
    const pool = await makePool();
    const phone = `${GUEST_PREFIX}80`;
    await claim(pool.qrToken, phone);

    const { status, body } = await claim(pool.qrToken, phone);
    assert.equal(status, 409);
    assert.equal(body.error, "ALREADY_CLAIMED");
    assert.ok(body.message, "thiếu câu thông báo cho người dùng");
});

test("phòng hết bao trả về 409 NO_ENVELOPES_LEFT", async () => {
    const pool = await makePool({ values: [50_000] });
    await claim(pool.qrToken, `${GUEST_PREFIX}81`);

    const { status, body } = await claim(pool.qrToken, `${GUEST_PREFIX}82`);
    assert.equal(status, 409);
    assert.equal(body.error, "NO_ENVELOPES_LEFT");
});

test("phòng host đã đóng trả về 409 POOL_CLOSED", async () => {
    const pool = await makePool();
    await db.from("pools").update({ status: "closed" }).eq("id", pool.id);

    const { status, body } = await claim(pool.qrToken, `${GUEST_PREFIX}83`);
    assert.equal(status, 409);
    assert.equal(body.error, "POOL_CLOSED");
});

test("phòng hết hạn trả về 409 POOL_EXPIRED", async () => {
    const pool = await makePool();
    await db
        .from("pools")
        .update({ expires_at: new Date(Date.now() - 60_000).toISOString() })
        .eq("id", pool.id);

    const { status, body } = await claim(pool.qrToken, `${GUEST_PREFIX}84`);
    assert.equal(status, 409);
    assert.equal(body.error, "POOL_EXPIRED");
});

// ---------------------------------------------------------------------------
// Đầu vào hỏng
// ---------------------------------------------------------------------------

test("qr_token không tồn tại trả về 404", async () => {
    const { status, body } = await claim(
        "00000000-0000-0000-0000-000000000000",
        `${GUEST_PREFIX}90`
    );
    assert.equal(status, 404);
    assert.equal(body.error, "POOL_NOT_FOUND");
});

// Một token không phải uuid không bao giờ tới được bảng: đó là link hỏng,
// không phải database hỏng, nên phải là 404 chứ không phải 500.
test("qr_token sai định dạng trả về 404, không phải 500", async () => {
    const { status, body } = await claim("khong-phai-uuid", `${GUEST_PREFIX}91`);
    assert.equal(status, 404);
    assert.equal(body.error, "POOL_NOT_FOUND");
});

test("thiếu qr_token bị từ chối", async () => {
    const res = await fetch(CLAIM_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone: `${GUEST_PREFIX}92`, name: "Người nhận" }),
    });
    assert.equal(res.status, 400);
    assert.equal((await res.json()).error, "MISSING_QR_TOKEN");
});

test("số điện thoại không hợp lệ bị từ chối", async () => {
    const pool = await makePool();
    for (const phone of ["", "abc", "123"]) {
        const { status, body } = await claim(pool.qrToken, phone);
        assert.equal(status, 400, `"${phone}" lẽ ra phải bị từ chối`);
        assert.equal(body.error, "INVALID_PHONE");
    }
});

test("số điện thoại mới mà thiếu tên bị từ chối", async () => {
    const pool = await makePool();
    const res = await fetch(CLAIM_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ qr_token: pool.qrToken, phone: `${GUEST_PREFIX}93` }),
    });
    assert.equal(res.status, 400);
    assert.equal((await res.json()).error, "MISSING_NAME");
    assert.equal(await unclaimedCount(pool.id), 2, "request hỏng vẫn tiêu mất bao");
});

test("body không phải JSON bị từ chối", async () => {
    const res = await fetch(CLAIM_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: "khong-phai-json",
    });
    assert.equal(res.status, 400);
    assert.equal((await res.json()).error, "INVALID_JSON");
});

// ---------------------------------------------------------------------------
// Hệ quả kèm theo
// ---------------------------------------------------------------------------

test("nhận xong thì ví có giao dịch tương ứng", async () => {
    const pool = await makePool({ values: [80_000, 20_000] });
    const phone = `${GUEST_PREFIX}95`;
    const { body } = await claim(pool.qrToken, phone);

    const { data } = await db
        .from("wallet_transactions")
        .select("amount, type, pool_id")
        .eq("phone_number", phone);

    assert.equal(data?.length, 1, "thiếu giao dịch ví");
    assert.equal(data![0].amount, body.value, "số tiền trong ví khác số tiền đã trả về");
    assert.equal(data![0].type, "envelope_claim");
    assert.equal(data![0].pool_id, pool.id);
});
