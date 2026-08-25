import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";

function maskPhone(phone: string | null): string | null {
  if (!phone || phone.length < 4) return phone;
  return phone.slice(0, 3) + "****" + phone.slice(-3);
}

/** Host-only view: requires host_token to prove ownership of the pool. */
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const hostToken = req.nextUrl.searchParams.get("host_token");
  if (!hostToken) {
    return NextResponse.json({ error: "MISSING_HOST_TOKEN" }, { status: 401 });
  }

  const { data: pool, error: poolError } = await supabaseAdmin
    .from("pools")
    .select("id, name, host_name, total_amount, envelope_count, mode, min_value, max_value, qr_token, status, expires_at, created_at, host_token")
    .eq("id", id)
    .single();

  if (poolError || !pool) {
    return NextResponse.json({ error: "POOL_NOT_FOUND" }, { status: 404 });
  }
  if (pool.host_token !== hostToken) {
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

  const { host_token: _hostToken, ...publicPool } = pool;
  const claimed = envelopes.filter((e) => e.is_claimed);

  return NextResponse.json({
    pool: publicPool,
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
