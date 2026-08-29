import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { getUserBySessionToken } from "@/lib/auth";

/**
 * Recovery path for hosts on a new device: lists pools tied to the logged-in
 * account's phone number. Scoped to exactly one phone and gated behind
 * proving ownership of it via a valid session — never an open "list all"
 * query.
 */
export async function GET(req: NextRequest) {
  const sessionToken = req.nextUrl.searchParams.get("session_token");
  if (!sessionToken) {
    return NextResponse.json({ error: "MISSING_SESSION_TOKEN" }, { status: 401 });
  }

  const user = await getUserBySessionToken(sessionToken);
  if (!user) {
    return NextResponse.json({ error: "INVALID_SESSION" }, { status: 401 });
  }

  const { data: pools, error } = await supabaseAdmin
    .from("pools")
    .select("id, name, host_name, status, envelope_count, created_at")
    .eq("host_phone", user.phone)
    .order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json({ error: "POOLS_FETCH_FAILED" }, { status: 500 });
  }

  return NextResponse.json({ pools: pools ?? [] });
}
