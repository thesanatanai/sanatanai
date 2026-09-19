"use client";
/*eslint-disable react-hooks/refs*/
import { useContext, useMemo, useState, useEffect } from "react";
import Lordicon from "./Lordicon";
import useRefManager from "@/utils/useRefManager";
import { useT } from "@/utils/i18n";
import typed from "@/utils/typed";
import useFileManager from "@/utils/useFileManager";
import PageContext from "@/app/(root)/PageContext";
import { initGestures } from "@/utils/gestures";
import { useStartRecording } from "@/utils/useFileManager";
import useSendMessage from "@/utils/useSendMessage";
import EnhancePrompt from "@/utils/enhancePrompt";

export default function Footer() {
  // Default context values for the footer component, including deep thinking mode and file management.
  const {
    isDeep: [isDeep, setDeep],
    isPC,
  } = useContext(PageContext);
  const [files, setFiles] = useState<UserFileData[]>([]);

  // Custom hook to manage file uploads and previews.
  const { handleInput, FilePreview } = useFileManager([files, setFiles]);
  const t = useT();
  const fileRef = useRefManager<HTMLInputElement>();
  const menuRef = useRefManager<HTMLDivElement>();

  // Initialize gesture controls for the magic menu, allowing it to be hidden or closed with gestures.
  menuRef.afterAvail((menu) =>
    initGestures(menu, false, "hide", "close-magic"),
  );

  const placeHolders = useMemo(() => t("samplePrompts") as string[], [t]);
  const [placeHolder, setPlaceHolder] = useState("");
  const [userMessage, setUserMessage] = useState("");
  const sendMessage = useSendMessage(setUserMessage, [files, setFiles]);
  useEffect(() => typed(placeHolders, setPlaceHolder), [placeHolders]);

  // Use custom React hook for handleing message recordings.
  const { listening, toggle, supported } = useStartRecording(setUserMessage);
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
            onKeyDown={(e) => {
              if (e.key == "Enter" && (e.ctrlKey || (isPC && !e.shiftKey)))
                return sendMessage(userMessage, {
                  ...e,
                  currentTarget: document.querySelector(".send-btn-capsule"),
                });
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
              <Lordicon size={24} src="magic" target="parent" trigger="hover" />
            </button>

            <EnhancePrompt message={userMessage} setMessage={setUserMessage} menuRef={menuRef} />

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

            {supported && (
              <button
                className="capsule-action-btn"
                data-label={t("voice")}
                onClick={() => toggle()}
              >
                <Lordicon
                  size={24}
                  target="parent"
                  src={listening ? "pause" : "mic"}
                />
              </button>
            )}

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
