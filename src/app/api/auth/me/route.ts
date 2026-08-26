import { NextRequest, NextResponse } from "next/server";
import { getUserBySessionToken } from "@/lib/auth";

export async function GET(req: NextRequest) {
    const token = req.nextUrl.searchParams.get("session_token");
    if (!token) {
        return NextResponse.json({ error: "MISSING_SESSION_TOKEN" }, { status: 401 });
    }

    const user = await getUserBySessionToken(token);
    if (!user) {
        return NextResponse.json({ error: "INVALID_SESSION" }, { status: 401 });
    }

    return NextResponse.json({ user });
}
