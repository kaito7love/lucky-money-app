import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";

/** Public view for guests scanning the QR — no host_token, no claimant list. */
export async function GET(_req: NextRequest, { params }: { params: Promise<{ qrToken: string }> }) {
  const { qrToken } = await params;
  const { data: pool, error } = await supabaseAdmin
    .from("pools")
    .select("id, name, host_name, envelope_count, status, expires_at")
    .eq("qr_token", qrToken)
    .single();

  if (error || !pool) {
    return NextResponse.json({ error: "POOL_NOT_FOUND" }, { status: 404 });
  }

  const { count: remaining } = await supabaseAdmin
    .from("envelopes")
    .select("id", { count: "exact", head: true })
    .eq("pool_id", pool.id)
    .eq("is_claimed", false);

  return NextResponse.json({
    id: pool.id,
    name: pool.name,
    host_name: pool.host_name,
    envelope_count: pool.envelope_count,
    remaining: remaining ?? 0,
    status: pool.status,
    expires_at: pool.expires_at,
  });
}
