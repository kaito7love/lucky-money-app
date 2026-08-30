import { supabaseAdmin } from "@/lib/supabase/admin";

export interface ChatMessage {
    id: string;
    roomId: string;
    senderId: string;
    senderName: string;
    text: string;
    createdAt: string;
    lixi?: {
        poolId: string;
        qrToken: string;
        name: string;
        totalAmount: number;
        envelopeCount: number;
    };
}

interface Row {
    id: string;
    room_id: string;
    sender_id: string;
    sender_name: string;
    text: string;
    created_at: string;
    lixi_pool_id: string | null;
    lixi_qr_token: string | null;
    lixi_name: string | null;
    lixi_total_amount: number | null;
    lixi_envelope_count: number | null;
}

const SELECT_COLUMNS =
    "id, room_id, sender_id, sender_name, text, created_at, lixi_pool_id, lixi_qr_token, lixi_name, lixi_total_amount, lixi_envelope_count";

function toMessage(row: Row): ChatMessage {
    return {
        id: row.id,
        roomId: row.room_id,
        senderId: row.sender_id,
        senderName: row.sender_name,
        text: row.text,
        createdAt: row.created_at,
        lixi: row.lixi_pool_id
            ? {
                  poolId: row.lixi_pool_id,
                  qrToken: row.lixi_qr_token!,
                  name: row.lixi_name!,
                  totalAmount: row.lixi_total_amount!,
                  envelopeCount: row.lixi_envelope_count!,
              }
            : undefined,
    };
}

export async function getMessagesByRoom(roomId: string): Promise<ChatMessage[]> {
    const { data, error } = await supabaseAdmin
        .from("chat_messages")
        .select(SELECT_COLUMNS)
        .eq("room_id", roomId)
        .order("created_at", { ascending: true });
    if (error) throw new Error("MESSAGES_FETCH_FAILED");
    return (data ?? []).map(toMessage);
}

/** Latest message per room, for the room-list screen's preview line. */
export async function getLastMessageByRoom(): Promise<Map<string, ChatMessage>> {
    const { data, error } = await supabaseAdmin
        .from("chat_messages")
        .select(SELECT_COLUMNS)
        .order("created_at", { ascending: false });
    if (error) throw new Error("MESSAGES_FETCH_FAILED");

    const lastByRoom = new Map<string, ChatMessage>();
    for (const row of (data ?? []).map(toMessage)) {
        if (!lastByRoom.has(row.roomId)) lastByRoom.set(row.roomId, row);
    }
    return lastByRoom;
}

export async function insertMessage(input: {
    roomId: string;
    senderId: string;
    senderName: string;
    text: string;
    lixi?: ChatMessage["lixi"];
}): Promise<ChatMessage> {
    const { data, error } = await supabaseAdmin
        .from("chat_messages")
        .insert({
            room_id: input.roomId,
            sender_id: input.senderId,
            sender_name: input.senderName,
            text: input.text,
            lixi_pool_id: input.lixi?.poolId ?? null,
            lixi_qr_token: input.lixi?.qrToken ?? null,
            lixi_name: input.lixi?.name ?? null,
            lixi_total_amount: input.lixi?.totalAmount ?? null,
            lixi_envelope_count: input.lixi?.envelopeCount ?? null,
        })
        .select(SELECT_COLUMNS)
        .single();
    if (error || !data) throw new Error("MESSAGE_CREATE_FAILED");
    return toMessage(data);
}
