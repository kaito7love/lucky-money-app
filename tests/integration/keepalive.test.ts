/**
 * Integration test for the daily keep-alive cron.
 *
 * Unlike the unit tests under src/lib, this one needs a running app and a
 * reachable database — it is the only way to prove the thing that actually
 * matters: that the endpoint issues real Postgres queries. A route returning
 * static JSON would pass any amount of mocking and still let Supabase pause.
 *
 *   npm run test:integration
 *
 * Point it at a deployment instead of localhost with TEST_BASE_URL, e.g.
 *   TEST_BASE_URL=https://<app>.vercel.app npm run test:integration
 * (the env file it loads must hold that deployment's Supabase credentials,
 * or the database assertions will be checking the wrong database).
 */
import test, { before, after } from "node:test";
import assert from "node:assert/strict";
import { createClient } from "@supabase/supabase-js";

const BASE_URL = process.env.TEST_BASE_URL ?? "http://localhost:3000";
const CRON_SECRET = process.env.CRON_SECRET;
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

const ENDPOINT = `${BASE_URL}/api/cron/keepalive`;
/** Marks every row this file creates, so cleanup never touches real data. */
const TEST_KEY = "keepalive-test";
const TEST_PHONE = "0000000199";

const db = createClient(SUPABASE_URL ?? "", SERVICE_ROLE_KEY ?? "", {
    auth: { persistSession: false },
});

let testUserId: string;

function call(headers: Record<string, string> = {}) {
    return fetch(ENDPOINT, { headers });
}

/**
 * Fails loudly rather than skipping. Someone running this script means to
 * test the real thing; a suite that quietly passes with nothing running is
 * the same false-success this endpoint exists to avoid.
 */
before(async () => {
    const missing = [
        !CRON_SECRET && "CRON_SECRET",
        !SUPABASE_URL && "NEXT_PUBLIC_SUPABASE_URL",
        !SERVICE_ROLE_KEY && "SUPABASE_SERVICE_ROLE_KEY",
    ].filter(Boolean);
    if (missing.length) {
        throw new Error(
            `Thiếu biến môi trường: ${missing.join(", ")}. ` +
                `Chạy qua "npm run test:integration" để nạp .env.local.`
        );
    }

    try {
        await call();
    } catch {
        throw new Error(
            `Không gọi được ${ENDPOINT}. Chạy "npm run dev" trước, ` +
                `hoặc đặt TEST_BASE_URL trỏ tới deployment.`
        );
    }

    const { error } = await db.from("pools").select("id", { head: true, count: "exact" });
    if (error) {
        throw new Error(
            `Không kết nối được database (${error.message}). ` +
                `Khởi động Supabase local, hoặc kiểm tra lại credentials.`
        );
    }

    await db.from("users").delete().eq("phone", TEST_PHONE);
    const { data, error: userError } = await db
        .from("users")
        .insert({ name: "Keepalive Test", phone: TEST_PHONE, password_hash: "unused" })
        .select("id")
        .single();
    if (userError || !data) throw new Error(`Không tạo được user test: ${userError?.message}`);
    testUserId = data.id;
});

after(async () => {
    // Sessions cascade with the user; rate-limit rows are keyed by TEST_KEY.
    await db.from("users").delete().eq("phone", TEST_PHONE);
    await db.from("rate_limit_attempts").delete().like("key", `${TEST_KEY}%`);
});

test("từ chối request không có Authorization header", async () => {
    const res = await call();
    assert.equal(res.status, 401);
});

test("từ chối secret sai", async () => {
    const res = await call({ authorization: "Bearer sai-secret-hoan-toan" });
    assert.equal(res.status, 401);
});

test("từ chối secret đúng nhưng thiếu tiền tố Bearer", async () => {
    // Vercel always sends "Bearer <secret>"; accepting a bare secret would
    // widen what counts as authorized for no reason.
    const res = await call({ authorization: CRON_SECRET! });
    assert.equal(res.status, 401);
});

