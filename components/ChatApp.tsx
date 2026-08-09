"use client";
import { All } from "@/app/(root)/AllContext";
import React from "react";
import Lordicon from "./Lordicon";
import Image from "next/image";
import Markdown from "@/utils/md";
import { Language, useT } from "@/utils/i18n";
import PageContext from "@/app/(root)/PageContext";
import { FileText } from "lucide-react";
import { useDeleteMessage } from "@/utils/chatActions";
import { copyListener, sign } from "@/utils/utils";
import { Err } from "./Notification";
import Messages from "./skeletons/Messages";

sign();

const ChatApp = () => {
  const history = React.useContext(PageContext).userData.chatHistory[0];
  return history?.length ? (
    <>
      <div className="chat-body col h-full">
        <FormatChat history={history} />
      </div>
      <ScrollBtn />
    </>
  ) : (
    <Home />
  );
};

// Chat Item
interface ChatItemProps {
  chat: ChatHistory[0];
  isPC: boolean;
  index: number;
}
const ChatItem: React.FC<ChatItemProps> = React.memo(
  ({ chat, isPC, index }) => {
    const deleteMessage = useDeleteMessage();
    if (chat.role == "user") {
      const text = chat.parts.map((part) => part.text).join("");
      if (!text) return "";

      return (
        <div className="user-message col">
          <div className="message-text">{text}</div>
          {chat.parts.map((part, i) => {
            if (part.inlineData) {
              const mimeType = part.inlineData.mimeType;
              const data = part.inlineData.data;
              if (mimeType.startsWith("image/")) {
                return (
                  <div className="items-end justify-end" key={i}>
                    {/*eslint-disable-next-line @next/next/no-img-element*/}
                    <img
                      src={`data:${mimeType};base64,${data}`}
                      alt=""
                      className="attachment"
                    />
                  </div>
                );
              } else {
                return (
                  <p className="file-attachment" key={i}>
                    <span className="sanatan-symbol">
                      <FileText />
                    </span>
                  </p>
                );
              }
            }
          })}
          <p className="flex gap-2">
            <button
              className="icon"
              onClick={e => copyListener(e, chat.parts.map((x) => x.text).join(""))}
            >
              <Lordicon size={25} src="copy" />
            </button>
            <button className="icon">
              <Lordicon size={25} src="edit" />
            </button>
            <button className="icon">
              <Lordicon size={25} src="regenerate" />
            </button>
            <button onClick={() => deleteMessage(index)} className="icon">
              <Lordicon size={25} src="trash" />
            </button>
          </p>
        </div>
      );
    } else {
      const text = chat.parts.map((part) => part.text || "").join("");
      const isStreaming = chat.streaming;
      if (!text && !isStreaming) return "";
      const isError = chat.error;
      return (
        <div className="bot-message message **:text-(--text-color)">
          <div className="flex">
            {isPC ? (
              <Image
                src="/logo.png"
                alt="Sanatan Logo"
                width={35}
                height={35}
              />
            ) : (
              ""
            )}
            <div className="message-text prose prose-h1:text-inherit">
              {!isPC ? (
                <Image
                  src="/logo.png"
                  alt="Sanatan Logo"
                  width={35}
                  height={35}
                />
              ) : (
                ""
              )}
              {(function () {
                if (isError) return <Err />;
                return text === "" && isStreaming ? (
                  <Lordicon src="loop" trigger="loop" />
                ) : (
                  <Markdown markdown={text} streaming={isStreaming} />
                );
              })()}
            </div>
          </div>
          <div className="row gap-2 mt-2">
            <button className="icon ml-10">
              <Lordicon size={25} src="speak" />
            </button>
            <button
              onClick={e => copyListener(e, chat.parts.map((x) => x.text).join(""))}
              className="icon"
            >
              <Lordicon size={25} src="copy" />
            </button>
            <button onClick={() => deleteMessage(index)} className="icon">
              <Lordicon size={25} src="trash" />
            </button>
            <button className="icon">
              <Lordicon size={25} src="regenerate" />
            </button>
          </div>
        </div>
      );
    }
  },
);

ChatItem.displayName = "ChatItem";

const FormatChat = React.memo(function FormatChat({
  history,
}: {
  history: ChatHistory;
}) {
  const { isPC, historyLoading: [loading] } = React.useContext(PageContext);
  if(loading) return <Messages />;
  return history.map((chat, i) => (
     <ChatItem key={i} chat={chat} isPC={isPC} index={i} />
  ));
});

function Home() {
  const initialName = React.useContext(All).userData.name[0];
  const t = useT();
  const name = initialName || t("guestName");
  return (
    <div className="home">
      <div className="imgWrapper">
        <Image src="/logo.png" width={110} height={110} alt="Sanatan Logo" loading="eager" preload />
      </div>
      <h3>
        <Language need="greetingHello" /> {name}
      </h3>
      <h1 className="logoTxt animated-gradient-text fast-transition font-medium">
        <Language need="searchGeetaTooltip" />
      </h1>
    </div>
  );
}

function scroll(cBody?: Element | null) {
  cBody?.scrollTo({ top: cBody?.scrollHeight, behavior: "smooth" });
}
function ScrollBtn() {
  return (
    <button
      className="scroll-button center-flex"
      onClick={(btn) =>
        scroll(btn.currentTarget.parentElement?.querySelector(".chat-body"))
      }
    >
      <Lordicon src="down" />
    </button>
  );
}

export default ChatApp;
