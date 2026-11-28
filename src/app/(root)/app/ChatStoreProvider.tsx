"use client";
import { useAppStore } from "@/stores/appStore";
import { useAuthStore } from "@/stores/authStore";
import { useChatStore, withIndexes } from "@/stores/chatStore";
import { getChat, listChats } from "@/utils/api";
import type { AppData } from "@/utils/serverData";
import { setSession } from "@/utils/session";
import { ReactNode, useEffect, useLayoutEffect, useState } from "react";
import Loading from "@/app/loading";

/**
 * Puts what the server loaded into the stores, then shows the chat page:
 * the access token goes into the in-memory auth store, the user into the app store,
 * the chats and the latest chat into the chat store.
 *
 * When the server could not load the data (`initial` is null, for example because it
 * could not reach the API) the browser loads the same things itself.
 *
 * Only the first values are used. After that the stores are the source of truth, and they
 * keep their state while Next.js hides the page and shows it again.
 *
 * A failure is thrown while rendering, so the app's error screen takes over.
 * A user with no (valid) session is sent to sign-in by the API client.
 */
export function ChatStoreProvider({
  children,
  accessToken,
  initial,
}: Readonly<{
  children: ReactNode;
  accessToken: string | null;
  initial: AppData | null;
}>) {
  const [ready, setReady] = useState(false);
  const [failure, setFailure] = useState<unknown>();

  useLayoutEffect(() => {
    if (ready) return;
    if (accessToken) useAuthStore.getState().setAccessToken(accessToken);
    if (!initial) return;
    useAppStore.getState().hydrateProfile(initial.user);
    useChatStore.getState().initialize({
      chats: initial.chats,
      currentSessionId: initial.chatId,
      chatHistory: withIndexes(initial.messages),
    });
    // eslint-disable-next-line react-hooks/set-state-in-effect -- the page must not render before the stores are filled
    setReady(true);
  }, [ready, accessToken, initial]);

  useEffect(() => {
    // The server did the work, or it already has been done.
    if (ready || initial) return;
    let cancelled = false;
    async function load() {
      try {
        await useAppStore.getState().loadProfile();
        const chats = await listChats();
        const id = setSession(chats);
        const chat = await getChat(id);
        if (cancelled) return;
        useChatStore.getState().initialize({
          chats,
          currentSessionId: id,
          chatHistory: withIndexes(chat.messages),
        });
        setReady(true);
      } catch (error) {
        if (!cancelled) setFailure(error);
      }
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, [ready, initial]);

  if (failure) throw failure;
  return ready ? children : <Loading />;
}
