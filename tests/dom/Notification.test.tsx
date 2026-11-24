import { act, render, renderHook, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import notification, { Notification, useNotification } from "@/components/Notification";
import { useAppStore } from "@/stores/appStore";
import { recordNotifications, setApp } from "../helpers/stores";

// Lordicon registers a custom element lazily; icons are irrelevant here.
vi.mock("@/components/Lordicon", () => ({ default: () => null, Icon: () => null }));

const show = (patch: Partial<ReturnType<typeof useAppStore.getState>["notification"]>) =>
  useAppStore.getState().setNotification(patch);

describe("<Notification />", () => {
  it("shows an untranslated message as it is", () => {
    show({ message: "Saved!", isLang: true });
    render(<Notification />);
    expect(screen.getByText("Saved!")).toBeDefined();
  });

  it("translates the message key when it is not already translated", () => {
    setApp({ language: "hi" });
    show({ message: "languageLabel", isLang: false });
    render(<Notification />);
    expect(screen.getByText("भाषा")).toBeDefined();
  });

  it("fills in translation variables", () => {
    show({ message: "changedSetting", isLang: false, vars: { setting: "Theme" } });
    render(<Notification />);
    expect(screen.getByText(/Theme/)).toBeDefined();
  });

  it.each(["info", "success", "error"] as const)("styles a %s notification", (type) => {
    show({ message: "x", isLang: true, type });
    const { container } = render(<Notification />);
    expect(container.firstElementChild!.classList.contains(type)).toBe(true);
  });

  it("is only visible while open", () => {
    show({ message: "x", isLang: true, isOpen: false });
    const { container } = render(<Notification />);
    expect(container.firstElementChild!.classList.contains("active")).toBe(false);

    act(() => show({ isOpen: true }));
    expect(container.firstElementChild!.classList.contains("active")).toBe(true);
  });
});

describe("notification()", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
  });
  const current = () => useAppStore.getState().notification;

  it("sets the content straight away, shows it after 0.5s and hides it after 3.5s", () => {
    notification("deletedMemory", { language: false, type: "success", vars: { a: "b" } });

    expect(current()).toMatchObject({ type: "success", vars: { a: "b" }, message: "deletedMemory", isOpen: false });

    vi.advanceTimersByTime(500);
    expect(current().isOpen).toBe(true);
    vi.advanceTimersByTime(3000);
    expect(current().isOpen).toBe(false);
  });

  it("defaults to an info notification without variables", () => {
    notification("hello");
    expect(current()).toMatchObject({ type: "info", vars: {}, message: "hello" });
  });

  it("closes a notification that is already showing before replacing it", () => {
    show({ isOpen: true, message: "previous" });
    notification("next");
    expect(current()).toMatchObject({ isOpen: false, message: "next" });
  });
});

describe("useNotification", () => {
  it("returns a sender wired to the app's notification state", () => {
    const { result } = renderHook(() => useNotification());
    vi.useFakeTimers();
    const { sent, stop } = recordNotifications();
    act(() => result.current("fileLimitExceeded", { language: true, type: "error" }));
    expect(sent).toEqual([{ message: "fileLimitExceeded", type: "error", vars: {} }]);
    stop();
    vi.useRealTimers();
  });

  it("returns the same sender on every render", () => {
    const { result, rerender } = renderHook(() => useNotification());
    const first = result.current;
    rerender();
    expect(result.current).toBe(first);
  });
});
