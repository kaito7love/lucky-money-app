"use client";

import ChatRoom from "@/components/chat/ChatRoom";
import { useRouteParams } from "@/lib/useRouteParams";

export default function ChatRoomPage() {
  const params = useRouteParams<{ roomId: string }>();
  return <ChatRoom roomId={params.roomId} />;
}
