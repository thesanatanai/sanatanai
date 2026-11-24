"use client";
import { useChatStore } from "@/stores/chatStore";
import { ReactNode, useLayoutEffect, useState } from "react";

/**
 * Fills the chat store with the chats and messages the server loaded, then
 * shows the chat page. The values are only used when the page first opens:
 * after that the store is the source of truth, and it keeps its state while
 * Next.js hides the page and shows it again.
 */
export function ChatStoreProvider({
  children,
  loadedChats,
  id,
  messages,
}: Readonly<{
  children: ReactNode;
  loadedChats: Chats;
  id: string;
  messages: ChatHistory;
}>) {
  const [ready, setReady] = useState(false);

  useLayoutEffect(() => {
    if (ready) return;
    useChatStore.getState().initialize({ chats: loadedChats, currentSessionId: id, chatHistory: messages });
    // eslint-disable-next-line react-hooks/set-state-in-effect -- the page must not render before the store is filled
    setReady(true);
  }, [ready, loadedChats, id, messages]);

  return ready ? children : null;
}
