import type { PostgrestError } from "@supabase/supabase-js";

/** Postgres' invalid_text_representation. */
const INVALID_TEXT_REPRESENTATION = "22P02";

/**
 * True when a query failed only because the value compared against a column
 * could not be parsed as that column's type.
 *
 * Every id this API takes from a URL — pool id, qr_token — is a uuid column,
 * and Postgres answers a malformed literal with a cast error rather than an
 * empty result. Counted as "the query failed", a mistyped or truncated code
 * came back as a server error inviting the guest to try again, though no retry
 * could ever match: the value cannot identify a row. That is a miss, and the
 * callers below let it fall through to their not-found branch.
 *
 * Checked here rather than by validating the shape up front, so anything
 * Postgres itself accepts as a uuid keeps working.
 */
export function isMalformedValueError(error: PostgrestError | null): boolean {
    return error?.code === INVALID_TEXT_REPRESENTATION;
}
