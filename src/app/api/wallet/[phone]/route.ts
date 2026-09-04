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

  // Summed rather than read off the newest row's balance_after. created_at
  // defaults to now(), which in Postgres is the transaction's start time, not
  // the moment of the insert — so when someone claims from two pools at once,
  // the row that committed second can carry the earlier timestamp and "newest"
  // picks the wrong balance. A sum of the ledger cannot be put in the wrong
  // order, which is the property a balance needs.
  const balance = transactions.reduce((sum, t) => sum + t.amount, 0);

  return NextResponse.json({ balance, transactions });
}
