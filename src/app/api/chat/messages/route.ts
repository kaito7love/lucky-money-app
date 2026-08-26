import { randomUUID } from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { getUserBySessionToken } from "@/lib/auth";
import { readJson, writeJson } from "@/lib/jsonDb";

interface ChatMessage {
    id: string;
    senderId: string;
    senderName: string;
    text: string;
    createdAt: string;
}

const MESSAGES_FILE = "chat-messages.json";

export async function GET() {
    const messages = await readJson<ChatMessage[]>(MESSAGES_FILE, []);
    return NextResponse.json({ messages });
}

export async function POST(req: NextRequest) {
    let body: { session_token?: string; text?: string };
    try {
        body = await req.json();
    } catch {
        return NextResponse.json({ error: "INVALID_JSON" }, { status: 400 });
    }

    if (!body.session_token) {
        return NextResponse.json({ error: "MISSING_SESSION_TOKEN" }, { status: 401 });
    }
    const user = await getUserBySessionToken(body.session_token);
    if (!user) {
        return NextResponse.json({ error: "INVALID_SESSION" }, { status: 401 });
    }

    const text = body.text?.trim();
    if (!text) {
        return NextResponse.json({ error: "EMPTY_TEXT" }, { status: 400 });
    }

    const messages = await readJson<ChatMessage[]>(MESSAGES_FILE, []);
    const message: ChatMessage = {
        id: randomUUID(),
        senderId: user.id,
        senderName: user.name,
        text,
        createdAt: new Date().toISOString(),
    };
    messages.push(message);
    await writeJson(MESSAGES_FILE, messages);

    return NextResponse.json({ message });
}
