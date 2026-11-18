import { render, type RenderOptions } from "@testing-library/react";
import { vi } from "vitest";
import type { ReactElement, ReactNode } from "react";
import { All } from "@/app/(root)/AllContext";
import PageContext from "@/app/(root)/app/PageContext";

type Setter<T> = ReturnType<typeof vi.fn<(value: T | ((previous: T) => T)) => void>>;
const state = <T,>(value: T): [T, Setter<T>] => [value, vi.fn()];

export interface AllOverrides {
  language?: "en" | "hi";
  theme?: "light" | "dark";
  notification?: Partial<{
    message: string;
    type: "info" | "success" | "error";
    isOpen: boolean;
    isLang: boolean;
    vars: Record<string, string>;
  }>;
}

/** A complete `All` context value whose setters are spies. */
export function makeAll({ language = "en", theme = "light", notification = {} }: AllOverrides = {}) {
  const value = {
    theme: state<"light" | "dark">(theme),
    userData: {
      language: state<"en" | "hi">(language),
      name: state("Shivam"),
      email: state("shivam@example.com"),
      picture: state(""),
      mainTheme: state<"light" | "dark" | "auto">("auto"),
    },
    notification: {
      message: state(notification.message ?? ""),
      type: state(notification.type ?? "info"),
      isOpen: state(notification.isOpen ?? false),
      isLang: state(notification.isLang ?? false),
      vars: state(notification.vars ?? {}),
    },
  };
  return value as unknown as AllProps & typeof value;
}

export interface PageOverrides {
  chatHistory?: ChatHistory;
  chats?: Chats;
  currentSessionId?: string;
  isDeep?: boolean;
  persona?: string;
}

/** A complete `PageContext` value whose setters are spies. */
export function makePage({
  chatHistory = [],
  chats = [],
  currentSessionId = "chat-1",
  isDeep = false,
  persona = "",
}: PageOverrides = {}) {
  const value = {
    isDeep: state(isDeep),
    settingsOpen: state(false),
    isPC: true,
    historyLoading: state(false),
    userData: {
      chatHistory: state(chatHistory),
      btnMessage: state<string | false>(false),
      persona: state(persona),
      chats: state(chats),
      currentSessionId: state(currentSessionId),
    },
  };
  return value as unknown as PageContextProps & typeof value;
}

/** Renders a component inside the app's `All` (and optionally page) context. */
export function renderWithContexts(
  ui: ReactElement,
  {
    all = makeAll(),
    page,
    ...options
  }: { all?: ReturnType<typeof makeAll>; page?: ReturnType<typeof makePage> } & Omit<
    RenderOptions,
    "wrapper"
  > = {},
) {
  const Wrapper = ({ children }: { children: ReactNode }) => {
    const inner = page ? <PageContext.Provider value={page}>{children}</PageContext.Provider> : children;
    return <All.Provider value={all}>{inner}</All.Provider>;
  };
  return { all, page, ...render(ui, { wrapper: Wrapper, ...options }) };
}
