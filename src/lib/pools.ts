import { supabaseAdmin } from "@/lib/supabase/admin";
import { generateEnvelopeValues, validateFixedValues } from "@/lib/envelopes";
import { findOrCreateUserByPhone } from "@/lib/auth";
import { hashSecret } from "@/lib/hash";
import { isValidPhone, normalizePhone } from "@/lib/phone";
import type { CreatePoolInput } from "@/lib/types";

const MAX_ENVELOPES = 500;
const PIN_RE = /^\d{4,6}$/;

export interface CreatePoolResult {
    id: string;
    qr_token: string;
    host_token: string;
}

/**
 * Core "create a pool + its envelopes" logic, shared by the full /create
 * form (POST /api/pools) and any shortcut that creates a pool with fewer
 * inputs (e.g. the in-chat "Lì Xì" composer). Throws an Error whose message
 * is one of the existing client-facing error codes (MISSING_NAME,
 * INVALID_HOST_PHONE, INVALID_RANGE, ...) — callers map it to an HTTP
 * response the same way the two error codes already thrown by
 * generateEnvelopeValues/validateFixedValues are handled today.
 */
export async function createPool(body: CreatePoolInput): Promise<CreatePoolResult> {
    const name = body.name?.trim();
    const hostPhone = body.host_phone ? normalizePhone(body.host_phone) : undefined;
    const totalAmount = Number(body.total_amount);
    const envelopeCount = Number(body.envelope_count);

    if (!name) throw new Error("MISSING_NAME");
    if (!hostPhone || !isValidPhone(hostPhone)) throw new Error("INVALID_HOST_PHONE");
    if (!Number.isInteger(totalAmount) || totalAmount <= 0) throw new Error("INVALID_TOTAL_AMOUNT");
    if (!Number.isInteger(envelopeCount) || envelopeCount <= 0 || envelopeCount > MAX_ENVELOPES) {
        throw new Error("INVALID_ENVELOPE_COUNT");
    }
    if (body.mode !== "fixed" && body.mode !== "random") throw new Error("INVALID_MODE");

    let hostUser;
    try {
        hostUser = await findOrCreateUserByPhone(hostPhone, body.host_name);
    } catch (err) {
        if (err instanceof Error && err.message === "NAME_REQUIRED") {
            throw new Error("MISSING_HOST_NAME");
        }
        throw err;
    }

    let pinHash: string | null = null;
    if (body.is_private) {
        const pin = body.pin?.trim();
        if (!pin || !PIN_RE.test(pin)) throw new Error("INVALID_PIN");
        pinHash = hashSecret(pin);
    }

    let values: number[];
    let minValue: number | null = null;
    let maxValue: number | null = null;

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

    let expiresAt: string | null = null;
    if (body.expires_in_hours) {
        const hours = Number(body.expires_in_hours);
        if (!Number.isFinite(hours) || hours <= 0) throw new Error("INVALID_EXPIRY");
        expiresAt = new Date(Date.now() + hours * 60 * 60 * 1000).toISOString();
    }

    const { data: pool, error: poolError } = await supabaseAdmin
        .from("pools")
        .insert({
            name,
            host_name: hostUser.name,
            host_phone: hostPhone,
            total_amount: totalAmount,
            envelope_count: envelopeCount,
            mode: body.mode,
            min_value: minValue,
            max_value: maxValue,
            expires_at: expiresAt,
            is_private: Boolean(body.is_private),
            pin_hash: pinHash,
        })
        .select("id, qr_token, host_token")
        .single();

    if (poolError || !pool) throw new Error("POOL_CREATE_FAILED");

    const envelopeRows = values.map((value) => ({ pool_id: pool.id, value }));
    const { error: envelopesError } = await supabaseAdmin.from("envelopes").insert(envelopeRows);

    if (envelopesError) {
        // Roll back the orphaned pool so it doesn't show up with zero envelopes.
        await supabaseAdmin.from("pools").delete().eq("id", pool.id);
        throw new Error("ENVELOPES_CREATE_FAILED");
    }

    return { id: pool.id, qr_token: pool.qr_token, host_token: pool.host_token };
}

const SERVER_ERROR_CODES = new Set(["POOL_CREATE_FAILED", "ENVELOPES_CREATE_FAILED"]);

/** HTTP status for an error code thrown by createPool(): 500 for the two
 * infra-failure codes, 400 for every validation code. */
export function poolErrorStatus(code: string): number {
    return SERVER_ERROR_CODES.has(code) ? 500 : 400;
}
