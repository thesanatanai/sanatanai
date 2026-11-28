import { ParticleBackground } from "@/components/Particles";
import "@/css/extra.css";
import "@/css/page.css";
import MenuBar from "@/components/MenuBar";
import Footer from "@/components/Footer";
import Settings from "@/components/Settings";
import ChatApp from "@/components/ChatApp";
import { ChatStoreProvider } from "./ChatStoreProvider";
import { SideMenu } from "@/components/Notification";
import { ACCESS_COOKIE } from "@/utils/authCookies";
import { SessionExpired, loadAppData, type AppData } from "@/utils/serverData";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

export const instant = false;

/**
 * The chat page. The server reads the session's access token from its cookie (the proxy has
 * renewed it if it had ended), loads the user, the chats and the latest chat from the API, and
 * hands all of it to the browser together with the token, which the browser keeps in memory.
 *
 * If the API cannot be reached from here, the page still opens and the browser loads it all itself.
 */
export default async function Page() {
  const accessToken = (await cookies()).get(ACCESS_COOKIE)?.value ?? null;

  let initial: AppData | null = null;
  if (accessToken) {
    try {
      initial = await loadAppData(accessToken);
    } catch (error) {
      if (error instanceof SessionExpired) redirect("/welcome?logout=true");
      console.error("[app] Could not load the chat page's data on the server:", error);
    }
  }

  return (
    <ChatStoreProvider accessToken={accessToken} initial={initial}>
      <div className="sanatanai-app">
        <MenuBar />
        <SideMenu />
        <ChatApp />
        <Settings />
        <Footer />
        <ParticleBackground particleCount={70} />
      </div>
    </ChatStoreProvider>
  );
}
