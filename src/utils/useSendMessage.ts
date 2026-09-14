"use client";

import PageContext from "@/app/(root)/PageContext";
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
) {
  const {
    userData: {
      chatHistory: [history, setHistory],
      currentSessionId: [id],
    },
    isDeep: [isDeep],
  } = useContext(PageContext);

  // Use a callback to prevent performance issue.
  return useCallback(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    function sendMessage(message: string, ev?: any) {
      if (!message) return;

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

      const chatbotUi = parentCount(ev?.currentTarget, 5).querySelector(
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

      streamSendMessage(
        newMessage,
        id,
        isDeep,
        (text) => {
          setHistory((prev: ChatHistory) => {
            if (prev.length === 0) return prev;
            const next = structuredClone(prev);
            const last = next.at(-1) as ChatHistory[0];
            if (last.role === "model") {
              last.parts[0].text = text;
            }
            return next;
          });

          if (chatbotUi) {
            const threshold = 150;
            const isNearBottom =
              chatbotUi.scrollHeight -
                chatbotUi.scrollTop -
                chatbotUi.clientHeight <=
              threshold;
            if (isNearBottom) {
              chatbotUi.scrollTo({
                top: chatbotUi.scrollHeight,
                behavior: "auto",
              });
            }
          }
        },
        () => {
          setHistory((prev) => {
            if (prev.length === 0) return prev;
            const next = structuredClone(prev);
            const last = next.at(-1) as ChatHistory[0];
            if (last.role === "model") {
              delete last.streaming;
              next[next.length - 1] = last;
            }
            return next;
          });
        },
      ).then((err) =>
        err
          ? setHistory((prev) => {
              if (prev.length === 0) return prev;
              const next = structuredClone(prev);
              const last = next.at(-1) as ChatHistory[0];
              if (last.role === "model") {
                delete last.streaming;
                last.error = true;
              }
              return next;
            })
          : "",
      );
    },
    [files, history, id, isDeep, setFiles, setHistory, setMessage],
  );
}

export default useSendMessage;
