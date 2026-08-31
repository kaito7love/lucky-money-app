import { NextRequest, NextResponse } from "next/server";
import { createSession, createUser, findUserByPhone } from "@/lib/auth";
import { isValidPhone, normalizePhone } from "@/lib/phone";

const ERROR_MESSAGES: Record<string, string> = {
    MISSING_NAME: "Vui lòng nhập họ và tên.",
    INVALID_PHONE: "Số điện thoại không hợp lệ.",
    INVALID_PASSWORD: "Mật khẩu phải có ít nhất 6 ký tự.",
    PHONE_TAKEN: "Số điện thoại này đã được đăng ký.",
    USER_LOOKUP_FAILED: "Không thể kiểm tra số điện thoại, vui lòng thử lại.",
    USER_CREATE_FAILED: "Không thể tạo tài khoản, vui lòng thử lại.",
    SESSION_CREATE_FAILED: "Không thể tạo phiên đăng nhập, vui lòng thử lại.",
};

export async function POST(req: NextRequest) {
    let body: { name?: string; phone?: string; password?: string };
    try {
        body = await req.json();
    } catch {
        return NextResponse.json({ error: "INVALID_JSON" }, { status: 400 });
    }

    const name = body.name?.trim();
    const phone = body.phone ? normalizePhone(body.phone) : undefined;
    const password = body.password ?? "";

    if (!name) {
        return NextResponse.json({ error: "MISSING_NAME", message: ERROR_MESSAGES.MISSING_NAME }, { status: 400 });
    }
    if (!phone || !isValidPhone(phone)) {
        return NextResponse.json({ error: "INVALID_PHONE", message: ERROR_MESSAGES.INVALID_PHONE }, { status: 400 });
    }
    if (password.length < 6) {
        return NextResponse.json({ error: "INVALID_PASSWORD", message: ERROR_MESSAGES.INVALID_PASSWORD }, { status: 400 });
    }

    // Unwrapped, a throw from any of these three leaves Next to answer with a
    // bare 500 and no body — which the sign-up form can only describe in the
    // vaguest terms. Naming the failing step keeps a broken database (or an
    // unapplied migration) distinguishable from a rejected registration.
    try {
        if (await findUserByPhone(phone)) {
            return NextResponse.json({ error: "PHONE_TAKEN", message: ERROR_MESSAGES.PHONE_TAKEN }, { status: 409 });
        }

        const user = await createUser(name, phone, password);
        const token = await createSession(user.id);
        return NextResponse.json({ session_token: token, user });
    } catch (err) {
        const code = err instanceof Error ? err.message : "REGISTER_FAILED";
        const message = ERROR_MESSAGES[code] ?? "Máy chủ gặp lỗi, vui lòng thử lại.";
        return NextResponse.json({ error: code, message }, { status: 500 });
    }
}