test("chấp nhận secret đúng và báo ok", async () => {
    const res = await call({ authorization: `Bearer ${CRON_SECRET}` });
    assert.equal(res.status, 200);
    const body = await res.json();
    assert.equal(body.ok, true);
    assert.ok(body.ranAt, "thiếu ranAt");
    assert.ok(!Number.isNaN(Date.parse(body.ranAt)), "ranAt không phải thời điểm hợp lệ");
});

// The point of the whole endpoint: Supabase counts database activity, not
// HTTP traffic, so the ping has to reach Postgres to be worth anything.
//
// Compares against a live count, which means no other file may be creating or
// deleting pools while it runs — hence --test-concurrency=1 on the
// test:integration script. These files share one database; running them in
// parallel made this the only flaky test in the suite.
test("ping thật sự truy vấn Postgres, không trả JSON tĩnh", async () => {
    const { count } = await db.from("pools").select("id", { head: true, count: "exact" });
    const res = await call({ authorization: `Bearer ${CRON_SECRET}` });
    const body = await res.json();
    assert.equal(
        body.results.ping,
        `ok (${count ?? 0} pools)`,
        "số phòng trong response không khớp database"
    );
});

test("dọn session hết hạn nhưng giữ nguyên session còn hạn", async () => {
    await db.from("sessions").insert([
        { user_id: testUserId, expires_at: new Date(Date.now() - 86_400_000).toISOString() },
        { user_id: testUserId, expires_at: new Date(Date.now() + 86_400_000).toISOString() },
    ]);

    const before = await db
        .from("sessions")
        .select("token", { head: true, count: "exact" })
        .eq("user_id", testUserId);
    assert.equal(before.count, 2, "seed session không thành công");

    const res = await call({ authorization: `Bearer ${CRON_SECRET}` });
    const body = await res.json();
    assert.equal(body.results.expiredSessions, "swept");

    const expired = await db
        .from("sessions")
        .select("token", { head: true, count: "exact" })
        .eq("user_id", testUserId)
        .lt("expires_at", new Date().toISOString());
    assert.equal(expired.count, 0, "session hết hạn chưa bị xoá");

    // The half that matters more: a sweep that over-deletes would sign every
    // logged-in user out.
    const alive = await db
        .from("sessions")
        .select("token", { head: true, count: "exact" })
        .eq("user_id", testUserId)
        .gte("expires_at", new Date().toISOString());
    assert.equal(alive.count, 1, "session còn hạn bị xoá oan");
});

test("dọn rate-limit cũ nhưng giữ nguyên bản ghi mới", async () => {
    await db.from("rate_limit_attempts").insert([
        { key: `${TEST_KEY}-old`, occurred_at: new Date(Date.now() - 2 * 86_400_000).toISOString() },
        { key: `${TEST_KEY}-new`, occurred_at: new Date().toISOString() },
    ]);

    const res = await call({ authorization: `Bearer ${CRON_SECRET}` });
    const body = await res.json();
    assert.equal(body.results.staleRateLimits, "swept");

    const old = await db
        .from("rate_limit_attempts")
        .select("id", { head: true, count: "exact" })
        .eq("key", `${TEST_KEY}-old`);
    assert.equal(old.count, 0, "bản ghi rate-limit cũ chưa bị xoá");

    const fresh = await db
        .from("rate_limit_attempts")
        .select("id", { head: true, count: "exact" })
        .eq("key", `${TEST_KEY}-new`);
    assert.equal(fresh.count, 1, "bản ghi rate-limit mới bị xoá oan");
});

test("chạy lại nhiều lần vẫn an toàn", async () => {
    // Vercel cron delivery is best effort: a run can be skipped or fired
    // twice, so every step has to be idempotent.
    for (let i = 0; i < 3; i++) {
        const res = await call({ authorization: `Bearer ${CRON_SECRET}` });
        assert.equal(res.status, 200, `lần chạy thứ ${i + 1} không trả 200`);
        const body = await res.json();
        assert.equal(body.ok, true, `lần chạy thứ ${i + 1} báo lỗi`);
    }
});
