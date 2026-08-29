import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { normalizePhone } from "@/lib/phone";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ phone: string }> }) {
  const { phone: rawPhone } = await params;
  const phone = normalizePhone(decodeURIComponent(rawPhone));
  if (!phone) {
    return NextResponse.json({ error: "MISSING_PHONE" }, { status: 400 });
  }

  const { data: transactions, error } = await supabaseAdmin
    .from("wallet_transactions")
    .select("id, amount, type, pool_id, balance_after, created_at")
    .eq("phone_number", phone)
    .order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json({ error: "FETCH_FAILED" }, { status: 500 });
  }

  const balance = transactions[0]?.balance_after ?? 0;

  return NextResponse.json({ balance, transactions });
}
