/**
 * Integration test for how credentials reach the API.
 *
 * Session and host tokens used to travel as `?session_token=` / `?host_token=`.
 * Request paths are recorded verbatim in platform logs — on Vercel every
 * function invocation logs its path — so live credentials ended up sitting in
 * log storage. They move in headers now, and the cases below pin both halves:
 * the header is accepted, and the query string is not, so the old vector
 * cannot quietly come back.
 *
 *   npm run test:integration
 */
import test, { before, after } from "node:test";
import assert from "node:assert/strict";
import { createClient } from "@supabase/supabase-js";

const BASE_URL = process.env.TEST_BASE_URL ?? "http://localhost:3000";
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

/** Marks every row this file creates, so cleanup never touches real data. */
const OWNER_PHONE = "0000000791";
const STRANGER_PHONE = "0000000792";
const PASSWORD = "matkhau123";

const db = createClient(SUPABASE_URL ?? "", SERVICE_ROLE_KEY ?? "", {
    auth: { persistSession: false },
});

let ownerToken: string;
let strangerToken: string;
let poolId: string;
let poolHostToken: string;

async function register(phone: string, name: string): Promise<string> {
    await db.from("users").delete().eq("phone", phone);
    const res = await fetch(`${BASE_URL}/api/auth/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, phone, password: PASSWORD }),
    });
    const body = await res.json();
    assert.equal(res.status, 200, `không đăng ký được ${phone}: ${body.error}`);
    return body.session_token;
}

before(async () => {
    if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
        throw new Error(
            "Thiếu NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY. " +
                'Chạy qua "npm run test:integration" để nạp .env.local.'
        );
    }
    try {
        await fetch(`${BASE_URL}/api/auth/me`);
    } catch {
        throw new Error(
            `Không gọi được ${BASE_URL}. Chạy "npm run dev" trước, ` +
                "hoặc đặt TEST_BASE_URL trỏ tới deployment."
        );
    }

    ownerToken = await register(OWNER_PHONE, "Chủ phòng");
    strangerToken = await register(STRANGER_PHONE, "Người lạ");

    const res = await fetch(`${BASE_URL}/api/pools`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            name: "Phòng kiểm quyền",
            host_phone: OWNER_PHONE,
            host_name: "Chủ phòng",
            total_amount: 100_000,
            envelope_count: 2,
            mode: "fixed",
            fixed_values: [50_000, 50_000],
        }),
    });
    const pool = await res.json();
    assert.equal(res.status, 200, `không tạo được phòng: ${pool.error}`);
    poolId = pool.id;
    poolHostToken = pool.host_token;
});

after(async () => {
    if (poolId) {
        await db.from("wallet_transactions").delete().eq("pool_id", poolId);
        await db.from("envelopes").delete().eq("pool_id", poolId);
        await db.from("pools").delete().eq("id", poolId);
    }
    for (const phone of [OWNER_PHONE, STRANGER_PHONE]) {
        await db.from("users").delete().eq("phone", phone);
    }
});

// ---------------------------------------------------------------------------
// /api/auth/me
// ---------------------------------------------------------------------------

test("/api/auth/me nhận session qua header Authorization", async () => {
    const res = await fetch(`${BASE_URL}/api/auth/me`, {
        headers: { Authorization: `Bearer ${ownerToken}` },
    });
    assert.equal(res.status, 200);
    const body = await res.json();
    assert.equal(body.user.phone, OWNER_PHONE);
});

test("/api/auth/me không có header thì từ chối", async () => {
    const res = await fetch(`${BASE_URL}/api/auth/me`);
    assert.equal(res.status, 401);
});

test("/api/auth/me từ chối token không tồn tại", async () => {
    const res = await fetch(`${BASE_URL}/api/auth/me`, {
        headers: { Authorization: "Bearer 00000000-0000-0000-0000-000000000000" },
    });
    assert.equal(res.status, 401);
});

test("/api/auth/me từ chối header sai định dạng", async () => {
    // Thiếu tiền tố Bearer: chấp nhận token trần là nới lỏng vô cớ.
    const bare = await fetch(`${BASE_URL}/api/auth/me`, {
        headers: { Authorization: ownerToken },
    });
    assert.equal(bare.status, 401);

    const wrongScheme = await fetch(`${BASE_URL}/api/auth/me`, {
        headers: { Authorization: `Basic ${ownerToken}` },
    });
    assert.equal(wrongScheme.status, 401);
});

// Regression: đây chính là đường cũ làm token lọt vào log.
test("/api/auth/me KHÔNG còn nhận token qua query string", async () => {
    const res = await fetch(`${BASE_URL}/api/auth/me?session_token=${ownerToken}`);
    assert.equal(res.status, 401, "token trong URL vẫn được chấp nhận");
});

// ---------------------------------------------------------------------------
// /api/pools/mine
// ---------------------------------------------------------------------------

test("/api/pools/mine nhận session qua header và chỉ trả phòng của chính chủ", async () => {
    const res = await fetch(`${BASE_URL}/api/pools/mine`, {
        headers: { Authorization: `Bearer ${ownerToken}` },
    });
    assert.equal(res.status, 200);
    const { pools } = await res.json();
    assert.ok(
        pools.some((p: { id: string }) => p.id === poolId),
        "không thấy phòng của chính chủ"
    );

    const stranger = await fetch(`${BASE_URL}/api/pools/mine`, {
        headers: { Authorization: `Bearer ${strangerToken}` },
    });
    const strangerBody = await stranger.json();
    assert.ok(
        !strangerBody.pools.some((p: { id: string }) => p.id === poolId),
        "người lạ nhìn thấy phòng của người khác"
    );
});

test("/api/pools/mine KHÔNG còn nhận token qua query string", async () => {
    const res = await fetch(`${BASE_URL}/api/pools/mine?session_token=${ownerToken}`);
    assert.equal(res.status, 401, "token trong URL vẫn được chấp nhận");
});

// ---------------------------------------------------------------------------
// /api/pools/[id] — hai loại chứng chỉ
// ---------------------------------------------------------------------------

test("/api/pools/[id] nhận host_token qua header X-Host-Token", async () => {
    const res = await fetch(`${BASE_URL}/api/pools/${poolId}`, {
        headers: { "X-Host-Token": poolHostToken },
    });
    assert.equal(res.status, 200);
    const body = await res.json();
    assert.equal(body.pool.id, poolId);
    assert.equal(body.pool.host_token, undefined, "host_token bị lộ ra trong response");
});

test("/api/pools/[id] nhận session của đúng chủ phòng", async () => {
    const res = await fetch(`${BASE_URL}/api/pools/${poolId}`, {
        headers: { Authorization: `Bearer ${ownerToken}` },
    });
    assert.equal(res.status, 200, "chủ phòng đăng nhập trên máy khác phải xem được");
});

test("/api/pools/[id] từ chối session của người khác", async () => {
    const res = await fetch(`${BASE_URL}/api/pools/${poolId}`, {
        headers: { Authorization: `Bearer ${strangerToken}` },
    });
    assert.equal(res.status, 403, "người lạ đăng nhập hợp lệ vẫn không được quản lý phòng này");
});

test("/api/pools/[id] từ chối host_token sai", async () => {
    const res = await fetch(`${BASE_URL}/api/pools/${poolId}`, {
        headers: { "X-Host-Token": "00000000-0000-0000-0000-000000000000" },
    });
    assert.equal(res.status, 403);
});

test("/api/pools/[id] không có chứng chỉ nào thì từ chối", async () => {
    const res = await fetch(`${BASE_URL}/api/pools/${poolId}`);
    assert.equal(res.status, 401);
});

test("/api/pools/[id] KHÔNG còn nhận token qua query string", async () => {
    const bySession = await fetch(`${BASE_URL}/api/pools/${poolId}?session_token=${ownerToken}`);
    assert.equal(bySession.status, 401, "session_token trong URL vẫn được chấp nhận");

    const byHost = await fetch(`${BASE_URL}/api/pools/${poolId}?host_token=${poolHostToken}`);
    assert.equal(byHost.status, 401, "host_token trong URL vẫn được chấp nhận");
});
