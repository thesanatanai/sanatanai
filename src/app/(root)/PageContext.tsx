"use client";
import { loadChat } from "@/utils/chatActions";
import { Context, createContext, ReactNode, useEffect, useMemo, useReducer, useState } from "react";

const PageContext = createContext<PageContextProps | null>(null) as Context<PageContextProps>;

export function PgContext({
  children,
  loadedChats,
  id,
  messages
}: Readonly<{
  children: ReactNode,
  loadedChats: Chats,
  id: string,
  messages: ChatHistory
}>) {
  const [isDeep, setIsDeep] = useState<boolean>(false);
  const [settingsOpen, setSettingsOpen] = useState<boolean>(false);
  const [persona, setPersona] = useState<string>(() => {
    if(globalThis.window) {
      return localStorage.getItem("persona") || ""
    }
    return ""
  });
  const [chatHistory, setChatHistory] = useState<ChatHistory>(messages);
  const [historyLoading, setHistoryLoading] = useState(false);
  const isPC = useMemo(() => {
    if(globalThis.window) {
      return window.innerWidth / window.innerHeight > 1
    }
    return false
  }, []);
  const [chats, setChats] = useState<Chats>(loadedChats);
  const [currentSessionId, setCurrentSessionId] = useReducer<string, [string]>((prevId, newId) => {
    if(prevId == newId) return prevId;
    loadChat(newId, setChatHistory, setHistoryLoading);
    return newId
  }, id);
  useEffect(() => {
    localStorage.setItem("persona", persona);
  }, [persona]);

  const userData = useMemo<PageContextProps["userData"]>(() => ({
    chatHistory: [chatHistory, setChatHistory],
    persona: [persona, setPersona],
    chats: [chats, setChats],
    currentSessionId: [currentSessionId, setCurrentSessionId] as uStat<string>  
  }), [chatHistory, setChatHistory, persona, setPersona, chats, setChats, currentSessionId, setCurrentSessionId]);

  const value = useMemo<PageContextProps>(() => ({
    userData,
    isDeep: [isDeep, setIsDeep],
    settingsOpen: [settingsOpen, setSettingsOpen],
    isPC,
    historyLoading: [historyLoading, setHistoryLoading]
  }), [userData, isDeep, setIsDeep, settingsOpen, setSettingsOpen, isPC, historyLoading, setHistoryLoading]);

  return (
    <PageContext.Provider value={value}>
      {children}
    </PageContext.Provider>
  )
}

export default PageContext;
