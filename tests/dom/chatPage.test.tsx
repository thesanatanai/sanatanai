import { act, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ChatStoreProvider } from "@/app/(root)/app/ChatStoreProvider";
import ChatApp from "@/components/ChatApp";
import Footer from "@/components/Footer";
import MenuBar from "@/components/MenuBar";
import { Notification, SideMenu } from "@/components/Notification";
import Settings from "@/components/Settings";
import { useAppStore } from "@/stores/appStore";
import { useChatStore } from "@/stores/chatStore";

// The whole chat page, rendered the way app/page.tsx composes it, on top of the real stores.
const mocks = vi.hoisted(() => ({ stream: vi.fn() }));
vi.mock("@/utils/message", () => ({ default: mocks.stream }));
vi.mock("@/components/Lordicon", () => ({ default: () => null, Icon: () => null }));
vi.mock("@/components/Particles", () => ({ ParticleBackground: () => null }));
vi.mock("@/components/Memory", () => ({ default: () => <p>memory panel</p> }));

const chat = (id: string, title: string, timestamp = Date.now()) => ({ id, title, timestamp, index: 1 });
const message = (role: "user" | "model", text: string, index: number) =>
  ({ role, index, parts: [{ text }] }) as ChatHistory[0];
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status });

function Page({ chats, id, messages }: { chats: Chats; id: string; messages: ChatHistory }) {
  return (
    <ChatStoreProvider loadedChats={chats} id={id} messages={messages}>
      <Notification />
      <MenuBar />
      <SideMenu />
      <ChatApp />
      <Settings />
      <Footer />
    </ChatStoreProvider>
  );
}

const chats = [chat("c1", "Karma talk"), chat("c2", "Dharma talk", Date.now() - 1000)];
const history = [message("user", "What is karma?", 0), message("model", "Action and its fruit.", 1)];
const mountPage = () => render(<Page chats={chats} id="c1" messages={history} />);
const store = () => useChatStore.getState();

beforeEach(() => {
  localStorage.clear();
  window.history.pushState(null, "", "/app");
  useAppStore.setState({ name: "Shivam", fetched: true });
  mocks.stream.mockReset().mockResolvedValue(undefined);
  vi.stubGlobal("fetch", vi.fn().mockResolvedValue(json({})));
  // jsdom has no scrolling or layout: the page scrolls to new messages and checks the window shape.
  Element.prototype.scrollTo = vi.fn();
  vi.stubGlobal("innerWidth", 1280);
  vi.stubGlobal("innerHeight", 720);
});

describe("chat page: reads the stores", () => {
  it("shows the chats in the sidebar and the open chat's messages", () => {
    mountPage();
    expect(screen.getByText("Karma talk")).toBeDefined();
    expect(screen.getByText("Dharma talk")).toBeDefined();
    expect(screen.getByText("What is karma?")).toBeDefined();
    expect(screen.getByText("Shivam")).toBeDefined(); // profile name in the sidebar
  });

  it("marks the open chat as active", () => {
    mountPage();
    expect(screen.getByText("Karma talk").closest(".chat-item")!.classList.contains("active")).toBe(true);
    expect(screen.getByText("Dharma talk").closest(".chat-item")!.classList.contains("active")).toBe(false);
  });

  it("greets the user by name when the chat is empty", () => {
    render(<Page chats={chats} id="c1" messages={[]} />);
    expect(document.querySelector(".home h3")!.textContent).toContain("Shivam");
  });
});

