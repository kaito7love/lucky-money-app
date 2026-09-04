/**
 * Integration test for claim_envelope(), the Postgres function that hands out
 * one envelope per guest.
 *
 * This is the riskiest code in the app and the least testable from the
 * outside: its whole job is to behave correctly when several people scan the
 * same QR in the same second. Racing it is the only way to find out — a
 * sequential test passes just as happily against a function with no locking
 * at all, and the bug it would miss pays the same envelope out twice.
 *
 *   npm run test:integration
 *
 * Talks to Postgres directly rather than through /api/claim, so a failure
 * points at the function instead of at the route wrapped around it.
 */
import test, { before, after } from "node:test";
import assert from "node:assert/strict";
import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

/** Marks every row this file creates, so cleanup never touches real data. */
const TEST_HOST_PHONE = "0000000299";
const TEST_CLAIMANT_PREFIX = "09990000";

const db = createClient(SUPABASE_URL ?? "", SERVICE_ROLE_KEY ?? "", {
    auth: { persistSession: false },
});

const createdPools: string[] = [];

interface ClaimOutcome {
    ok: boolean;
    value?: number;
    remaining?: number;
    code?: string;
}

/** Every code claim_envelope() can raise, so a failure names the branch. */
const RAISED_CODES = [
    "INVALID_NAME",
    "INVALID_PHONE",
    "POOL_NOT_FOUND",
    "ALREADY_CLAIMED",
    "NO_ENVELOPES_LEFT",
    "POOL_EXPIRED",
    "POOL_CLOSED",
];

async function claim(poolId: string, name: string, phone: string): Promise<ClaimOutcome> {
    const { data, error } = await db.rpc("claim_envelope", {
        p_pool_id: poolId,
        p_name: name,
        p_phone: phone,
    });
    if (error) {
        const code = RAISED_CODES.find((raised) => error.message.includes(raised));
        return { ok: false, code: code ?? `UNEXPECTED: ${error.message}` };
    }
    const row = Array.isArray(data) ? data[0] : data;
    return { ok: true, value: row.claimed_value, remaining: row.remaining_count };
}

/** Values are distinct on purpose: the multiset that comes back out is then
 * proof that each envelope was handed out exactly once. */
async function makePool(
    values: number[],
    options: { status?: string; expiresAt?: string } = {}
): Promise<string> {
    const { data, error } = await db
        .from("pools")
        .insert({
            name: "Claim test",
            host_name: "Test Host",
            host_phone: TEST_HOST_PHONE,
            total_amount: values.reduce((a, b) => a + b, 0),
            envelope_count: values.length,
            mode: "fixed",
            status: options.status ?? "active",
            expires_at: options.expiresAt ?? null,
        })
        .select("id")
        .single();
    if (error || !data) throw new Error(`Không tạo được pool test: ${error?.message}`);

    const { error: envError } = await db
        .from("envelopes")
        .insert(values.map((value) => ({ pool_id: data.id, value })));
    if (envError) throw new Error(`Không tạo được envelopes: ${envError.message}`);

    createdPools.push(data.id);
    return data.id;
}

async function envelopeState(poolId: string) {
    const { data } = await db
        .from("envelopes")
        .select("value, is_claimed, claimed_phone, claimed_name")
        .eq("pool_id", poolId);
    const rows = data ?? [];
    return {
        claimed: rows.filter((r) => r.is_claimed),
        unclaimed: rows.filter((r) => !r.is_claimed),
        distinctClaimants: new Set(rows.filter((r) => r.is_claimed).map((r) => r.claimed_phone)).size,
    };
}

async function poolStatus(poolId: string): Promise<string> {
    const { data } = await db.from("pools").select("status").eq("id", poolId).single();
    return data!.status;
}

before(async () => {
    if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
        throw new Error(
            "Thiếu NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY. " +
                'Chạy qua "npm run test:integration" để nạp .env.local.'
        );
    }
    const { error } = await db.from("pools").select("id", { head: true, count: "exact" });
    if (error) {
        throw new Error(
            `Không kết nối được database (${error.message}). Khởi động Supabase local trước.`
        );
    }
});

