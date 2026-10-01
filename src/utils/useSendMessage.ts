/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import PageContext from "@/app/(root)/app/PageContext";
import { useCallback, useContext } from "react";
import { parentCount } from "./utils";
import streamSendMessage from "./message";

/** Custom hook to handle sending messages, including file attachments and streaming responses from the model.
 @param setMessage The function to set message to ""
 @param param1 The array containing files and setFiles states.
*/
function useSendMessage(
  setMessage: (message: string) => void,
  [files, setFiles]: uStat<UserFileData[]>,
  setResponding: (value: boolean) => void,
) {
  const {
    userData: {
      chatHistory: [history, setHistory],
      chats: [chats, setChats],
      currentSessionId: [id],
    },
    isDeep: [isDeep],
  } = useContext(PageContext);

  // Use a callback to prevent performance issue.
  return useCallback(
    function sendMessage(message: string, ev?: any) {
      if (!message) return;

      setResponding(true);
      const copied = structuredClone(chats);
      const chat = copied.find((chat) => chat.id == id);
      if (chat && !history.some((val) => val.role == "model")) {
        fetch("/api/chat/name", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            newMessage: message,
            chatId: id,
          }),
        })
          .then((response) => response.text())
          .then((name) => {
            chat.title = name;
            chat.timestamp = Date.now();
            setChats(copied);
          });
      }

      const newMessage: ChatHistory[0] = {
        // New user message
        role: "user",
        index: history.length,
        parts: [
          {
            text: message,
          },
        ],
      };

      // File handleing
      files.forEach((file) => {
        newMessage.parts.push({
          inlineData: {
            mimeType: file.maindata.file.type.replace(
              "application/json",
              "text/plain",
            ),
            data: file.maindata.content,
          },
        });
      });

      // Create a placeholder bot message with a transient 'streaming' flag
      const botPlaceholder: ChatHistory[0] = {
        role: "model",
        index: history.length + 1,
        parts: [
          {
            text: "",
          },
        ],
        streaming: true,
      };

      let chatHistory = structuredClone(history);
      const lastMsg = chatHistory.at(-1);
      if (lastMsg?.error) {
        if (chatHistory.length == 1) {
          chatHistory[chatHistory.length - 1] = newMessage;
          chatHistory.push(botPlaceholder);
        } else {
          chatHistory[chatHistory.length - 2] = newMessage;
          chatHistory[chatHistory.length - 1] = botPlaceholder;
        }
      } else {
        chatHistory = [...history, newMessage, botPlaceholder];
      }
      setHistory(chatHistory);
      setFiles([]);
      setMessage("");

      ev?.nativeEvent?.preventDefault(); // To prevent a newline in message box
      const scroll = chatScroll(ev);
      const { updateFinish, updateText } = updateHistory(setHistory);

      streamSendMessage(
        newMessage,
        id,
        isDeep,
        (text) => updateText(text, scroll),
        updateFinish,
      ).then((error) => {
        setResponding(false);
        if (error) updateFinish(undefined, true);
      });
    },
    [
      chats,
      files,
      history,
      id,
      isDeep,
      setChats,
      setFiles,
      setHistory,
      setMessage,
      setResponding,
    ],
  );
}

export default useSendMessage;

function chatScroll(event: any) {
  const chatbotUi = parentCount(event?.currentTarget, 5)?.querySelector(
    ".chat-body",
  ) as HTMLDivElement;
  if (chatbotUi) {
    setTimeout(
      () =>
        chatbotUi.scrollTo({
          top: chatbotUi.scrollHeight,
          behavior: "smooth",
        }),
      100,
    );
  }
  return function scroll() {
    if (chatbotUi) {
      const threshold = 150;
      const isNearBottom =
        chatbotUi.scrollHeight - chatbotUi.scrollTop - chatbotUi.clientHeight <=
        threshold;
      if (isNearBottom) {
        chatbotUi.scrollTo({
          top: chatbotUi.scrollHeight,
          behavior: "auto",
        });
      }
    }
  };
}

function updateHistory(
  setHistory: (value: (history: ChatHistory) => ChatHistory) => void,
) {
  const updateText = (text: string, scroll?: () => void) =>
    run((last) => {
      last.parts[0].text = text;
      scroll?.();
    });
  const updateFinish = (text?: string, error: boolean = false) =>
    run((last) => {
      if (text) last.parts[0].text = text;
      last.streaming = false;
      last.error = error;
    });
  const run = (query: (last: ChatHistory[0]) => void) =>
    setHistory((prev) => {
      if (prev.length === 0) return prev;
      const next = structuredClone(prev);
      const last = next.at(-1) as ChatHistory[0];
      if (last.role === "model") query(last);
      return next;
    });
  return { updateFinish, updateText };
}
