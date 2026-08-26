import { supabaseAdmin } from "@/lib/supabase/admin";

/**
 * claim_envelope() lazily flips an active-but-expired pool to "expired",
 * but that UPDATE lives inside the same transaction as the RAISE EXCEPTION
 * that follows it — Postgres rolls the whole function call back, so the
 * status column never actually persists as "expired" until this runs.
 *
 * Every read path must compute the effective status itself, and persist it
 * so the row is self-healing outside of a claim attempt too.
 */
export async function effectivePoolStatus(pool: {
    id: string;
    status: string;
    expires_at: string | null;
}): Promise<string> {
    if (pool.status !== "active" || !pool.expires_at) return pool.status;
    if (new Date(pool.expires_at) >= new Date()) return pool.status;

    await supabaseAdmin
        .from("pools")
        .update({ status: "expired" })
        .eq("id", pool.id)
        .eq("status", "active");

    return "expired";
}
