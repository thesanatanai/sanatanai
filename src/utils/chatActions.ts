import PageContext from "@/app/(root)/PageContext";
import { useContext } from "react";

export async function createNewChat(
  setCurrentSession: (value: string) => void,
  setChats?: (value: Chats) => void
) {
  try {
    const { id } = await fetch("api/chats", {
      method: "PATCH",
    }).then((res) => res.json());
    setCurrentSession(id);
    getChats(setChats);
  } catch {}
}

export async function loadChat(
  id: string,
  setChatHistory?: (value: ChatHistory) => void,
  setChatLoading?: (value: boolean) => void
) {
  if(setChatLoading) setChatLoading(true);
  const chat: fullChat = await fetch("api/chats", {
    method: "OPTIONS",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ id }),
  }).then((res) => res.json());
  if(setChatHistory) setChatHistory(chat.messages);
  if(setChatLoading) setChatLoading(false);
  return chat.messages
}

export async function getChats(
  setChats?: (value: Chats) => void,
  setSessionId?: (value: string) => void
) {
  const chats: Chats = await fetch("api/chats").then((c) => c.json());
  if (chats && setSessionId) setSession(chats, setSessionId);
  if(setChats) setChats(chats || []);
  return chats || []
}

export function setSession(chats: Chats, setCurrentSession?: (value: string) => void) {
  let latestChat = chats[0];
    chats.forEach(
      (chat) =>
        (latestChat =
          latestChat.timestamp < chat.timestamp ? chat : latestChat),
    );
   if(setCurrentSession) setCurrentSession(latestChat.id);
   return latestChat.id;
}

export async function deleteChat([setChats, current]: [(value: Chats) => void, string], [id, setSession]: uStat<string>) {
  try {
    const { message } = await fetch("api/chats", {
      method: "DELETE",
      headers: {
        "Content-Type": "application/json",
      },
      body: `{"id":"${id}"}`,
    }).then((res) => res.json());
    let setId;
    if(id === current) setId = setSession;
    const chats = await getChats(setChats, setId);
    if (message && !chats.length) createNewChat(setSession, setChats);
  } catch {}
}

export async function updateChat<K extends keyof fullChat>(id: string, changes: Record<K, fullChat[K]>) {
  try {
    await fetch("api/chats", {
      method: "PUT",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({id, ...changes})
    })
  }
  catch {}
}

export function useDeleteMessage() {
  const {chatHistory: [history, setHistory], currentSessionId: [id]} = useContext(PageContext).userData;
  
  return async function deleteMessage(index: number) {
    if(!history[index]) return;
    const hasFunctionRes = history[index + 1]?.parts[0]?.functionResponse;
    const deleteCount = hasFunctionRes ? 2 : 1;
    const newHistory = structuredClone(history)
    newHistory.splice(index, deleteCount);
    setHistory(newHistory);
    return await updateChat(id, {
      messages: newHistory
    });
  }
}