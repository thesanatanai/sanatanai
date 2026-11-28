import { useChatStore } from "@/stores/chatStore";
import { setSession } from "./session";
import { createChat, listChats, patchChat, removeChat } from "./api";

export async function createNewChat() {
  try {
    const { id } = await createChat();
    useChatStore.getState().setCurrentSessionId(id);
    void getChats();
  } catch {}
}

/** Opens the chat {@link id}: shows a loading state, loads its messages and refreshes its title in the list. */
export function loadChat(id: string) {
  return useChatStore.getState().loadChat(id);
}

/**
 * Loads the chat list into the store.
 * @param selectLatest Also open the most recently used chat
 */
export async function getChats(selectLatest = false) {
  const { setChats, setCurrentSessionId } = useChatStore.getState();
  const chats = await listChats();
  if (chats.length && selectLatest) setSession(chats, setCurrentSessionId);
  setChats(chats);
  return chats;
}

export async function deleteChat(id: string) {
  // Whether the open chat is the deleted one has to be decided before the request.
  const isOpen = id === useChatStore.getState().currentSessionId;
  try {
    await removeChat(id);
    // The API gives a user who has no chats left a new empty one.
    await getChats(isOpen);
  } catch {}
}

export async function updateChat<K extends keyof fullChat>(id: string, changes: Record<K, fullChat[K]>) {
  try {
    await patchChat(id, changes as Parameters<typeof patchChat>[1]);
  }
  catch {}
}

/** Removes one message from the open chat and saves the shortened chat. */
export async function deleteMessage(index: number) {
  const { chatHistory, currentSessionId, setChatHistory } = useChatStore.getState();
  if (!chatHistory[index]) return;
  const newHistory = structuredClone(chatHistory);
  newHistory.splice(index, 1);
  setChatHistory(newHistory);
  return await updateChat(currentSessionId, {
    messages: newHistory
  });
}
