import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";

/**
 * Keeps the Supabase project from being paused, and does the housekeeping
 * that would otherwise have to ride along on user requests.
 *
 * Supabase pauses a Free plan project that sees little database activity over
 * a 7-day window; a paused project is unreachable until someone restores it by
 * hand from the dashboard. Their guidance is that a few database requests a
 * day is enough to stay awake, so this runs daily and issues several real
 * queries — a route that just returned static JSON would never touch Postgres
 * and would not count for anything.
 *
 * Prevention only. Once a project is already paused this cannot wake it: the
 * restore has to be done from the Supabase dashboard.
 */

// Vercel invokes cron jobs with `Authorization: Bearer $CRON_SECRET` when that
// variable is set on the project. Without the check the endpoint is an open
// invitation to run the delete functions below.
function isAuthorized(req: NextRequest): boolean {
    const secret = process.env.CRON_SECRET;
    if (!secret) return false;
    return req.headers.get("authorization") === `Bearer ${secret}`;
}

export async function GET(req: NextRequest) {
    if (!isAuthorized(req)) {
        return new NextResponse("Unauthorized", { status: 401 });
    }

    // Every step is idempotent, which is what cron needs: Vercel's delivery is
    // best effort, so a run may be skipped or fired twice.
    const results: Record<string, string> = {};

    const { count, error: pingError } = await supabaseAdmin
        .from("pools")
        .select("id", { count: "exact", head: true });
    results.ping = pingError ? `failed: ${pingError.message}` : `ok (${count ?? 0} pools)`;

    const { error: sessionError } = await supabaseAdmin.rpc("delete_expired_sessions");
    results.expiredSessions = sessionError ? `failed: ${sessionError.message}` : "swept";

    const { error: rateLimitError } = await supabaseAdmin.rpc("delete_stale_rate_limits");
    results.staleRateLimits = rateLimitError ? `failed: ${rateLimitError.message}` : "swept";

    // A failing ping is the signal worth surfacing — it is how a paused (or
    // misconfigured) project shows up in the cron logs instead of silently
    // reporting success every day while the app is down.
    const ok = !pingError;
    return NextResponse.json({ ok, ranAt: new Date().toISOString(), results }, { status: ok ? 200 : 503 });
}
