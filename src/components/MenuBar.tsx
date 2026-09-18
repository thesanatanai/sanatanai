"use client";
import { All } from "@/app/(root)/AllContext";
import { Fragment, useContext, useEffect, useMemo } from "react";
import Lordicon from "./Lordicon";
import { useT } from "@/utils/i18n";
import useRefManager from "@/utils/useRefManager";
import { Menu } from "lucide-react";
import { initGestures } from "@/utils/gestures";
import PageContext from "@/app/(root)/PageContext";
import { deleteChat } from "@/utils/chatActions";
import Image from "next/image";

const MenuBar = () => {
  const {
    userData: {
      picture: [src],
      name: [name],
    },
  } = useContext(All);
  const {
    settingsOpen: [, setShow],
    userData: {
      chats: [chats, setChats],
      currentSessionId: [sessionId, setSessionId],
    },
  } = useContext(PageContext);
  const t = useT();
  const menuRef = useRefManager<HTMLDivElement>();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const chatSections = useMemo(() => chatList([chats, setChats], [sessionId, setSessionId]), [chats, sessionId]);

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
              data-label={t("searchGeetaTooltip")}
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
              data-label={t("calendarTooltip")}
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
  [chats, setChats]: uStat<Chats>,
  [activeSessionId, setSessionId]: uStat<string>,
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
    const Chats = listSettions(
      [groups[group], setChats],
      [activeSessionId, setSessionId],
    );
    return (
      <Fragment key={group}>
        {Chats?.length ? (
          <>
            <div className="pt-2.5 pb-2.5 pl-3.75 mt-2.5 text-[0.8rem] pr-3.75 text-(--subheading-color) font-semibold uppercase chat-group-header">
              {(group[0].toUpperCase() + group.slice(1)).replace("7", " ")}
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

const listSettions = (
  [sessions, setSessions]: uStat<Chats>,
  [activeSessionId, setSessionId]: uStat<string>,
) =>
  sessions.map(({ id, title }) => {
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
            deleteChat(
              [setSessions, activeSessionId],
              [sessionId, setSessionId],
            );
          }}
        >
          <Lordicon src="trash" target="parent" size={24} />
        </button>
      </div>
    );
  });
export default MenuBar;
