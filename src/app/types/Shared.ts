/* eslint-disable @typescript-eslint/no-unused-vars */
type theme = "dark" | "light";
type uStat<K> = [K, (val: K | ((value: K) => K)) => void];

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
  }[];
}[];

type Chats = {
  id: string,
  title: string,
  timestamp: number;
  index: number;
}[];

type fullChat = Chats[0] & {
  messages: ChatHistory
}

type TimelineRaw = {
  time?: string;
  heading?: string;
  text?: string;
  index: number;
}[]