after(async () => {
    for (const poolId of createdPools) {
        await db.from("wallet_transactions").delete().eq("pool_id", poolId);
        await db.from("envelopes").delete().eq("pool_id", poolId);
        await db.from("pools").delete().eq("id", poolId);
    }
});

// ---------------------------------------------------------------------------
// Concurrency — the reason this file exists
// ---------------------------------------------------------------------------

test("12 người quét cùng lúc: không bao nào bị phát hai lần", async () => {
    const values = [10_000, 20_000, 30_000, 40_000, 50_000, 60_000, 70_000, 80_000, 90_000, 100_000, 110_000, 120_000];
    const poolId = await makePool(values);

    const outcomes = await Promise.all(
        values.map((_, i) => claim(poolId, `Người ${i}`, `${TEST_CLAIMANT_PREFIX}${String(i).padStart(2, "0")}`))
    );

    const failures = outcomes.filter((o) => !o.ok);
    assert.equal(failures.length, 0, `có lượt nhận thất bại: ${failures.map((f) => f.code).join(", ")}`);

    // The multiset coming back must be exactly the multiset that went in:
    // a value appearing twice means one envelope was paid out twice.
    const received = outcomes.map((o) => o.value!).sort((a, b) => a - b);
    assert.deepEqual(received, [...values].sort((a, b) => a - b), "giá trị nhận được không khớp");

    const state = await envelopeState(poolId);
    assert.equal(state.claimed.length, values.length, "số bao đã nhận không đúng");
    assert.equal(state.unclaimed.length, 0, "còn bao chưa ai nhận");
    assert.equal(state.distinctClaimants, values.length, "có bao bị phát trùng cho cùng một người");
});

test("tổng tiền phát ra bằng đúng tổng phòng", async () => {
    const values = [50_000, 100_000, 150_000, 200_000, 500_000];
    const poolId = await makePool(values);
    const expected = values.reduce((a, b) => a + b, 0);

    const outcomes = await Promise.all(
        values.map((_, i) => claim(poolId, `Người ${i}`, `${TEST_CLAIMANT_PREFIX}1${i}`))
    );

    const paid = outcomes.reduce((sum, o) => sum + (o.value ?? 0), 0);
    assert.equal(paid, expected, "tổng tiền phát ra lệch so với tổng phòng");
});

test("nhiều người tranh nhau hơn số bao: chỉ đúng số bao được nhận", async () => {
    const values = [10_000, 20_000, 30_000, 40_000, 50_000];
    const poolId = await makePool(values);

    const contenders = 15;
    const outcomes = await Promise.all(
        Array.from({ length: contenders }, (_, i) =>
            claim(poolId, `Người ${i}`, `${TEST_CLAIMANT_PREFIX}2${String(i).padStart(2, "0")}`)
        )
    );

    const won = outcomes.filter((o) => o.ok);
    const lost = outcomes.filter((o) => !o.ok);
    assert.equal(won.length, values.length, "số người nhận được không bằng số bao");
    assert.equal(lost.length, contenders - values.length);
    for (const loss of lost) {
        assert.equal(loss.code, "NO_ENVELOPES_LEFT", "người đến sau phải nhận đúng mã hết bao");
    }

    const state = await envelopeState(poolId);
    assert.equal(state.claimed.length, values.length);
    assert.equal(state.distinctClaimants, values.length);
});

test("remaining_count giảm dần đúng và không lặp lại", async () => {
    const values = [10_000, 20_000, 30_000, 40_000];
    const poolId = await makePool(values);

    const outcomes = await Promise.all(
        values.map((_, i) => claim(poolId, `Người ${i}`, `${TEST_CLAIMANT_PREFIX}3${i}`))
    );

    const remainings = outcomes.map((o) => o.remaining!).sort((a, b) => b - a);
    assert.deepEqual(remainings, [3, 2, 1, 0], "remaining_count bị trùng hoặc nhảy cóc");
});

