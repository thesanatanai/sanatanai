import { useAppStore } from "@/stores/appStore";
import { useChatStore } from "@/stores/chatStore";

/** Puts both stores back to the state they had when the app loaded. */
export function resetStores() {
  useAppStore.setState(useAppStore.getInitialState(), true);
  useChatStore.setState(useChatStore.getInitialState(), true);
}

/** Sets the app store's values (language, theme, profile, notification, ...) directly. */
export function setApp(values: Partial<ReturnType<typeof useAppStore.getState>>) {
  useAppStore.setState(values);
}

/** Sets the chat store's values (history, chats, open chat, ...) directly. */
export function setChat(values: Partial<ReturnType<typeof useChatStore.getState>>) {
  useChatStore.setState(values);
}

/**
 * Records every notification that is sent from now on.
 * Call `stop` to stop recording.
 */
export function recordNotifications() {
  const sent: { message: string; type: string; vars: Record<string, string> }[] = [];
  const stop = useAppStore.subscribe((state, previous) => {
    const { message, type, vars } = state.notification;
    // `vars` is a new object for every notification, so this ignores open/close changes.
    if (vars !== previous.notification.vars) sent.push({ message, type, vars });
  });
  return { sent, stop };
}
