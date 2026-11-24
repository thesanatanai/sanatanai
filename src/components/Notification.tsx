/* eslint-disable react-hooks/refs */
"use client";
import { useAppStore, type NotificationProps } from "@/stores/appStore";
import { useChatStore } from "@/stores/chatStore";
import { Language, locales } from "@/utils/i18n";
import {
  CheckCircle,
  CircleAlert,
  CircleX,
  Edit,
  EllipsisVertical,
  Search,
} from "lucide-react";
import Lordicon from "./Lordicon";
import { createNewChat, deleteChat } from "@/utils/chatActions";
import useRefManager from "@/utils/useRefManager";
import { initGestures } from "@/utils/gestures";

export const Notification = () => {
  const { isOpen, type, message, isLang, vars } = useAppStore((s) => s.notification);
  return (
    <div
      className={`notification backdrop-blur-[10px] glass-effect ${type}${isOpen ? " active" : ""}`}
    >
      <div className="notification-content">
        <span className="sanatan-symbol">
          {(function () {
            if (type == "success") return <CheckCircle />;
            else if (type == "error") return <CircleX />;
            else return <CircleAlert />;
          })()}
        </span>
        <span>
          {isLang ? (
            message
          ) : (
            <Language need={message as keyof typeof locales.en} vars={vars} />
          )}
        </span>
      </div>
    </div>
  );
};

/** Shows a notification. With `language: true` the message is a translation key. */
function notification(message: keyof typeof locales.en, props?: NotificationProps<true>): void;
function notification(message: string, props?: NotificationProps<false>): void;
function notification(message: string, props?: NotificationProps<boolean>) {
  useAppStore.getState().notify(message, props);
}
export default notification;

/** Returns the function that shows notifications. It never changes between renders. */
export function useNotification() {
  return notification;
}

export function SideMenu() {
  const currentSessionId = useChatStore((s) => s.currentSessionId);
  const sideRef = useRefManager<HTMLDivElement>();
  sideRef.afterAvail((side) => initGestures(side, false, "hide", "btn-toggle"));
  return (
    <>
      <button
        className="chat-options-btn btn-toggle center-flex"
        id="chat-options-btn"
        onClick={(e) =>
          e.currentTarget.parentElement
            ?.querySelector("#chat-options-menu")
            ?.classList.toggle("hide")
        }
      >
        <EllipsisVertical />
      </button>
      <div
        className="chat-options-menu glass-dark hide"
        id="chat-options-menu"
        ref={sideRef.set}
      >
        <button className="chat-options-item" type="button">
          <Search />
          <Language need="search" />
        </button>
        <button
          className="chat-options-item"
          onClick={() => createNewChat()}
          type="button"
        >
          <Edit />
          <Language need="newChat" />
        </button>
        <button className="chat-options-item">
          <Lordicon src="export" target="parent" />
          <Language need="exportChat" />
        </button>
        <button
          className="chat-options-item danger"
          onClick={() => deleteChat(currentSessionId)}
          type="button"
        >
          <Lordicon src="trash" target="parent" />
          <Language need="deleteLabel" />
        </button>
      </div>
    </>
  );
}

export function Err() {
  return (
    <div className="error-content">
      <h3>
        <Language need="sorrySomethingWrong" />
      </h3>
      <br />
      <button className="btn-gradient" onClick={() => globalThis.location?.reload?.()}>
        <Language need="reloadPage" />
      </button>
      <br />
    </div>
  );
}