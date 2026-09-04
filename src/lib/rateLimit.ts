import { supabaseAdmin } from "@/lib/supabase/admin";
import type { NextRequest } from "next/server";

/**
 * Counters live in Postgres, not in module scope: on Vercel each concurrent
 * lambda gets its own memory, so an in-process counter would give every
 * instance a fresh budget and limit nothing.
 */

export interface RateLimitRule {
    /** Attempts allowed inside the window. */
    limit: number;
    windowSeconds: number;
}

/**
 * Several rules per endpoint, because each one closes a different hole.
 *
 * - caller+subject stops someone hammering one account or one pool.
 * - subject alone is the backstop against an attacker rotating IPs. Set well
 *   above anything a real party of guests produces, since tripping it blocks
 *   everyone at once.
 * - caller alone stops credential stuffing: one guess each against a long list
 *   of phone numbers never trips a caller+subject rule, because every new
 *   number starts a fresh budget. This is the rule that catches it.
 */
export const CLAIM_PIN_PER_CALLER_POOL: RateLimitRule = { limit: 5, windowSeconds: 600 };
export const CLAIM_PIN_PER_POOL: RateLimitRule = { limit: 40, windowSeconds: 600 };
export const LOGIN_PER_CALLER_ACCOUNT: RateLimitRule = { limit: 5, windowSeconds: 600 };
export const LOGIN_PER_ACCOUNT: RateLimitRule = { limit: 20, windowSeconds: 600 };
export const LOGIN_PER_CALLER: RateLimitRule = { limit: 20, windowSeconds: 600 };

/**
 * Best-effort caller identity. x-forwarded-for is set by Vercel's edge and can
 * be spoofed when the app runs behind something that does not overwrite it —
 * which is why every caller-scoped rule is paired with a subject-scoped one
 * that does not depend on this value.
 */
export function callerKey(req: NextRequest): string {
    const forwarded = req.headers.get("x-forwarded-for");
    const ip = forwarded?.split(",")[0]?.trim();
    return ip || req.headers.get("x-real-ip") || "unknown";
}

/**
 * Records an attempt and reports whether it is still within budget.
 *
 * Fails open: if the counter itself is unreachable, callers still get their
 * request served rather than the whole endpoint going down with the limiter.
 * The alternative — failing closed — turns a database blip into an outage of
 * login and claiming.
 */
export async function consumeRateLimit(key: string, rule: RateLimitRule): Promise<boolean> {
    const { data, error } = await supabaseAdmin.rpc("consume_rate_limit", {
        p_key: key,
        p_limit: rule.limit,
        p_window_seconds: rule.windowSeconds,
    });
    if (error) return true;
    return data !== false;
}

/** Wipes a key's history after a success, so earlier fumbles are forgiven. */
export async function clearRateLimit(key: string): Promise<void> {
    await supabaseAdmin.rpc("clear_rate_limit", { p_key: key }).then(
        () => undefined,
        () => undefined
    );
}

/**
 * Applies every rule and reports whether all of them allowed the attempt.
 * All are consumed rather than short-circuiting, so one tripped rule does not
 * hide the counts the others are keeping.
 */
export async function consumeAll(
    entries: { key: string; rule: RateLimitRule }[]
): Promise<boolean> {
    const results = await Promise.all(entries.map((e) => consumeRateLimit(e.key, e.rule)));
    return results.every(Boolean);
}
