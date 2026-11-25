"use client";
/*eslint-disable react-hooks/refs*/
import { useMemo, useState, useEffect } from "react";
import Lordicon from "./Lordicon";
import useRefManager from "@/utils/useRefManager";
import { useT } from "@/utils/i18n";
import typed from "@/utils/typed";
import { useChatStore } from "@/stores/chatStore";
import { initGestures } from "@/utils/gestures";
import useFileManager, { useStartRecording } from "@/utils/useFileManager";
import useSendMessage from "@/utils/useSendMessage";
import MagicMenu from "@/utils/enhancePrompt";

export default function Footer() {
  // Default context values for the footer component, including deep thinking mode and file management.
  const isPC = useChatStore((s) => s.isPC);
  const btnMessage = useChatStore((s) => s.btnMessage);
  const setBtnMessage = useChatStore((s) => s.setBtnMessage);
  const [files, setFiles] = useState<UserFileData[]>([]);

  // Custom hook to manage file uploads and previews.
  const { handleInput, FilePreview } = useFileManager([files, setFiles]);
  const t = useT();
  const fileRef = useRefManager<HTMLInputElement>();
  const menuRef = useRefManager<HTMLDivElement>();

  // Initialize gesture controls for the magic menu, allowing it to be hidden or closed with gestures.
  menuRef.afterAvail((menu) => initGestures(menu, false, "hide", "add-btn"));

  const placeHolders = useMemo(() => t("samplePrompts") as string[], [t]);
  const [placeHolder, setPlaceHolder] = useState("");
  const [userMessage, setUserMessage] = useState("");
  const [responding, setResponding] = useState(false);
  const sendMessage = useSendMessage(
    setUserMessage,
    [files, setFiles],
    setResponding,
  );
  useEffect(() => typed(placeHolders, setPlaceHolder), [placeHolders]);

  useEffect(() => {
    if (!btnMessage) return;
    sendMessage(btnMessage);
    setBtnMessage(false);
  });

  // Use custom React hook for handling message recordings.
  const { listening, toggle, supported } = useStartRecording(setUserMessage);
  return (
    <div className="chat-footer center-flex">
      <div className="relative w-full flex justify-around">
        <button
          className="bg-(--glass-bg) rounded-full p-2 center-flex w-11 h-11 text-xl rotate-45 add-btn"
          onClick={() =>
            menuRef.afterAvail((menu) => menu.classList.remove("hide"))
          }
        >
          ✕
        </button>
        <MagicMenu
          message={userMessage}
          setMessage={setUserMessage}
          menuRef={menuRef}
          fileRef={fileRef}
        />
        <div
          className="chat-capsule w-4/5! p-0!"
          onClick={() =>
            menuRef.afterAvail((menu) => menu.classList.toggle("hide"))
          }
        >
          <FilePreview />

          <div className="capsule-content">
            <textarea
              name="message"
              id="message"
              className="capsule-input h-11.75! p-[unset]"
              value={userMessage}
              placeholder={placeHolder}
              onChange={(e) => setUserMessage(e.target.value)}
              onKeyDown={(e) => {
                if (e.key == "Enter" && (e.ctrlKey || (isPC && !e.shiftKey)))
                  return sendMessage(userMessage, {
                    ...e,
                    currentTarget: document.querySelector(".send-btn-capsule"),
                  });
              }}
            ></textarea>

            <div className="capsule-controls">
              <input
                type="file"
                name="file"
                id="file-input"
                ref={fileRef.set}
                onChange={handleInput}
                hidden
              />
            </div>
          </div>
        </div>
        {supported && !userMessage && (
          <button aria-label={t("voice")} onClick={() => toggle()} className="bg-(--glass-bg) rounded-full p-2 center-flex w-11 h-11">
            <Lordicon
              size={24}
              target="parent"
              src={listening ? "pause" : "mic"}
            />
          </button>
        )}
        {userMessage && (
          <button
            className="bg-(--glass-bg) rounded-full p-2 center-flex w-11 h-11"
            onClick={(e) => sendMessage(userMessage, e)}
            disabled={responding}
          >
            <Lordicon target="parent" size={24} src="plane" />
          </button>
        )}
      </div>
    </div>
  );
}
