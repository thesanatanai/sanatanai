/* eslint-disable react-hooks/refs */
import Lordicon from "@/components/Lordicon"
import { RefManger } from "./useRefManager"
import { Language } from "./i18n"
import { useNotification } from "@/components/Notification"

export default function EnhancePrompt({message, setMessage, menuRef}: {
    message: string,
    setMessage: (text: string) => void,
    menuRef: RefManger
}) {
    const enhance = useEnhance(message, setMessage);
    return (
    <div className={`hide glass-dark popover-menu`} ref={menuRef.set}>
      <button className="menu-item" onClick={enhance}>
        <Lordicon src="magic" />
        <Language need="enhancePrompt" />
      </button>
    </div>
    )
}

function useEnhance(message: string, setMessage: (text: string) => void) {
    const notification = useNotification<true>();
    return async function enhance() {
        try {
        if(!message) return notification("pleaseEnterTextToEnhance", {
           type: "error" 
        });
        const enhanced = await fetch("api/chat/v2", {
            method: "POST",
            body: JSON.stringify({
                newMessage: message
            })
        }).then(response => response.text());
        return setMessage(enhanced);
    } catch {
        notification("sorrySomethingWrong", {
            language: true
        })
    }
    }
}