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
import { fakeApi, json } from "../helpers/api";

// The whole chat page, rendered the way app/page.tsx composes it, on top of the real stores.
const mocks = vi.hoisted(() => ({ stream: vi.fn() }));
vi.mock("@/utils/message", () => ({ default: mocks.stream }));
vi.mock("@/components/Lordicon", () => ({ default: () => null, Icon: () => null }));
vi.mock("@/components/Particles", () => ({ ParticleBackground: () => null }));
vi.mock("@/components/Memory", () => ({ default: () => <p>memory panel</p> }));

const chat = (id: string, title: string, timestamp = Date.now()) => ({ id, title, timestamp, index: 1 });
const message = (role: "user" | "model", text: string, index: number) =>
  ({ role, index, parts: [{ text }] }) as ChatHistory[0];

const user = { id: "u1", name: "Shivam", email: "s@example.com", picture: "", preferredLocale: "en" as const, memories: [] as string[] };

function Page({ open = stored as ChatHistory }: { open?: ChatHistory }) {
  // What the server hands the browser: the user, the chats, the latest chat, and the access token.
  return (
    <ChatStoreProvider accessToken="test-token" initial={{ user, chats, chatId: "c1", messages: open }}>
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
/** What the API stores of the open chat: messages without their position. */
const stored = history.map(({ role, parts }) => ({ role, parts }));
const noContent = () => new Response(null, { status: 204 });

/**
 * Opens the chat page the way the app does: the server has loaded the chats and the latest
 * chat, and the browser starts from them. `extra` adds or replaces routes of the fake API
 * (for what the browser asks for later).
 */
async function mountPage(extra: Record<string, unknown> = {}, open: { messages?: unknown[] } = {}) {
  const api = fakeApi({
    "GET /v1/chats": chats,
    "GET /v1/chats/c1": { ...chats[0], messages: open.messages ?? stored },
    ...extra,
  });
  render(<Page open={(open.messages ?? stored) as ChatHistory} />);
  await screen.findByText("Karma talk");
  // Let the page's own effects settle (timers, measuring the window) before anything is clicked.
  await act(async () => {
    await new Promise((resolve) => setTimeout(resolve, 0));
  });
  return api;
}
const store = () => useChatStore.getState();

beforeEach(() => {
  localStorage.clear();
  window.history.pushState(null, "", "/app");
  useAppStore.setState({ name: "Shivam", fetched: true });
  mocks.stream.mockReset().mockResolvedValue(undefined);
  // jsdom has no scrolling or layout: the page scrolls to new messages and checks the window shape.
  Element.prototype.scrollTo = vi.fn();
  vi.stubGlobal("innerWidth", 1280);
  vi.stubGlobal("innerHeight", 720);
});

describe("chat page: reads the stores", () => {
  it("shows the chats in the sidebar and the open chat's messages", async () => {
    await mountPage();
    expect(screen.getByText("Karma talk")).toBeDefined();
    expect(screen.getByText("Dharma talk")).toBeDefined();
    expect(screen.getByText("What is karma?")).toBeDefined();
    expect(screen.getByText("Shivam")).toBeDefined(); // profile name in the sidebar
  });

  it("marks the open chat as active", async () => {
    await mountPage();
    expect(screen.getByText("Karma talk").closest(".chat-item")!.classList.contains("active")).toBe(true);
    expect(screen.getByText("Dharma talk").closest(".chat-item")!.classList.contains("active")).toBe(false);
  });

  it("greets the user by name when the chat is empty", async () => {
    await mountPage({}, { messages: [] });
    expect(document.querySelector(".home h3")!.textContent).toContain("Shivam");
  });
});

describe("chat page: switching and deleting chats", () => {
  it("opens another chat from the sidebar and shows its messages", async () => {
    const other = [message("user", "Tell me of dharma", 0), message("model", "Duty and order.", 1)];
    await mountPage({ "GET /v1/chats/c2": { ...chats[1], messages: other.map(({ role, parts }) => ({ role, parts })) } });

    fireEvent.click(screen.getByText("Dharma talk"));

    await screen.findByText("Tell me of dharma");
    expect(store().currentSessionId).toBe("c2");
    expect(screen.queryByText("What is karma?")).toBeNull();
    expect(screen.getByText("Dharma talk").closest(".chat-item")!.classList.contains("active")).toBe(true);
  });

  it("deletes a chat from its sidebar button without opening it", async () => {
    let deleted = false;
    const { calls } = await mountPage({
      "GET /v1/chats": () => json(deleted ? [chats[0]] : chats),
      "DELETE /v1/chats/c2": () => {
        deleted = true;
        return noContent();
      },
    });

    const row = screen.getByText("Dharma talk").closest(".chat-item") as HTMLElement;
    fireEvent.click(within(row).getByRole("button"));

    await waitFor(() => expect(screen.queryByText("Dharma talk")).toBeNull());
    expect(calls).toContainEqual(expect.objectContaining({ method: "DELETE", path: "/v1/chats/c2" }));
    expect(store().currentSessionId).toBe("c1"); // the click did not also open the chat
  });

  it("starts a new chat from the menu", async () => {
    let created = false;
    await mountPage({
      "GET /v1/chats": () => json(created ? [...chats, chat("c3", "New Chat")] : chats),
      "POST /v1/chats": () => {
        created = true;
        return json({ id: "c3" });
      },
      "GET /v1/chats/c3": { ...chat("c3", "New Chat"), messages: [] },
    });

    fireEvent.click(screen.getByRole("button", { name: /new chat/i }));

    await waitFor(() => expect(store().currentSessionId).toBe("c3"));
    await waitFor(() =>
      expect([...document.querySelectorAll(".chat-title")].map((title) => title.textContent)).toContain("New Chat"),
    );
  });

  it("deletes the open chat from the menu", async () => {
    let deleted = false;
    const { calls } = await mountPage({
      "GET /v1/chats": () => json(deleted ? [chats[1]] : chats),
      "DELETE /v1/chats/c1": () => {
        deleted = true;
        return noContent();
      },
      "GET /v1/chats/c2": { ...chats[1], messages: [] },
    });

    fireEvent.click(document.querySelector(".chat-options-item.danger")!);

    await waitFor(() => expect(store().currentSessionId).toBe("c2"));
    expect(calls).toContainEqual(expect.objectContaining({ method: "DELETE", path: "/v1/chats/c1" }));
  });

  it("removes a message with its trash button and saves the chat", async () => {
    const { calls } = await mountPage({ "PATCH /v1/chats/c1": noContent });

    const userMessage = screen.getByText("What is karma?").closest(".user-message") as HTMLElement;
    const buttons = within(userMessage).getAllByRole("button");
    fireEvent.click(buttons[buttons.length - 1]);

    await waitFor(() => expect(store().chatHistory).toHaveLength(1));
    expect(screen.queryByText("What is karma?")).toBeNull();
    expect(calls).toContainEqual(expect.objectContaining({ method: "PATCH", path: "/v1/chats/c1" }));
  });
});

describe("chat page: settings", () => {
  const openSettings = async (extra: Record<string, unknown> = {}) => {
    const api = await mountPage(extra);
    fireEvent.click(document.querySelector(".profile-section")!);
    return api;
  };

  it("opens from the profile button and closes again", async () => {
    await mountPage();
    expect(document.getElementById("settings-popup")).toBeNull();
    fireEvent.click(document.querySelector(".profile-section")!);
    expect(document.getElementById("settings-popup")).not.toBeNull();
    fireEvent.click(document.getElementById("close-settings")!);
    expect(document.getElementById("settings-popup")).toBeNull();
    expect(store().settingsOpen).toBe(false);
  });

  it("switches the language, saves it and says so", async () => {
    const { calls } = await openSettings({ "PATCH /v1/me": {} });

    fireEvent.click(screen.getByText("हिन्दी"));

    expect(useAppStore.getState().language).toBe("hi");
    expect(calls).toContainEqual(expect.objectContaining({ method: "PATCH", path: "/v1/me", body: { preferredLocale: "hi" } }));
    expect(useAppStore.getState().notification.message).toBe("changedSetting");
    expect(useAppStore.getState().notification.type).toBe("success");
  });

  it("switches the theme and remembers it", async () => {
    await openSettings();
    fireEvent.click(screen.getByText("Dark"));
    expect(useAppStore.getState().mainTheme).toBe("dark");
    expect(localStorage.getItem("theme")).toBe("dark");
  });

  it("saves the display name when the field loses focus", async () => {
    const { calls } = await openSettings({ "PATCH /v1/me": {} });

    const input = document.getElementById("name") as HTMLInputElement;
    fireEvent.change(input, { target: { value: "Ram" } });
    fireEvent.blur(input);

    expect(useAppStore.getState().name).toBe("Ram");
    await waitFor(() =>
      expect(calls).toContainEqual(expect.objectContaining({ method: "PATCH", path: "/v1/me", body: { name: "Ram" } })),
    );
  });

  it("keeps the custom instruction in the store and in the browser", async () => {
    await openSettings();
    const persona = document.querySelector("textarea")!;
    fireEvent.change(persona, { target: { value: "Speak gently" } });
    expect(store().persona).toBe("Speak gently");
    expect(localStorage.getItem("persona")).toBe("Speak gently");
    expect((document.querySelector("textarea") as HTMLTextAreaElement).value).toBe("Speak gently");
  });

  it("opens the memories panel", async () => {
    await openSettings();
    fireEvent.click(screen.getByText(/memory/i, { selector: "button *, button" }));
    expect(screen.getByText("memory panel")).toBeDefined();
  });
});

describe("chat page: composer", () => {
  /** The plane button after the text box. (It has no class of its own since the footer was restyled.) */
  const sendButton = () => document.querySelector(".chat-footer > div > button:last-child")!;
  const type = (text: string) => fireEvent.change(document.getElementById("message")!, { target: { value: text } });

  it("sends a message and shows it with a streaming reply", async () => {
    await mountPage();
    type("And dharma?");
    fireEvent.click(sendButton());

    expect(store().chatHistory.slice(-2)).toMatchObject([
      { role: "user", parts: [{ text: "And dharma?" }] },
      { role: "model", streaming: true },
    ]);
    expect(screen.getByText("And dharma?")).toBeDefined();
    expect((document.getElementById("message") as HTMLTextAreaElement).value).toBe("");
  });

  it("shows the reply as it streams in", async () => {
    await mountPage();
    type("And dharma?");
    fireEvent.click(sendButton());

    act(() => mocks.stream.mock.calls[0][3]("Duty."));
    expect(store().chatHistory.at(-1)!.parts[0].text).toBe("Duty.");
  });

  it("sends the open chat and Deep Think setting with the message", async () => {
    await mountPage();
    fireEvent.click(document.querySelector(".deepThink")!);
    expect(store().isDeep).toBe(true);

    type("Why?");
    fireEvent.click(sendButton());

    expect(mocks.stream.mock.calls[0].slice(1, 3)).toEqual(["c1", true]);
  });

  it("sends the text of a chat button the AI offered", async () => {
    await mountPage();
    act(() => store().setBtnMessage("Yes, please"));

    await waitFor(() => expect(mocks.stream).toHaveBeenCalled());
    expect(mocks.stream.mock.calls[0][0].parts[0].text).toBe("Yes, please");
    expect(store().btnMessage).toBe(false);
  });

  it("sends with Enter on a landscape window", async () => {
    await mountPage();
    type("Enter sends");
    fireEvent.keyDown(document.getElementById("message")!, { key: "Enter" });
    expect(mocks.stream).toHaveBeenCalled();
  });
});