test("phòng tự chuyển sang completed khi bao cuối cùng được nhận", async () => {
    const values = [10_000, 20_000];
    const poolId = await makePool(values);
    assert.equal(await poolStatus(poolId), "active");

    await claim(poolId, "A", `${TEST_CLAIMANT_PREFIX}40`);
    assert.equal(await poolStatus(poolId), "active", "chưa hết bao mà đã đóng phòng");

    await claim(poolId, "B", `${TEST_CLAIMANT_PREFIX}41`);
    assert.equal(await poolStatus(poolId), "completed");
});

// ---------------------------------------------------------------------------
// Từng nhánh từ chối
// ---------------------------------------------------------------------------

test("cùng số điện thoại nhận lần hai bị từ chối", async () => {
    const poolId = await makePool([10_000, 20_000, 30_000]);
    const phone = `${TEST_CLAIMANT_PREFIX}50`;

    const first = await claim(poolId, "Người A", phone);
    assert.ok(first.ok, "lượt nhận đầu tiên phải thành công");

    const second = await claim(poolId, "Người A", phone);
    assert.equal(second.code, "ALREADY_CLAIMED");

    const state = await envelopeState(poolId);
    assert.equal(state.claimed.length, 1, "lượt nhận thứ hai vẫn lấy mất một bao");
});

test("người đã nhận quay lại phòng đã hết bao vẫn được báo ALREADY_CLAIMED", async () => {
    // Cố ý đặt trước nhánh kiểm tra status: người đã cầm bao rồi thì sự thật
    // đáng nói là "bạn nhận rồi", chứ không phải "hết bao mất rồi".
    const poolId = await makePool([10_000]);
    const phone = `${TEST_CLAIMANT_PREFIX}51`;

    await claim(poolId, "Người A", phone);
    assert.equal(await poolStatus(poolId), "completed");

    const again = await claim(poolId, "Người A", phone);
    assert.equal(again.code, "ALREADY_CLAIMED");
});

test("người mới đến phòng đã hết bao nhận mã NO_ENVELOPES_LEFT", async () => {
    const poolId = await makePool([10_000]);
    await claim(poolId, "Người A", `${TEST_CLAIMANT_PREFIX}52`);

    const late = await claim(poolId, "Người B", `${TEST_CLAIMANT_PREFIX}53`);
    assert.equal(late.code, "NO_ENVELOPES_LEFT");
});

test("phòng hết hạn bị từ chối, nhưng trạng thái expired KHÔNG được ghi lại", async () => {
    const poolId = await makePool([10_000, 20_000], {
        expiresAt: new Date(Date.now() - 60_000).toISOString(),
    });

    const outcome = await claim(poolId, "Người A", `${TEST_CLAIMANT_PREFIX}54`);
    assert.equal(outcome.code, "POOL_EXPIRED");

    // Bẫy dễ hiểu nhầm, cố ý ghim lại ở đây: hàm có chạy
    // `update pools set status = 'expired'`, nhưng ngay sau đó nó
    // `raise exception` — Postgres cuộn ngược cả transaction nên UPDATE đó
    // mất trắng. Vì vậy mọi đường đọc phải tự tính trạng thái hiệu lực;
    // effectivePoolStatus() trong src/lib/poolStatus.ts mới là chỗ ghi
    // thật xuống database. Nếu ai đó sửa hàm để trạng thái tự lưu được,
    // test này fail và đó là lời nhắc kiểm tra lại poolStatus.ts.
    assert.equal(
        await poolStatus(poolId),
        "active",
        "UPDATE trong claim_envelope() lẽ ra phải bị rollback cùng exception"
    );
});

test("phòng còn hạn thì vẫn nhận được bình thường", async () => {
    const poolId = await makePool([10_000], {
        expiresAt: new Date(Date.now() + 3_600_000).toISOString(),
    });
    const outcome = await claim(poolId, "Người A", `${TEST_CLAIMANT_PREFIX}55`);
    assert.ok(outcome.ok, `bị từ chối oan: ${outcome.code}`);
});

