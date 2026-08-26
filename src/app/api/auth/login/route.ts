import { NextRequest, NextResponse } from "next/server";
import { createSession, verifyLogin } from "@/lib/auth";
import { normalizePhone } from "@/lib/phone";

const ERROR_MESSAGES: Record<string, string> = {
    INVALID_CREDENTIALS: "Số điện thoại hoặc mật khẩu không đúng.",
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

    const user = await verifyLogin(phone, password);
    if (!user) {
        return NextResponse.json(
            { error: "INVALID_CREDENTIALS", message: ERROR_MESSAGES.INVALID_CREDENTIALS },
            { status: 401 }
        );
    }

    const token = await createSession(user.id);
    return NextResponse.json({ session_token: token, user });
}
