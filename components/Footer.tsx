"use client";
/*eslint-disable react-hooks/refs*/
import React, {
  useCallback,
  useContext,
  useMemo,
  useState,
  useEffect,
} from "react";
import Lordicon from "./Lordicon";
import refManager from "@/utils/useRefManager";
import { Language, useT } from "@/utils/i18n";
import typed from "@/utils/typed";
import useFileManager from "@/utils/useFileManager";
import PageContext from "@/app/(root)/PageContext";
import { parentCount } from "@/utils/utils";
import { sendMessage as streamSendMessage } from "@/utils/message";
import { initGestures } from "@/utils/gestures";

export default function Footer() {
  const {
    isDeep: [isDeep, setDeep],
    isPC
  } = useContext(PageContext);
  const [files, setFiles] = useState<UserFileData[]>([]);

  const { handleInput, FilePreview } = useFileManager([files, setFiles]);
  const t = useT();
  const fileRef = useMemo(() => refManager<HTMLInputElement>(), []);
  const menuRef = useMemo(() => refManager<HTMLDivElement>(), []);
  menuRef.afterAvail(menu => initGestures(menu, false, "hide", "close-magic"))
  const placeHolders = useMemo(() => t("samplePrompts") as string[], [t]);
  const [placeHolder, setPlaceHolder] = useState("");
  const [userMessage, setUserMessage] = useState("");
  const sendMessage = useSendMessage(setUserMessage, [files, setFiles]);
  useEffect(() => typed(placeHolders, setPlaceHolder), [placeHolders]);
  return (
    <div className="chat-footer center-flex">
      <div className="chat-capsule glass-panel">
        <FilePreview />
        <div className="capsule-content">
          <textarea
            name="message"
            id="message"
            className="messsage-input capsule-input"
            value={userMessage}
            placeholder={placeHolder}
            onChange={(e) => setUserMessage(e.target.value)}
            onKeyDown={e => {
              if(e.key == "Enter" && (e.ctrlKey || (isPC && !e.shiftKey))) return sendMessage(userMessage, { currentTarget: document.querySelector(".send-btn-capsule") });
            }}
          ></textarea>
          <div className="capsule-controls">
            <button
              className="capsule-action-btn close-magic"
              data-label={t("aiTools")}
              onClick={() =>
                menuRef.afterAvail((menu) => menu.classList.toggle("hide"))
              }
            >
              <Lordicon
                size={24}
                src="magic"
                target="parent"
                trigger="hover"
              />
            </button>
            <MagicMenu ref={menuRef} />
            <button
              className="capsule-action-btn"
              onClick={() => fileRef.afterAvail((i) => i.click())}
              data-label={t("uploadFile")}
            >
              <Lordicon size={24} src="file" target="parent" />
            </button>
            <input
              type="file"
              name="file"
              id="file-input"
              ref={fileRef.set}
              onChange={handleInput}
              hidden
            />
            <button
              className={`capsule-action-btn deepThink${isDeep ? " selected" : ""}`}
              onClick={() => setDeep(!isDeep)}
              data-label={t("deepThink")}
            >
              <Lordicon size={24} target="parent" src="brain" />
            </button>
            <button className="capsule-action-btn" data-label={t("voice")}>
              <Lordicon size={24} target="parent" src="mic" />
            </button>
            <button
              className="send-btn-capsule"
              style={{
                width: userMessage ? 40 : 0,
                height: userMessage ? 40 : 0,
                transition: "all 0.2s linear",
              }}
              onClick={(e) => sendMessage(userMessage, e)}
            >
              <Lordicon target="parent" size={24} src="plane" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

const MagicMenu = React.memo(function MagicMenu({
  ref,
}: {
  ref: ReturnType<typeof refManager>;
}) {
  return (
    <div className={`hide glass-dark popover-menu`} ref={ref.set}>
      <button className="menu-item">
        <Lordicon src="magic" />
        <Language need="enhancePrompt" />
      </button>
    </div>
  );
});

function useSendMessage(
  setMessage: (message: string) => void,
  [files, setFiles]: uStat<UserFileData[]>,
) {
  const {
    chatHistory: [history, setHistory],
    currentSessionId: [id],
  } = useContext(PageContext).userData;

  return useCallback(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    function sendMessage(message: string, ev?: any) {
      if (!message) return;

      const newMessage: ChatHistory[0] = {
        role: "user",
        index: history.length,
        parts: [
          {
            text: message,
          },
        ],
      };

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
        streaming: true
      };

      const newHistory = [...history, newMessage, botPlaceholder];
      setHistory(newHistory);
      setFiles([]);
      setMessage("");

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
        (text) => {
          setHistory((prev: ChatHistory) => {
            if (prev.length === 0) return prev;
            const next = structuredClone(prev);
            const last = next.at(-1) as ChatHistory[0];
            if (last.role === "model") {
              last.parts[0].text = text
            }
            return next;
          });

          if (chatbotUi) {
            const threshold = 150;
            const isNearBottom =
              chatbotUi.scrollHeight - chatbotUi.scrollTop - chatbotUi.clientHeight <= threshold;
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
        }
      ).then(err => err ? setHistory(prev => {
        if (prev.length === 0) return prev;
        const next = structuredClone(prev);
           const last = next.at(-1) as ChatHistory[0];
            if (last.role === "model") {
              delete last.streaming;
              last.error = true;
            }
            return next;
      }) : "");
    },
    [files, history, id, setFiles, setHistory, setMessage],
  );
}
