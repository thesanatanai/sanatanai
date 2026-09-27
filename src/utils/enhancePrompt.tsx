/* eslint-disable react-hooks/refs */
import Lordicon from "@/components/Lordicon"
import { RefManger } from "./useRefManager"
import { Language } from "./i18n"
import { useNotification } from "@/components/Notification"
import { useState } from "react"

export default function EnhancePrompt({message, setMessage, menuRef}: Readonly<{
    message: string,
    setMessage: (text: string) => void,
    menuRef: RefManger
}>) {
    const [isEnhancing, setIsEnhancing] = useState(false);
    const enhance = useEnhance(message, setMessage, setIsEnhancing);
    return (
    <div className={`hide glass-dark popover-menu`} ref={menuRef.set}>
      <button className="menu-item" onClick={isEnhancing ? undefined : enhance}>
        <Lordicon trigger={isEnhancing ? "loop" : undefined} target="parent" src={isEnhancing ? "loop" : "magic"} />
        <Language need={isEnhancing ? "enhancingPrompt" : "enhancePrompt"} />
      </button>
    </div>
    )
}

function useEnhance(message: string, setMessage: (text: string) => void, setIsEnhancing: (value: boolean) => void) {
    const notification = useNotification<true>();
    return async function enhance() {
        try {
        setIsEnhancing(true);
        if(!message) {
            setIsEnhancing(false);
            return notification("pleaseEnterTextToEnhance", {
           type: "error" 
        });
    }
        const enhanced = await fetch("api/chat/v2", {
            method: "POST",
            body: JSON.stringify({
                newMessage: message
            })
        }).then(response => response.text());
        try {
            const json = JSON.parse(enhanced);
            if(json.error) {
                setIsEnhancing(false);
                return notification("failedToEnhancePrompt", {
                    type: "error",
                    language: true
                });
            }
        } catch {}
        setIsEnhancing(false)
        return setMessage(enhanced);
    } catch {
        setIsEnhancing(false)
        notification("failedToEnhancePrompt", {
            language: true
        })
    }
    }
}