import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  copy,
  copyListener,
  fileExtensions,
  logger,
  login,
  parentCount,
  speak,
  useDb,
} from "@/utils/utils";

const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status });

describe("logger", () => {
  it("logs outside production", () => {
    const log = vi.spyOn(console, "log").mockImplementation(() => {});
    logger("hello", 1);
    expect(log).toHaveBeenCalledWith("hello", 1);
  });

  it("is silent in production", () => {
    vi.stubEnv("NODE_ENV", "production");
    const log = vi.spyOn(console, "log").mockImplementation(() => {});
    logger("secret");
    expect(log).not.toHaveBeenCalled();
  });
});

describe("parentCount", () => {
  it("climbs the requested number of parents", () => {
    document.body.innerHTML = `<div id="a"><div id="b"><div id="c"><span id="d"></span></div></div></div>`;
    const start = document.getElementById("d");
    expect(parentCount(start, 1)!.id).toBe("c");
    expect(parentCount(start, 3)!.id).toBe("a");
    expect(parentCount(start, 0)!.id).toBe("d");
  });

  it("returns nothing for something that is not an element", () => {
    expect(parentCount(null, 2)).toBeUndefined();
    expect(parentCount({}, 2)).toBeUndefined();
    expect(parentCount("div", 2)).toBeUndefined();
  });
});

describe("copy", () => {
  afterEach(() => {
    Reflect.deleteProperty(navigator, "clipboard");
    document.body.innerHTML = "";
  });

  it("uses the Clipboard API when the browser has it", () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, "clipboard", { value: { writeText }, configurable: true });
    copy("Om Namah Shivaya");
    expect(writeText).toHaveBeenCalledWith("Om Namah Shivaya");
  });

  it("falls back to a temporary textarea in older browsers", () => {
    const execCommand = vi.fn();
    Object.defineProperty(document, "execCommand", { value: execCommand, configurable: true });
    copy("fallback text");
    expect(execCommand).toHaveBeenCalledWith("copy");
    expect(document.querySelector("textarea")!.value).toBe("fallback text");
  });
});

describe("copyListener", () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => {
    vi.useRealTimers();
    Reflect.deleteProperty(navigator, "clipboard");
  });

  it("copies the text and flashes a 'done' icon for one second", () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, "clipboard", { value: { writeText }, configurable: true });
    const button = document.createElement("button");
    const icon = document.createElement("lord-icon") as unknown as { src: string; trigger: string };
    button.appendChild(icon as unknown as Node);

    copyListener({ currentTarget: button }, "copied text");

    expect(writeText).toHaveBeenCalledWith("copied text");
    expect(icon.src).toBe("icons/done.json");
    expect(icon.trigger).toBe("loop");
    vi.advanceTimersByTime(1000);
    expect(icon.src).toBe("icons/copy.json");
    expect(icon.trigger).toBe("hover");
  });
});

describe("login", () => {
  const setters = () => ({
    name: ["", vi.fn()] as [string, ReturnType<typeof vi.fn>],
    email: ["", vi.fn()] as [string, ReturnType<typeof vi.fn>],
  });

  beforeEach(() => {
    vi.spyOn(console, "log").mockImplementation(() => {});
  });

  it("copies the signed-in user's profile into the app state without writing it back", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(json({ userData: { name: "Shivam", email: "s@example.com" } })));
    const state = setters();
    const fetched = vi.fn();

    await login(state as never, fetched);

    expect(state.name[1]).toHaveBeenCalledWith("Shivam", false);
    expect(state.email[1]).toHaveBeenCalledWith("s@example.com", false);
    expect(fetched).toHaveBeenCalledWith(true);
  });

  it("signs the user out when the session is not valid", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(json({ error: "Invalid token" }, 401)));
    const cookieDelete = vi.fn();
    vi.stubGlobal("cookieStore", { delete: cookieDelete });
    const open = vi.fn();
    vi.stubGlobal("open", open);
    const fetched = vi.fn();

    await login(setters() as never, fetched);

    expect(cookieDelete).toHaveBeenCalledWith("setupComplete");
    expect(open).toHaveBeenCalledWith("/welcome?logout=true", "_self");
    expect(fetched).toHaveBeenCalledWith(true);
  });
});

describe("useDb", () => {
  it("saves a profile change with PUT /api/user", async () => {
    const fetchMock = vi.fn().mockResolvedValue(json({ message: "Done" }));
    vi.stubGlobal("fetch", fetchMock);

    await useDb(true)("name", "Shivam");

    expect(fetchMock).toHaveBeenCalledWith("api/user", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: "Shivam" }),
    });
  });

  it("does nothing until the profile has been loaded", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    await useDb(false)("name", "Shivam");
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("ignores network failures", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("offline")));
    await expect(useDb(true)("preferredLocale", "hi")).resolves.toBeUndefined();
  });
});

describe("speak", () => {
  it("reads the message text aloud", () => {
    document.body.innerHTML = `
      <div class="message"><p class="message-text">Namaste</p>
        <div><div><button id="speak"></button></div></div></div>`;
    const speakSpy = vi.fn();
    vi.stubGlobal("speechSynthesis", { speak: speakSpy });
    vi.stubGlobal("SpeechSynthesisUtterance", class { constructor(public text: string) {} });

    speak({ target: document.getElementById("speak") } as never);

    expect(speakSpy).toHaveBeenCalledTimes(1);
    expect(speakSpy.mock.calls[0][0].text).toBe("Namaste");
  });

  it("stays quiet when there is no text to read", () => {
    document.body.innerHTML = `<div><div><div><button id="speak"></button></div></div></div>`;
    const speakSpy = vi.fn();
    vi.stubGlobal("speechSynthesis", { speak: speakSpy });
    speak({ target: document.getElementById("speak") } as never);
    expect(speakSpy).not.toHaveBeenCalled();
  });
});

describe("fileExtensions (allowed attachment types)", () => {
  it.each(["txt", "md", "json", "pdf", "png", "jpg", "mp3", "mp4", "py", "ts", "tsx"])(
    "allows .%s",
    (extension) => expect(fileExtensions).toContain(extension),
  );

  it.each(["exe", "dll", "apk", "msi"])("does not allow executables like .%s", (extension) =>
    expect(fileExtensions).not.toContain(extension),
  );
});
