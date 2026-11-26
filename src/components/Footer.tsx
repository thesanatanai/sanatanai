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
import MagicMenu from "@/utils/MagicMenu";

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
  const textareaRef = useRefManager<HTMLTextAreaElement>();

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
  }, [btnMessage]);

  useEffect(() => {
    textareaRef.afterAvail((textarea) => {
      const handleHeight = () => {
        textarea.style.height = "0"; // reset height
        if (!textarea.value) return;
        textarea.style.height = textarea.scrollHeight + "px";
      };
      textarea.addEventListener("input", handleHeight);
      textarea.addEventListener("change", handleHeight);
      textarea.addEventListener("blur", handleHeight);
      textarea.addEventListener("focus", handleHeight);
    });
  }, []);

  // Use custom React hook for handling message recordings.
  const { listening, toggle, supported } = useStartRecording(setUserMessage);
  return (
    <div className="chat-footer center-flex">
      <div className="relative w-full max-w-230 flex justify-center gap-4 items-end">
        <button
          className="bg-(--glass-bg) rounded-full p-2 center-flex w-11 h-11 text-xl backdrop-blur-md transition duration-500 rotate-45 hover:rotate-135 add-btn"
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
          <input
            type="file"
            name="file"
            id="file-input"
            ref={fileRef.set}
            onChange={handleInput}
            hidden
          />

          <textarea
            name="message"
            id="message"
            className="capsule-input p-[unset] h-0"
            value={userMessage}
            ref={textareaRef.set}
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
        </div>
        {supported && !userMessage && (
          <button
            aria-label={t("voice")}
            onClick={() => toggle()}
            className="bg-(--glass-bg) rounded-full p-2 center-flex w-11 h-11 text-xl backdrop-blur-md"
          >
            <Lordicon
              size={24}
              target="parent"
              src={listening ? "pause" : "mic"}
            />
          </button>
        )}
        {userMessage && (
          <button
            className="bg-(--glass-bg) rounded-full p-2 center-flex w-11 h-11 text-xl backdrop-blur-md"
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