describe("chat page: switching and deleting chats", () => {
  it("opens another chat from the sidebar and shows its messages", async () => {
    const other = [message("user", "Tell me of dharma", 0), message("model", "Duty and order.", 1)];
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(json({ ...chats[1], messages: other })));
    mountPage();

    fireEvent.click(screen.getByText("Dharma talk"));

    await screen.findByText("Tell me of dharma");
    expect(store().currentSessionId).toBe("c2");
    expect(screen.queryByText("What is karma?")).toBeNull();
    expect(screen.getByText("Dharma talk").closest(".chat-item")!.classList.contains("active")).toBe(true);
  });

  it("deletes a chat from its sidebar button without opening it", async () => {
    const fetchMock = vi.fn(async (url: string, init?: RequestInit) =>
      init?.method === "DELETE" ? json({ message: "Done" }) : json([chats[0]]),
    );
    vi.stubGlobal("fetch", fetchMock);
    mountPage();

    const row = screen.getByText("Dharma talk").closest(".chat-item") as HTMLElement;
    fireEvent.click(within(row).getByRole("button"));

    await waitFor(() => expect(screen.queryByText("Dharma talk")).toBeNull());
    expect(fetchMock).toHaveBeenCalledWith("api/chats/c2", { method: "DELETE" });
    expect(store().currentSessionId).toBe("c1"); // the click did not also open the chat
  });

  it("starts a new chat from the menu", async () => {
    const fetchMock = vi.fn(async (url: string, init?: RequestInit) => {
      if (init?.method === "POST") return json({ id: "c3" });
      if (url === "api/chats") return json([...chats, chat("c3", "New Chat")]);
      return json({ ...chat("c3", "New Chat"), messages: [] });
    });
    vi.stubGlobal("fetch", fetchMock);
    mountPage();

    fireEvent.click(screen.getByRole("button", { name: /new chat/i }));

    await waitFor(() => expect(store().currentSessionId).toBe("c3"));
    await waitFor(() =>
      expect([...document.querySelectorAll(".chat-title")].map((title) => title.textContent)).toContain("New Chat"),
    );
  });

  it("deletes the open chat from the menu", async () => {
    const fetchMock = vi.fn(async (url: string, init?: RequestInit) => {
      if (init?.method === "DELETE") return json({ message: "Done" });
      if (url === "api/chats") return json([chats[1]]);
      return json({ ...chats[1], messages: [] });
    });
    vi.stubGlobal("fetch", fetchMock);
    mountPage();

    fireEvent.click(document.querySelector(".chat-options-item.danger")!);

    await waitFor(() => expect(store().currentSessionId).toBe("c2"));
    expect(fetchMock).toHaveBeenCalledWith("api/chats/c1", { method: "DELETE" });
  });

  it("removes a message with its trash button and saves the chat", async () => {
    const fetchMock = vi.fn().mockResolvedValue(json({ message: "Done" }));
    vi.stubGlobal("fetch", fetchMock);
    mountPage();

    const userMessage = screen.getByText("What is karma?").closest(".user-message") as HTMLElement;
    const buttons = within(userMessage).getAllByRole("button");
    fireEvent.click(buttons[buttons.length - 1]);

    await waitFor(() => expect(store().chatHistory).toHaveLength(1));
    expect(screen.queryByText("What is karma?")).toBeNull();
    expect(fetchMock).toHaveBeenCalledWith("api/chats/c1", expect.objectContaining({ method: "PUT" }));
  });
});

