/* eslint-disable @typescript-eslint/no-unused-vars */
type theme = "dark" | "light";
type uStat<K> = [K, (val: K | ((value: K) => K)) => void];

interface NavigateOptions {
  scroll?: boolean;
  transitionTypes?: string[];
}

interface AllProps {
  theme: uStat<theme>;
  userData: {
    language: uStat<"en" | "hi">;
    name: uStat<string>;
    email: uStat<string>;
    picture: uStat<string>;
    mainTheme: uStat<theme | "auto">;
  };
  notification: {
    message: uStat<string>;
    type: uStat<"info" | "success" | "error">;
    isOpen: uStat<boolean>;
    isLang: uStat<boolean>;
    vars: uStat<Record<string, string>>;
  };
}

type UserFileData = {
  maindata: {
    file: File;
    type: string;
    content: string;
  };
  filename: string;
  isImage: boolean;
  wholeData: string;
};

type ChatHistory = {
  role: "model" | "user";
  index: number;
  streaming?: boolean;
  error?: boolean;
  parts: {
    inlineData?: {
      data: string,
      mimeType: string
    },
    text?: string,
    functionResponse?: unknown
  }[];
}[];

interface PageContextProps {
  isDeep: uStat<boolean>;
  settingsOpen: uStat<boolean>;
  isPC: boolean;
  historyLoading: uStat<boolean>;
  userData: {
    chatHistory: uStat<ChatHistory>;
    persona: uStat<string>;
    chats: uStat<Chats>;
    currentSessionId: uStat<string>
  };
}

type Chats = {
  id: string,
  title: string,
  timestamp: number;
  index: number;
}[];

type fullChat = Chats[0] & {
  messages: ChatHistory
}