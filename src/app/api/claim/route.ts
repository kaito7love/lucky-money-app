import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { isValidPhone, normalizePhone } from "@/lib/phone";

const ERROR_MESSAGES: Record<string, string> = {
  INVALID_NAME: "Vui lòng nhập tên.",
  INVALID_PHONE: "Số điện thoại không hợp lệ.",
  POOL_NOT_FOUND: "Không tìm thấy lì xì này.",
  POOL_CLOSED: "Lì xì này đã đóng.",
  ALREADY_CLAIMED: "Bạn đã nhận lì xì này rồi.",
  NO_ENVELOPES_LEFT: "Đã hết bao lì xì, chúc bạn năm sau may mắn hơn!",
};

export async function POST(req: NextRequest) {
  let body: { qr_token?: string; name?: string; phone?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "INVALID_JSON" }, { status: 400 });
  }

  const qrToken = body.qr_token?.trim();
  const name = body.name?.trim();
  const phone = body.phone ? normalizePhone(body.phone) : undefined;

  if (!qrToken) return NextResponse.json({ error: "MISSING_QR_TOKEN" }, { status: 400 });
  if (!name) return NextResponse.json({ error: "INVALID_NAME", message: ERROR_MESSAGES.INVALID_NAME }, { status: 400 });
  if (!phone || !isValidPhone(phone)) {
    return NextResponse.json({ error: "INVALID_PHONE", message: ERROR_MESSAGES.INVALID_PHONE }, { status: 400 });
  }

  const { data: pool, error: poolError } = await supabaseAdmin
    .from("pools")
    .select("id")
    .eq("qr_token", qrToken)
    .single();

  if (poolError || !pool) {
    return NextResponse.json({ error: "POOL_NOT_FOUND", message: ERROR_MESSAGES.POOL_NOT_FOUND }, { status: 404 });
  }

  const { data, error } = await supabaseAdmin.rpc("claim_envelope", {
    p_pool_id: pool.id,
    p_name: name,
    p_phone: phone,
  });

  if (error) {
    const code = error.message.includes("ALREADY_CLAIMED")
      ? "ALREADY_CLAIMED"
      : error.message.includes("NO_ENVELOPES_LEFT")
        ? "NO_ENVELOPES_LEFT"
        : error.message.includes("POOL_CLOSED")
          ? "POOL_CLOSED"
          : "CLAIM_FAILED";
    const message = ERROR_MESSAGES[code] ?? "Có lỗi xảy ra, vui lòng thử lại.";
    const status = code === "CLAIM_FAILED" ? 500 : 409;
    return NextResponse.json({ error: code, message }, { status });
  }

  const result = data?.[0];
  return NextResponse.json({
    value: result?.claimed_value,
    remaining: result?.remaining_count,
  });
}
