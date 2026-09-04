/** Reserved for an actual fetch rejection — no response arrived at all. */
export const NETWORK_ERROR_MESSAGE = "Không thể kết nối máy chủ.";
/** The server answered, it just failed. Distinct from the message above so a
 *  broken deployment doesn't get reported to the user as their own bad Wi-Fi. */
export const SERVER_ERROR_MESSAGE = "Máy chủ gặp lỗi, vui lòng thử lại.";
/** A rejection the server chose but the caller has no wording for. */
export const GENERIC_ERROR_MESSAGE = "Có lỗi xảy ra, vui lòng thử lại.";

export interface ApiErrorBody {
    error?: string;
    message?: string;
}

/**
 * Parses a response body without letting an unparseable one throw.
 *
 * A route handler that throws before it responds comes back as a bare 500 with
 * an empty body, so `res.json()` on it rejects. Left unguarded that rejection
 * lands in the call site's `catch`, which reports a transport failure for a
 * request the server plainly answered — the mistake that once made an
 * unapplied migration look like a dead network.
 *
 * The empty stand-in is typed as the caller's shape because callers only read
 * those fields once they have seen `res.ok`; on a failure they read the body
 * through `apiErrorMessage()`, which copes with nothing being there.
 */
export async function readJson<T>(res: Response): Promise<T> {
    try {
        return (await res.json()) as T;
    } catch {
        return {} as T;
    }
}

/**
 * Wording for a response that came back `!ok`: the caller's own text for a
 * known error code, else whatever the route worded itself, else a fallback
 * chosen by status so "the server broke" and "you asked for something it
 * refused" don't read the same.
 */
export function apiErrorMessage(
    res: Response,
    body: ApiErrorBody | null | undefined,
    messages: Record<string, string> = {}
): string {
    const known = body?.error ? messages[body.error] : undefined;
    return known ?? body?.message ?? (res.status >= 500 ? SERVER_ERROR_MESSAGE : GENERIC_ERROR_MESSAGE);
}