test("phòng host đóng tay bị từ chối bằng POOL_CLOSED", async () => {
    const poolId = await makePool([10_000, 20_000], { status: "closed" });
    const outcome = await claim(poolId, "Người A", `${TEST_CLAIMANT_PREFIX}56`);
    assert.equal(outcome.code, "POOL_CLOSED");
});

test("phòng không tồn tại bị từ chối", async () => {
    const outcome = await claim(
        "00000000-0000-0000-0000-000000000000",
        "Người A",
        `${TEST_CLAIMANT_PREFIX}57`
    );
    assert.equal(outcome.code, "POOL_NOT_FOUND");
});

test("tên rỗng hoặc chỉ có khoảng trắng bị từ chối", async () => {
    const poolId = await makePool([10_000, 20_000]);
    assert.equal((await claim(poolId, "", `${TEST_CLAIMANT_PREFIX}58`)).code, "INVALID_NAME");
    assert.equal((await claim(poolId, "   ", `${TEST_CLAIMANT_PREFIX}59`)).code, "INVALID_NAME");

    const state = await envelopeState(poolId);
    assert.equal(state.claimed.length, 0, "request hỏng vẫn lấy mất bao");
});

test("số điện thoại rỗng hoặc chỉ có khoảng trắng bị từ chối", async () => {
    const poolId = await makePool([10_000, 20_000]);
    assert.equal((await claim(poolId, "Người A", "")).code, "INVALID_PHONE");
    assert.equal((await claim(poolId, "Người A", "   ")).code, "INVALID_PHONE");
});

// ---------------------------------------------------------------------------
// Hệ quả kèm theo mỗi lượt nhận
// ---------------------------------------------------------------------------

test("tên và số điện thoại được cắt khoảng trắng thừa khi lưu", async () => {
    const poolId = await makePool([10_000]);
    const phone = `${TEST_CLAIMANT_PREFIX}60`;
    await claim(poolId, "  Nguyễn Văn A  ", `  ${phone}  `);

    const state = await envelopeState(poolId);
    assert.equal(state.claimed[0].claimed_name, "Nguyễn Văn A");
    assert.equal(state.claimed[0].claimed_phone, phone);
});

test("mỗi lượt nhận ghi một giao dịch ví với số dư cộng dồn", async () => {
    const phone = `${TEST_CLAIMANT_PREFIX}61`;
    // Hai phòng khác nhau: ALREADY_CLAIMED chỉ chặn trong cùng một phòng.
    const first = await makePool([70_000]);
    const second = await makePool([30_000]);

    await claim(first, "Người A", phone);
    await claim(second, "Người A", phone);

    const { data } = await db
        .from("wallet_transactions")
        .select("amount, type, balance_after")
        .eq("phone_number", phone)
        .order("balance_after", { ascending: true });

    assert.equal(data?.length, 2, "thiếu giao dịch ví");
    assert.deepEqual(
        data!.map((t) => t.amount).sort((a, b) => a - b),
        [30_000, 70_000]
    );
    assert.ok(data!.every((t) => t.type === "envelope_claim"));
    // 70.000 trước, rồi 30.000 cộng dồn thành 100.000.
    assert.deepEqual(
        data!.map((t) => t.balance_after),
        [70_000, 100_000],
        "số dư không cộng dồn đúng"
    );
});

test("lượt nhận bị từ chối không để lại giao dịch ví", async () => {
    const poolId = await makePool([10_000], { status: "closed" });
    const phone = `${TEST_CLAIMANT_PREFIX}62`;
    await claim(poolId, "Người A", phone);

    const { count } = await db
        .from("wallet_transactions")
        .select("id", { head: true, count: "exact" })
        .eq("phone_number", phone);
    assert.equal(count, 0, "phòng đóng mà vẫn ghi giao dịch ví");
});
