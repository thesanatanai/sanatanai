import { create } from "zustand";
import { resolve, type Updater } from "./updater";

interface ChatState {
  isDeep: boolean;
  settingsOpen: boolean;
  /** True on a landscape (desktop-like) window. Measured when the chat page opens. */
  isPC: boolean;
  historyLoading: boolean;
  chatHistory: ChatHistory;
  /** A message a chat button asked to send, or false when there is none. */
  btnMessage: string | false;
  persona: string;
  chats: Chats;
  currentSessionId: string;

  /** Fills the store with what the server loaded and resets everything else. */
  initialize: (initial: { chats: Chats; currentSessionId: string; chatHistory: ChatHistory }) => void;
  setIsDeep: (value: Updater<boolean>) => void;
  setSettingsOpen: (value: Updater<boolean>) => void;
  setHistoryLoading: (value: Updater<boolean>) => void;
  setChatHistory: (value: Updater<ChatHistory>) => void;
  setBtnMessage: (value: string | false) => void;
  /** Also saves the persona in the browser. */
  setPersona: (value: Updater<string>) => void;
  setChats: (value: Updater<Chats>) => void;
  /** Opens another chat and loads its messages. */
  setCurrentSessionId: (id: string) => void;
  loadChat: (id: string) => Promise<void>;
}

const defaults = {
  isDeep: false,
  settingsOpen: false,
  isPC: false,
  historyLoading: false,
  chatHistory: [] as ChatHistory,
  btnMessage: false as string | false,
  persona: "",
  chats: [] as Chats,
  currentSessionId: "",
};

export const useChatStore = create<ChatState>()((set, get) => ({
  ...defaults,

  initialize: ({ chats, currentSessionId, chatHistory }) =>
    set({
      ...defaults,
      chats,
      currentSessionId,
      chatHistory,
      persona: localStorage.getItem("persona") || "",
      isPC: window.innerWidth / window.innerHeight > 1,
    }),

  setIsDeep: (value) => set((s) => ({ isDeep: resolve(value, s.isDeep) })),
  setSettingsOpen: (value) => set((s) => ({ settingsOpen: resolve(value, s.settingsOpen) })),
  setHistoryLoading: (value) => set((s) => ({ historyLoading: resolve(value, s.historyLoading) })),
  setChatHistory: (value) => set((s) => ({ chatHistory: resolve(value, s.chatHistory) })),
  setBtnMessage: (value) => set({ btnMessage: value }),
  setPersona: (value) => {
    const persona = resolve(value, get().persona);
    localStorage.setItem("persona", persona);
    set({ persona });
  },
  setChats: (value) => set((s) => ({ chats: resolve(value, s.chats) })),

  setCurrentSessionId: (id) => {
    if (get().currentSessionId === id) return;
    set({ currentSessionId: id });
    void get().loadChat(id);
  },

  loadChat: async (id) => {
    set({ historyLoading: true });
    const chat: fullChat = await fetch("api/chats/" + id).then((res) => res.json());
    set((s) => {
      const idx = s.chats.findIndex((c) => c.id == id);
      let chats = s.chats;
      if (idx >= 0) {
        chats = structuredClone(s.chats);
        chats[idx].timestamp = chat.timestamp;
        chats[idx].title = chat.title;
      }
      return { chatHistory: chat.messages, historyLoading: false, chats };
    });
  },
}));
