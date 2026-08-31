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
}
