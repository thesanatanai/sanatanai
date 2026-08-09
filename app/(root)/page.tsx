"use server";
import { ParticleBackground } from "@/components/Particles";
import "@/css/extra.css";
import "@/css/page.css";
import MenuBar from "@/components/MenuBar";
import Footer from "@/components/Footer";
import Settings from "@/components/Settings";
import ChatApp from "@/components/ChatApp";
import { PgContext } from "./PageContext";
import { SideMenu } from "@/components/Notification";
import { setSession } from "@/utils/chatActions";
import { getChat, getChats } from "@/actions/chatActions";
import verifyUser, { User } from "@/app/api/utils/verify";
import { redirect } from "next/navigation";
import { getMainChat } from "../api/chat/search";

export default async function Page() {
  const user = await verifyUser() as User;
  if(typeof user == "function") {
    console.error(await user().json());
    redirect("/welcome");
  }
  if(typeof user == "function") redirect("/welcome");
  const chats = await getChats(user.id);
  if(typeof chats == "function") redirect("/welcome");
  const latestChat = await setSession(chats);
  const chat = await getChat(user.id, latestChat);
  if(typeof chat == "function") redirect("/welcome");
  const messages = getMainChat(chat, true);
  return (
    <>
      {/* eslint-disable-next-line @next/next/no-css-tags  */}
      <link rel="stylesheet" href="/katex.min.css" />
      <PgContext loadedChats={chats} messages={messages as ChatHistory || []} id={latestChat}>
        <div className="sanatanai-app">
          <MenuBar />
          <SideMenu />
          <ChatApp />
          <Settings />
          <Footer />
          <ParticleBackground particleCount={70} />
        </div>
      </PgContext>
    </>
  );
}