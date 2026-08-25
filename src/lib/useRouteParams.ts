import { useParams } from "next/navigation";
import type { Params } from "next/dist/server/request/params";

/**
 * `next-env.d.ts` pulls in Next's Pages-Router compat types, which widen
 * `useParams()` to `T | null` project-wide even though the App Router
 * version (used everywhere in this app) never actually returns null. This
 * wrapper asserts that once, centrally, with a loud failure instead of a
 * silent `!` at every call site.
 */
export function useRouteParams<T extends Params>(): T {
    const params = useParams<T>();
    if (!params) {
        throw new Error("useRouteParams: no route params — hook used outside a matched App Router page.");
    }
    return params;
}
