import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { generateEnvelopeValues, validateFixedValues } from "@/lib/envelopes";
import type { CreatePoolInput } from "@/lib/types";

const MAX_ENVELOPES = 500;

export async function POST(req: NextRequest) {
  let body: CreatePoolInput;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "INVALID_JSON" }, { status: 400 });
  }

  const name = body.name?.trim();
  const hostName = body.host_name?.trim();
  const totalAmount = Number(body.total_amount);
  const envelopeCount = Number(body.envelope_count);

  if (!name) return NextResponse.json({ error: "MISSING_NAME" }, { status: 400 });
  if (!hostName) return NextResponse.json({ error: "MISSING_HOST_NAME" }, { status: 400 });
  if (!Number.isInteger(totalAmount) || totalAmount <= 0) {
    return NextResponse.json({ error: "INVALID_TOTAL_AMOUNT" }, { status: 400 });
  }
  if (!Number.isInteger(envelopeCount) || envelopeCount <= 0 || envelopeCount > MAX_ENVELOPES) {
    return NextResponse.json({ error: "INVALID_ENVELOPE_COUNT" }, { status: 400 });
  }
  if (body.mode !== "fixed" && body.mode !== "random") {
    return NextResponse.json({ error: "INVALID_MODE" }, { status: 400 });
  }

  let values: number[];
  let minValue: number | null = null;
  let maxValue: number | null = null;

  try {
    if (body.mode === "random") {
      minValue = Number(body.min_value);
      maxValue = Number(body.max_value);
      values = generateEnvelopeValues(totalAmount, envelopeCount, minValue, maxValue);
    } else {
      const fixedValues = (body.fixed_values ?? []).map(Number);
      validateFixedValues(fixedValues, totalAmount, envelopeCount);
      values = fixedValues;
      minValue = Math.min(...fixedValues);
      maxValue = Math.max(...fixedValues);
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : "INVALID_ENVELOPE_VALUES";
    return NextResponse.json({ error: message }, { status: 400 });
  }

  let expiresAt: string | null = null;
  if (body.expires_in_hours) {
    const hours = Number(body.expires_in_hours);
    if (!Number.isFinite(hours) || hours <= 0) {
      return NextResponse.json({ error: "INVALID_EXPIRY" }, { status: 400 });
    }
    expiresAt = new Date(Date.now() + hours * 60 * 60 * 1000).toISOString();
  }

  const { data: pool, error: poolError } = await supabaseAdmin
    .from("pools")
    .insert({
      name,
      host_name: hostName,
      total_amount: totalAmount,
      envelope_count: envelopeCount,
      mode: body.mode,
      min_value: minValue,
      max_value: maxValue,
      expires_at: expiresAt,
    })
    .select("id, qr_token, host_token")
    .single();

  if (poolError || !pool) {
    return NextResponse.json({ error: "POOL_CREATE_FAILED" }, { status: 500 });
  }

  const envelopeRows = values.map((value) => ({ pool_id: pool.id, value }));
  const { error: envelopesError } = await supabaseAdmin.from("envelopes").insert(envelopeRows);

  if (envelopesError) {
    // Roll back the orphaned pool so it doesn't show up with zero envelopes.
    await supabaseAdmin.from("pools").delete().eq("id", pool.id);
    return NextResponse.json({ error: "ENVELOPES_CREATE_FAILED" }, { status: 500 });
  }

  return NextResponse.json({
    id: pool.id,
    qr_token: pool.qr_token,
    host_token: pool.host_token,
  });
}
