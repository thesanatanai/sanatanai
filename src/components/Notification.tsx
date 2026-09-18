/* eslint-disable react-hooks/refs */
"use client";
import { All } from "@/app/(root)/AllContext";
import { Language, locales } from "@/utils/i18n";
import {
  CheckCircle,
  CircleAlert,
  CircleX,
  Edit,
  EllipsisVertical,
  Search,
} from "lucide-react";
import { useContext } from "react";
import Lordicon from "./Lordicon";
import PageContext from "@/app/(root)/PageContext";
import { createNewChat, deleteChat } from "@/utils/chatActions";
import useRefManager from "@/utils/useRefManager";
import { initGestures } from "@/utils/gestures";

export const Notification = () => {
  const {
    isOpen: [isOpen],
    type: [type],
    message: [message],
    isLang: [isLang],
    vars: [vars],
  } = useContext(All).notification;
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

interface NotificationProps<K extends boolean> {
  language?: K;
  vars?: Record<string, string>;
  type?: "info" | "success" | "error";
}
export default function notification<K extends boolean>(
  message: K extends true ? keyof typeof locales.en : string,
  instance: AllProps["notification"],
  props?: NotificationProps<K>,
) {
  const {
    isOpen: [isOpen, setIsOpen],
    message: [, setMessage],
    type: [, setType],
    vars: [, setVars],
  } = instance;
  if (isOpen) setIsOpen(false);
  setType(props?.type || "info");
  setVars(props?.vars || {});
  setMessage(message);
  setTimeout(() => setIsOpen(true), 500);
  setTimeout(() => setIsOpen(false), 3500);
}

export function useNotification<K extends boolean>() {
  const instance = useContext(All).notification;
  return function send(
    message: K extends true ? keyof typeof locales.en : string,
    props?: NotificationProps<K>,
  ) {
    notification(message, instance, props);
  };
}

export function SideMenu() {
  const { chats, currentSessionId } = useContext(PageContext).userData;
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
          onClick={() => createNewChat(currentSessionId[1], chats[1])}
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
          onClick={() =>
            deleteChat([chats[1], currentSessionId[0]], currentSessionId)
          }
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