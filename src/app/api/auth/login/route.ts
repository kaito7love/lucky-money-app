import { NextRequest, NextResponse } from "next/server";
import { createSession, verifyLogin } from "@/lib/auth";
import { normalizePhone } from "@/lib/phone";
import {
    callerKey,
    clearRateLimit,
    consumeAll,
    LOGIN_PER_ACCOUNT,
    LOGIN_PER_CALLER,
    LOGIN_PER_CALLER_ACCOUNT,
} from "@/lib/rateLimit";

const ERROR_MESSAGES: Record<string, string> = {
    INVALID_CREDENTIALS: "Số điện thoại hoặc mật khẩu không đúng.",
    TOO_MANY_ATTEMPTS: "Bạn đã thử quá nhiều lần. Vui lòng đợi ít phút rồi thử lại.",
    USER_LOOKUP_FAILED: "Không thể kiểm tra số điện thoại, vui lòng thử lại.",
    SESSION_CREATE_FAILED: "Không thể tạo phiên đăng nhập, vui lòng thử lại.",
};

export async function POST(req: NextRequest) {
    let body: { phone?: string; password?: string };
    try {
        body = await req.json();
    } catch {
        return NextResponse.json({ error: "INVALID_JSON" }, { status: 400 });
    }

    const phone = body.phone ? normalizePhone(body.phone) : "";
    const password = body.password ?? "";

    // Budget is spent per attempt, not per failure, so a flood of guesses runs
    // out whether or not any of them happen to be right.
    const caller = callerKey(req);
    const allowed = await consumeAll([
        { key: `login:caller-account:${caller}:${phone}`, rule: LOGIN_PER_CALLER_ACCOUNT },
        { key: `login:account:${phone}`, rule: LOGIN_PER_ACCOUNT },
        { key: `login:caller:${caller}`, rule: LOGIN_PER_CALLER },
    ]);
    if (!allowed) {
        return NextResponse.json(
            { error: "TOO_MANY_ATTEMPTS", message: ERROR_MESSAGES.TOO_MANY_ATTEMPTS },
            { status: 429 }
        );
    }

    // Same reasoning as the register route: left unwrapped, a throw from the
    // lookup or the session insert is answered by Next as a bare 500 with no
    // body, and the sign-in form has nothing to tell the user but a guess. The
    // rate-limit calls stay outside — they fail open by design and never throw.
    try {
        const user = await verifyLogin(phone, password);
        if (!user) {
            return NextResponse.json(
                { error: "INVALID_CREDENTIALS", message: ERROR_MESSAGES.INVALID_CREDENTIALS },
                { status: 401 }
            );
        }

        // Only the caller+account budget is forgiven. The caller-wide one is what
        // limits how many different accounts one source may probe, so a success
        // must not reset it.
        await clearRateLimit(`login:caller-account:${caller}:${phone}`);

        const token = await createSession(user.id);
        return NextResponse.json({ session_token: token, user });
    } catch (err) {
        const code = err instanceof Error ? err.message : "LOGIN_FAILED";
        const message = ERROR_MESSAGES[code] ?? "Máy chủ gặp lỗi, vui lòng thử lại.";
        return NextResponse.json({ error: code, message }, { status: 500 });
    }
}
