import { act, renderHook, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { All } from "@/app/(root)/AllContext";
import notification, { Notification, useNotification } from "@/components/Notification";
import { makeAll, renderWithContexts } from "../helpers/contexts";

// Lordicon registers a custom element lazily; icons are irrelevant here.
vi.mock("@/components/Lordicon", () => ({ default: () => null, Icon: () => null }));

describe("<Notification />", () => {
  it("shows an untranslated message as it is", () => {
    const all = makeAll({ notification: { message: "Saved!", isLang: true } });
    renderWithContexts(<Notification />, { all });
    expect(screen.getByText("Saved!")).toBeDefined();
  });

  it("translates the message key when it is not already translated", () => {
    const all = makeAll({ language: "hi", notification: { message: "languageLabel", isLang: false } });
    renderWithContexts(<Notification />, { all });
    expect(screen.getByText("भाषा")).toBeDefined();
  });

  it("fills in translation variables", () => {
    const all = makeAll({
      notification: { message: "changedSetting", isLang: false, vars: { setting: "Theme" } },
    });
    renderWithContexts(<Notification />, { all });
    expect(screen.getByText(/Theme/)).toBeDefined();
  });

  it.each(["info", "success", "error"] as const)("styles a %s notification", (type) => {
    const all = makeAll({ notification: { message: "x", isLang: true, type } });
    const { container } = renderWithContexts(<Notification />, { all });
    expect(container.firstElementChild!.classList.contains(type)).toBe(true);
  });

  it("is only visible while open", () => {
    const closed = renderWithContexts(<Notification />, {
      all: makeAll({ notification: { message: "x", isLang: true, isOpen: false } }),
    });
    expect(closed.container.firstElementChild!.classList.contains("active")).toBe(false);
    closed.unmount();

    const open = renderWithContexts(<Notification />, {
      all: makeAll({ notification: { message: "x", isLang: true, isOpen: true } }),
    });
    expect(open.container.firstElementChild!.classList.contains("active")).toBe(true);
  });
});

describe("notification()", () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it("sets the content straight away, shows it after 0.5s and hides it after 3.5s", () => {
    const all = makeAll();
    notification("deletedMemory", all.notification, { language: false, type: "success", vars: { a: "b" } });

    expect(all.notification.type[1]).toHaveBeenCalledWith("success");
    expect(all.notification.vars[1]).toHaveBeenCalledWith({ a: "b" });
    expect(all.notification.message[1]).toHaveBeenCalledWith("deletedMemory");
    expect(all.notification.isOpen[1]).not.toHaveBeenCalled();

    vi.advanceTimersByTime(500);
    expect(all.notification.isOpen[1]).toHaveBeenLastCalledWith(true);
    vi.advanceTimersByTime(3000);
    expect(all.notification.isOpen[1]).toHaveBeenLastCalledWith(false);
  });

  it("defaults to an info notification without variables", () => {
    const all = makeAll();
    notification("hello", all.notification);
    expect(all.notification.type[1]).toHaveBeenCalledWith("info");
    expect(all.notification.vars[1]).toHaveBeenCalledWith({});
  });

  it("closes a notification that is already showing before replacing it", () => {
    const all = makeAll({ notification: { isOpen: true } });
    notification("next", all.notification);
    expect(all.notification.isOpen[1]).toHaveBeenCalledWith(false);
  });
});

describe("useNotification", () => {
  it("returns a sender wired to the app's notification state", () => {
    const all = makeAll();
    const wrapper = ({ children }: { children: ReactNode }) => (
      <All.Provider value={all}>{children}</All.Provider>
    );
    const { result } = renderHook(() => useNotification(), { wrapper });
    vi.useFakeTimers();
    act(() => result.current("fileLimitExceeded", { language: true, type: "error" }));
    expect(all.notification.message[1]).toHaveBeenCalledWith("fileLimitExceeded");
    expect(all.notification.type[1]).toHaveBeenCalledWith("error");
    vi.useRealTimers();
  });
});
