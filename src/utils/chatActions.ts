import { useChatStore } from "@/stores/chatStore";
import { setSession } from "./session";

export async function createNewChat() {
  try {
    const { id } = await fetch("api/chats", {
      method: "POST",
    }).then((res) => res.json());
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
  const chats: Chats = await fetch("api/chats").then((c) => c.json());
  if (chats && selectLatest) setSession(chats, setCurrentSessionId);
  setChats(chats || []);
  return chats || [];
}

export async function deleteChat(id: string) {
  // Whether the open chat is the deleted one has to be decided before the request.
  const isOpen = id === useChatStore.getState().currentSessionId;
  try {
    const { message } = await fetch("api/chats/" + id, {
      method: "DELETE",
    }).then((res) => res.json());

    const chats = await getChats(isOpen);
    if (message && !chats.length) void createNewChat();
  } catch {}
}

export async function updateChat<K extends keyof fullChat>(id: string, changes: Record<K, fullChat[K]>) {
  try {
    await fetch(`api/chats/${id}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(changes)
    })
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
