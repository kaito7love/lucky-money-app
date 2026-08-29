import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { effectivePoolStatus } from "@/lib/poolStatus";
import { getUserBySessionToken } from "@/lib/auth";

function maskPhone(phone: string | null): string | null {
  if (!phone || phone.length < 4) return phone;
  return phone.slice(0, 3) + "****" + phone.slice(-3);
}

/**
 * A pool can be managed either by proving possession of the host_token
 * issued at creation time (the fast, single-device path), or by being
 * logged in (session_token) as the account whose phone matches the pool's
 * host_phone — the recovery path for a different device.
 */
async function isAuthorizedHost(
  pool: { host_token: string; host_phone: string },
  hostToken: string | null,
  sessionToken: string | null
): Promise<boolean> {
  if (hostToken && pool.host_token === hostToken) return true;
  if (sessionToken && pool.host_phone) {
    const user = await getUserBySessionToken(sessionToken);
    if (user && user.phone === pool.host_phone) return true;
  }
  return false;
}

/** Host-only view: requires host_token or a matching-phone session to prove ownership. */
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const hostToken = req.nextUrl.searchParams.get("host_token");
  const sessionToken = req.nextUrl.searchParams.get("session_token");
  if (!hostToken && !sessionToken) {
    return NextResponse.json({ error: "MISSING_HOST_TOKEN" }, { status: 401 });
  }

  const { data: pool, error: poolError } = await supabaseAdmin
    .from("pools")
    .select("id, name, host_name, total_amount, envelope_count, mode, min_value, max_value, qr_token, status, expires_at, created_at, host_token, host_phone")
    .eq("id", id)
    .single();

  if (poolError || !pool) {
    return NextResponse.json({ error: "POOL_NOT_FOUND" }, { status: 404 });
  }
  if (!(await isAuthorizedHost(pool, hostToken, sessionToken))) {
    return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });
  }

  const { data: envelopes, error: envelopesError } = await supabaseAdmin
    .from("envelopes")
    .select("id, value, is_claimed, claimed_name, claimed_phone, claimed_at")
    .eq("pool_id", id)
    .order("claimed_at", { ascending: false, nullsFirst: false });

  if (envelopesError) {
    return NextResponse.json({ error: "ENVELOPES_FETCH_FAILED" }, { status: 500 });
  }

  const { host_token: _hostToken, host_phone: _hostPhone, ...publicPool } = pool;
  const claimed = envelopes.filter((e) => e.is_claimed);

  return NextResponse.json({
    pool: { ...publicPool, status: await effectivePoolStatus(pool) },
    remaining: envelopes.length - claimed.length,
    total_envelopes: envelopes.length,
    claims: claimed.map((e) => ({
      id: e.id,
      value: e.value,
      name: e.claimed_name,
      phone_masked: maskPhone(e.claimed_phone),
      claimed_at: e.claimed_at,
    })),
  });
}

/** Host-only: close a still-active pool early. Unclaimed envelopes become unreachable. */
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  let body: { host_token?: string; session_token?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "INVALID_JSON" }, { status: 400 });
  }

  if (!body.host_token && !body.session_token) {
    return NextResponse.json({ error: "MISSING_HOST_TOKEN" }, { status: 401 });
  }

  const { data: pool, error: poolError } = await supabaseAdmin
    .from("pools")
    .select("id, host_token, host_phone, status")
    .eq("id", id)
    .single();

  if (poolError || !pool) {
    return NextResponse.json({ error: "POOL_NOT_FOUND" }, { status: 404 });
  }
  if (!(await isAuthorizedHost(pool, body.host_token ?? null, body.session_token ?? null))) {
    return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });
  }
  if (pool.status !== "active") {
    return NextResponse.json({ error: "POOL_NOT_ACTIVE" }, { status: 409 });
  }

  const { error: updateError } = await supabaseAdmin
    .from("pools")
    .update({ status: "closed" })
    .eq("id", id)
    .eq("status", "active");

  if (updateError) {
    return NextResponse.json({ error: "CLOSE_FAILED" }, { status: 500 });
  }

  return NextResponse.json({ status: "closed" });
}
