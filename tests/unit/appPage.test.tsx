import { isValidElement, type ReactElement, type ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  cookie: undefined as string | undefined,
  loadAppData: vi.fn(),
  redirect: vi.fn((to: string) => {
    throw new Error(`NEXT_REDIRECT ${to}`);
  }),
}));

vi.mock("next/headers", () => ({
  cookies: async () => ({ get: (name: string) => (name === "access_token" && mocks.cookie ? { value: mocks.cookie } : undefined) }),
}));
vi.mock("next/navigation", () => ({ redirect: mocks.redirect }));
vi.mock("@/utils/serverData", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/utils/serverData")>()),
  loadAppData: mocks.loadAppData,
}));
// The page's own components are not what is tested here.
for (const path of ["Particles", "MenuBar", "Footer", "Settings", "ChatApp", "Notification"]) {
  vi.mock(`@/components/${path}`, () => ({ default: () => null, ParticleBackground: () => null, SideMenu: () => null }));
}
vi.mock("@/css/extra.css", () => ({}));
vi.mock("@/css/page.css", () => ({}));

import Page from "@/app/(root)/app/page";
import { ChatStoreProvider } from "@/app/(root)/app/ChatStoreProvider";
import { SessionExpired } from "@/utils/serverData";

const data = {
  user: { id: "u1", name: "S", email: "s@example.com", picture: "", preferredLocale: "en", memories: [] },
  chats: [{ id: "c1", title: "One", timestamp: 1, index: 1 }],
  chatId: "c1",
  messages: [],
};

/** The element the page returns is a ChatStoreProvider; its props are what reaches the browser. */
async function render() {
  const element = (await Page()) as ReactElement<{ accessToken: string | null; initial: unknown; children: ReactNode }>;
  expect(isValidElement(element)).toBe(true);
  expect(element.type).toBe(ChatStoreProvider);
  return element.props;
}

beforeEach(() => {
  mocks.cookie = undefined;
  mocks.loadAppData.mockReset();
  mocks.redirect.mockClear();
  vi.spyOn(console, "error").mockImplementation(() => {});
});

describe("the chat page (server side)", () => {
  it("loads the data with the access cookie and hands it, and the token, to the browser", async () => {
    mocks.cookie = "access-from-cookie";
    mocks.loadAppData.mockResolvedValue(data);
    const props = await render();
    expect(mocks.loadAppData).toHaveBeenCalledWith("access-from-cookie");
    expect(props).toMatchObject({ accessToken: "access-from-cookie", initial: data });
  });

  it("sends the visitor to sign-in when the API says the session is over", async () => {
    mocks.cookie = "stale";
    mocks.loadAppData.mockRejectedValue(new SessionExpired());
    await expect(Page()).rejects.toThrow("NEXT_REDIRECT /welcome?logout=true");
  });

  it("still opens the page, for the browser to fill in, when the API cannot be reached", async () => {
    mocks.cookie = "access-from-cookie";
    mocks.loadAppData.mockRejectedValue(new TypeError("fetch failed"));
    const props = await render();
    expect(props).toMatchObject({ accessToken: "access-from-cookie", initial: null });
    expect(mocks.redirect).not.toHaveBeenCalled();
  });

  it("opens the page with nothing to hand over when there is no access cookie, and asks the API for nothing", async () => {
    const props = await render();
    expect(props).toMatchObject({ accessToken: null, initial: null });
    expect(mocks.loadAppData).not.toHaveBeenCalled();
  });
});
