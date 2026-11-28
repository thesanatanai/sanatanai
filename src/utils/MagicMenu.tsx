/* eslint-disable react-hooks/refs */
import Lordicon from "@/components/Lordicon";
import { RefManger } from "./useRefManager";
import { Language } from "./i18n";
import { useNotification } from "@/components/Notification";
import { useState } from "react";
import { useChatStore } from "@/stores/chatStore";
import { enhanceMessage } from "./api";

export default function MagicMenu({
  message,
  setMessage,
  menuRef,
  fileRef,
}: Readonly<{
  message: string;
  setMessage: (text: string) => void;
  menuRef: RefManger;
  fileRef: RefManger;
}>) {
  const isDeep = useChatStore((s) => s.isDeep);
  const setDeep = useChatStore((s) => s.setIsDeep);
  const [isEnhancing, setIsEnhancing] = useState(false);
  const enhance = useEnhance(message, setMessage, setIsEnhancing);
  return (
    <div className={`hide glass-dark popover-menu`} ref={menuRef.set}>
      <button className="menu-item" onClick={isEnhancing ? undefined : enhance}>
        <Lordicon
          trigger={isEnhancing ? "loop" : undefined}
          target="parent"
          src={isEnhancing ? "loop" : "magic"}
        />
        <Language need={isEnhancing ? "enhancingPrompt" : "enhancePrompt"} />
      </button>
      <button
        className="menu-item"
        onClick={() => fileRef.afterAvail((i) => i.click())}
      >
        <Lordicon size={24} src="file" target="parent" />
        <Language need="uploadFile" />
      </button>
      <button
        className={`menu-item deepThink${isDeep ? " selected" : ""}`}
        onClick={() => setDeep(!isDeep)}
      >
        <Lordicon size={24} target="parent" src="brain" />
        <Language need="deepThink" />
      </button>
    </div>
  );
}

function useEnhance(
  message: string,
  setMessage: (text: string) => void,
  setIsEnhancing: (value: boolean) => void,
) {
  const notification = useNotification();
  return async function enhance() {
    try {
      setIsEnhancing(true);
      if (!message) {
        setIsEnhancing(false);
        return notification("pleaseEnterTextToEnhance", {
          language: true,
          type: "error",
        });
      }
      const { message: enhanced } = await enhanceMessage(message);
      setIsEnhancing(false);
      return setMessage(enhanced);
    } catch {
      setIsEnhancing(false);
      notification("failedToEnhancePrompt", {
        language: true,
        type: "error",
      });
    }
  };
}
