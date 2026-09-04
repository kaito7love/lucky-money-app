import type { NextRequest } from "next/server";

/**
 * Credentials arrive in headers, never in the query string.
 *
 * A session token is a bearer credential good for 30 days and a host token
 * grants full control of a pool, yet both used to travel as `?session_token=`
 * / `?host_token=`. Request paths are recorded verbatim in server, proxy and
 * platform logs — on Vercel every function invocation logs its path — so live
 * credentials ended up sitting in log storage, readable by anyone with
 * dashboard access and retained long after the request.
 *
 * Headers are not logged that way. (These calls are all fetch(), so the query
 * string never reached browser history or a Referer header — logging was the
 * whole exposure, and it is the part headers fix.)
 */

/** `Authorization: Bearer <session_token>` — who the caller is. */
export function sessionTokenFrom(req: NextRequest): string | null {
    const header = req.headers.get("authorization");
    if (!header) return null;
    const [scheme, ...rest] = header.split(" ");
    if (scheme.toLowerCase() !== "bearer") return null;
    const token = rest.join(" ").trim();
    return token || null;
}

/**
 * `X-Host-Token: <host_token>` — a capability for one pool rather than an
 * identity, so it gets its own header instead of overloading Authorization
 * with a second meaning the routes would have to tell apart.
 */
export function hostTokenFrom(req: NextRequest): string | null {
    return req.headers.get("x-host-token")?.trim() || null;
}
