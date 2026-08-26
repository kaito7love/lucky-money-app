import { NextRequest, NextResponse } from "next/server";
import { deleteSession } from "@/lib/auth";

export async function POST(req: NextRequest) {
    let body: { session_token?: string };
    try {
        body = await req.json();
    } catch {
        return NextResponse.json({ error: "INVALID_JSON" }, { status: 400 });
    }

    if (body.session_token) {
        await deleteSession(body.session_token);
    }

    return NextResponse.json({ ok: true });
}