describe("chat page: settings", () => {
  const openSettings = () => {
    mountPage();
    fireEvent.click(document.querySelector(".profile-section")!);
  };

  it("opens from the profile button and closes again", () => {
    mountPage();
    expect(document.getElementById("settings-popup")).toBeNull();
    fireEvent.click(document.querySelector(".profile-section")!);
    expect(document.getElementById("settings-popup")).not.toBeNull();
    fireEvent.click(document.getElementById("close-settings")!);
    expect(document.getElementById("settings-popup")).toBeNull();
    expect(store().settingsOpen).toBe(false);
  });

  it("switches the language, saves it and says so", async () => {
    const fetchMock = vi.fn().mockResolvedValue(json({}));
    vi.stubGlobal("fetch", fetchMock);
    openSettings();

    fireEvent.click(screen.getByText("हिन्दी"));

    expect(useAppStore.getState().language).toBe("hi");
    expect(fetchMock).toHaveBeenCalledWith("api/user", expect.objectContaining({ body: JSON.stringify({ preferredLocale: "hi" }) }));
    expect(useAppStore.getState().notification.message).toBe("changedSetting");
    expect(useAppStore.getState().notification.type).toBe("success");
  });

  it("switches the theme and remembers it", () => {
    openSettings();
    fireEvent.click(screen.getByText("Dark"));
    expect(useAppStore.getState().mainTheme).toBe("dark");
    expect(localStorage.getItem("theme")).toBe("dark");
  });

  it("saves the display name when the field loses focus", async () => {
    const fetchMock = vi.fn().mockResolvedValue(json({}));
    vi.stubGlobal("fetch", fetchMock);
    openSettings();

    const input = document.getElementById("name") as HTMLInputElement;
    fireEvent.change(input, { target: { value: "Ram" } });
    fireEvent.blur(input);

    expect(useAppStore.getState().name).toBe("Ram");
    await waitFor(() =>
      expect(fetchMock).toHaveBeenCalledWith("api/user", expect.objectContaining({ body: JSON.stringify({ name: "Ram" }) })),
    );
  });

  it("keeps the custom instruction in the store and in the browser", () => {
    openSettings();
    const persona = document.querySelector("textarea")!;
    fireEvent.change(persona, { target: { value: "Speak gently" } });
    expect(store().persona).toBe("Speak gently");
    expect(localStorage.getItem("persona")).toBe("Speak gently");
    expect((document.querySelector("textarea") as HTMLTextAreaElement).value).toBe("Speak gently");
  });

  it("opens the memories panel", () => {
    openSettings();
    fireEvent.click(screen.getByText(/memory/i, { selector: "button *, button" }));
    expect(screen.getByText("memory panel")).toBeDefined();
  });
});

describe("chat page: composer", () => {
  const type = (text: string) => fireEvent.change(document.getElementById("message")!, { target: { value: text } });

  it("sends a message and shows it with a streaming reply", () => {
    mountPage();
    type("And dharma?");
    fireEvent.click(document.querySelector(".send-btn-capsule")!);

    expect(store().chatHistory.slice(-2)).toMatchObject([
      { role: "user", parts: [{ text: "And dharma?" }] },
      { role: "model", streaming: true },
    ]);
    expect(screen.getByText("And dharma?")).toBeDefined();
    expect((document.getElementById("message") as HTMLTextAreaElement).value).toBe("");
  });

  it("shows the reply as it streams in", () => {
    mountPage();
    type("And dharma?");
    fireEvent.click(document.querySelector(".send-btn-capsule")!);

    act(() => mocks.stream.mock.calls[0][3]("Duty."));
    expect(store().chatHistory.at(-1)!.parts[0].text).toBe("Duty.");
  });

  it("sends the open chat and Deep Think setting with the message", () => {
    mountPage();
    fireEvent.click(document.querySelector(".deepThink")!);
    expect(store().isDeep).toBe(true);

    type("Why?");
    fireEvent.click(document.querySelector(".send-btn-capsule")!);

    expect(mocks.stream.mock.calls[0].slice(1, 3)).toEqual(["c1", true]);
  });

  it("sends the text of a chat button the AI offered", async () => {
    mountPage();
    act(() => store().setBtnMessage("Yes, please"));

    await waitFor(() => expect(mocks.stream).toHaveBeenCalled());
    expect(mocks.stream.mock.calls[0][0].parts[0].text).toBe("Yes, please");
    expect(store().btnMessage).toBe(false);
  });

  it("sends with Enter on a landscape window", () => {
    mountPage();
    type("Enter sends");
    fireEvent.keyDown(document.getElementById("message")!, { key: "Enter" });
    expect(mocks.stream).toHaveBeenCalled();
  });
});
