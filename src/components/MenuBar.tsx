"use client";
import { useAppStore } from "@/stores/appStore";
import { useChatStore } from "@/stores/chatStore";
import { Fragment, useEffect, useMemo } from "react";
import Lordicon from "./Lordicon";
import { Language, useT } from "@/utils/i18n";
import useRefManager from "@/utils/useRefManager";
import { Menu } from "lucide-react";
import { initGestures } from "@/utils/gestures";
import { deleteChat } from "@/utils/chatActions";
import Image from "next/image";

const MenuBar = () => {
  const src = useAppStore((s) => s.picture);
  const name = useAppStore((s) => s.name);
  const setShow = useChatStore((s) => s.setSettingsOpen);
  const chats = useChatStore((s) => s.chats);
  const sessionId = useChatStore((s) => s.currentSessionId);
  const setSessionId = useChatStore((s) => s.setCurrentSessionId);
  const t = useT();
  const menuRef = useRefManager<HTMLDivElement>();
  const chatSections = useMemo(() => chatList(chats, sessionId, setSessionId), [chats, sessionId, setSessionId]);

  useEffect(() => {
    return menuRef.afterAvail(initGestures);
  });

  return (
    <>
      <button
        className="menuopen center-flex"
        onClick={() => toggleMenu(menuRef)}
      >
        <Menu />
      </button>
      {/*eslint-disable-next-line react-hooks/refs*/}
      <div ref={menuRef.set} className="menuBar makeSmall">
        <div className="chat-i center-flex actions col">
          <div id="chat-list" className="chat-list col">
            {chatSections}
          </div>
        </div>
        <div className="footer col center-flex actions">
          <button
            className="profile-section center-flex"
            onClick={() => setShow(true)}
            onKeyDown={() => setShow(true)}
          >
            <Image
              width={50}
              height={50}
              unoptimized
              src={src || "user.png"}
              alt="User's Profile"
              className="profile-img w-11.25 h-11.25"
            />
            <div className="profile-info">
              <span id="user-name-display" className="user-name font-display">
                {name}
              </span>
            </div>
          </button>
          <div className="row gap-2">
            <button
              className="action center-flex text-sm"
              aria-label={t("searchGeetaTooltip")}
              onClick={() =>
                window.open(
                  "https://shivamsharma999.github.io/gita",
                  "_self",
                  "noopener",
                )
              }
            >
              <Lordicon src="gita" target="parent" trigger="hover" />
            </button>
            <button
              className="action center-flex text-sm"
              aria-label={t("calendarTooltip")}
              onClick={() =>
                window.open(
                  "https://calendar.shivam.click",
                  "_self",
                  "noopener",
                )
              }
            >
              <Lordicon src="calendar" target="parent" trigger="hover" />
            </button>
          </div>
        </div>
      </div>
    </>
  );
};
export function toggleMenu(
  menuRef: ReturnType<typeof useRefManager<HTMLDivElement>>,
) {
  menuRef.afterAvail((m) => m.classList.toggle("makeSmall"));
}

function chatList(
  chats: Chats,
  activeSessionId: string,
  setSessionId: (id: string) => void,
) {
  const groups: Record<string, Chats> = {
    today: [],
    yesterday: [],
    last7days: [],
    older: [],
  };

  const now = new Date();
  const today = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate(),
  ).getTime();
  const yesterday = new Date(today - 864 * 10 ** 5).getTime();
  const last7Days = new Date(today - 864 * 10 ** 5 * 7).getTime();

  chats.forEach((session) => {
    if (session.timestamp >= today) {
      groups.today.push(session);
    } else if (session.timestamp >= yesterday) {
      groups.yesterday.push(session);
    } else if (session.timestamp >= last7Days) {
      groups.last7days.push(session);
    } else {
      groups.older.push(session);
    }
  });

  return Object.keys(groups).map((group) => {
    const Chats = listSessions(groups[group], activeSessionId, setSessionId);
    const isToday = group == "today" ? "historyToday" : null;
    const isYesterday = group == "yesterday" ? "historyYesterday" : null;
    const lastDays = group == "last7days" ? "historyLast7Days" : null;
    const groupName = isToday || isYesterday || lastDays || "historyOlder";
    return (
      <Fragment key={group}>
        {Chats?.length ? (
          <>
            <div className="pt-2.5 pb-2.5 pl-3.75 mt-2.5 text-[0.8rem] pr-3.75 text-(--subheading-color) font-semibold uppercase chat-group-header">
              <Language need={groupName} />
            </div>
            {Chats}
          </>
        ) : (
          ""
        )}
      </Fragment>
    );
  });
}

const listSessions = (
  sessions: Chats,
  activeSessionId: string,
  setSessionId: (id: string) => void,
) => {
  const sorted = sessions.toSorted((a, b) => b.timestamp - a.timestamp);
  return sorted.map(({ id, title }) => {
    const sessionId = id; // For preventing function values
    return (
      <div
        className={`chat-item center-flex${sessionId == activeSessionId ? " active" : ""}`}
        key={sessionId}
        onClick={() => setSessionId(sessionId)}
        onKeyDown={() => setSessionId(sessionId)}
      >
        <span className="chat-title">{title}</span>
        <button
          className="delete-chat"
          onClick={(e) => {
            e.stopPropagation();
            void deleteChat(sessionId);
          }}
        >
          <Lordicon src="trash" target="parent" size={24} />
        </button>
      </div>
    );
  });
}
export default MenuBar;
