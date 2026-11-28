import { create } from "zustand";
import { logger } from "@/utils/utils";
import { ApiError, endSession, getProfile, updateProfile, type ApiUser } from "@/utils/api";
import { resolve, type Updater } from "./updater";

export type Locale = "en" | "hi";
export type ThemeChoice = theme | "auto";
export type NotificationType = "info" | "success" | "error";

/** Names of the profile fields as the API (`/v1/me`) knows them. */
export type ProfileField = "name" | "email" | "picture" | "preferredLocale";

export interface NotificationState {
  message: string;
  type: NotificationType;
  isOpen: boolean;
  isLang: boolean;
  vars: Record<string, string>;
}

export interface NotificationProps<K> {
  language?: K;
  vars?: Record<string, string>;
  type?: NotificationType;
}

interface AppState {
  /** The theme that is actually shown (`auto` resolved to light or dark). */
  theme: theme;
  /** The theme the user picked, which may be `auto`. */
  mainTheme: ThemeChoice;
  language: Locale;
  name: string;
  email: string;
  picture: string;
  /** True once the profile has been loaded from the server. */
  fetched: boolean;
  notification: NotificationState;

  /** Shows a theme and updates the browser's theme colour, without saving a choice. */
  applyTheme: (value: theme) => void;
  setMainTheme: (value: Updater<ThemeChoice>) => void;
  /** Restores the saved theme choice and applies it. Call once when the app starts. */
  initTheme: () => void;
  setLanguage: (value: Updater<Locale>, onDb?: boolean) => void;
  setName: (value: Updater<string>, onDb?: boolean) => void;
  setEmail: (value: Updater<string>, onDb?: boolean) => void;
  setPicture: (value: Updater<string>, onDb?: boolean) => void;
  setFetched: (value: boolean) => void;
  /** Loads the signed-in user's profile from the server. */
  /** Takes the user as the server loaded it. Nothing is saved back. */
  hydrateProfile: (user: ApiUser) => void;
  /** Loads the user from the API in the browser, for when the server could not. */
  loadProfile: () => Promise<void>;
  setNotification: (patch: Partial<NotificationState>) => void;
  notify: (message: string, props?: NotificationProps<boolean>) => void;
}

//#region Theme
function readSavedTheme(): ThemeChoice {
  const saved = globalThis.window ? localStorage.getItem("theme") : null;
  return saved === "light" || saved === "dark" ? saved : "auto";
}

/**
 * Shows {@link newTheme}. Also changes the theme colour so that the app works
 * perfectly in mobiles and PWAs.
 */
function paintTheme(newTheme: theme) {
  if (!globalThis.window) return;
  const meta = document.querySelector(`meta[name="theme-color"]`) as HTMLMetaElement | null;
  if (!meta) return;
  document.body?.classList[newTheme === "light" ? "add" : "remove"]("light_mode");
  meta.content = newTheme === "light" ? "#ffffff" : "#000000";
}

let systemQuery: MediaQueryList | undefined;

function stopFollowingSystem() {
  if (systemQuery) systemQuery.onchange = null;
  systemQuery = undefined;
}

function followSystem() {
  const preferred = globalThis.matchMedia("(prefers-color-scheme: dark)");
  useAppStore.getState().applyTheme(preferred.matches ? "dark" : "light");
  preferred.onchange = () => {
    // A theme the user picked explicitly must not be overridden by the system.
    if (useAppStore.getState().mainTheme === "auto") followSystem();
  };
  systemQuery = preferred;
}

/** Saves the choice and shows the matching theme. */
function syncTheme(choice: ThemeChoice) {
  localStorage.setItem("theme", choice);
  if (choice === "auto") followSystem();
  else {
    stopFollowingSystem();
    useAppStore.getState().applyTheme(choice);
  }
}
//#endregion

//#region Profile
const dbField = (field: "name" | "email" | "picture" | "language"): ProfileField =>
  field === "language" ? "preferredLocale" : field;

async function saveProfileField(query: ProfileField, value: string) {
  if (!useAppStore.getState().fetched) return;
  // The API only lets the user change their name and language. The email and
  // picture come from the sign-in and are not editable.
  if (query !== "name" && query !== "preferredLocale") return;
  try {
    await updateProfile({ [query]: value });
  } catch {}
}
//#endregion

export const useAppStore = create<AppState>()((set, get) => {
  /** A setter that, like `useState`, also saves the value on the server while in the app. */
  const profileSetter =
    <K extends string>(field: "name" | "email" | "picture" | "language") =>
    (value: Updater<K>, onDb = true) => {
      const current = get()[field] as unknown as K;
      if (value === current) return;
      const final = resolve(value, current);
      set({ [field]: final } as Partial<AppState>);
      if (globalThis.location?.pathname === "/app" && onDb) void saveProfileField(dbField(field), final);
    };

  return {
    theme: "light",
    mainTheme: "auto",
    language: "en",
    name: "",
    email: "",
    picture: "",
    fetched: false,
    notification: { message: "", type: "info", isOpen: false, isLang: false, vars: {} },

    applyTheme: (value) => {
      paintTheme(value);
      set({ theme: value });
    },
    setMainTheme: (value) => {
      const next = resolve(value, get().mainTheme);
      set({ mainTheme: next });
      syncTheme(next);
    },
    initTheme: () => {
      const saved = readSavedTheme();
      set({ mainTheme: saved });
      syncTheme(saved);
    },

    setLanguage: profileSetter<Locale>("language"),
    setName: profileSetter<string>("name"),
    setEmail: profileSetter<string>("email"),
    setPicture: profileSetter<string>("picture"),
    setFetched: (value) => set({ fetched: value }),

    hydrateProfile: (userData) => {
      const { setName, setEmail, setPicture, setLanguage, setFetched } = get();
      // The values come from the server, so they must not be saved back to it.
      setName(userData.name, false);
      setEmail(userData.email, false);
      setPicture(userData.picture, false);
      setLanguage(userData.preferredLocale, false);
      setFetched(true);
    },

    loadProfile: async () => {
      try {
        get().hydrateProfile(await getProfile());
      } catch (e) {
        logger(e);
        if (!globalThis.window) return get().setFetched(true);
        // A session the API refuses even after renewing it is over. Trouble that is only the
        // network or the server keeps the session: the profile just stays empty.
        if (e instanceof ApiError && e.status === 401) endSession();
        get().setFetched(true);
      }
    },

    setNotification: (patch) => set((state) => ({ notification: { ...state.notification, ...patch } })),
    notify: (message, props) => {
      const { notification, setNotification } = get();
      setNotification({
        ...(notification.isOpen && { isOpen: false }),
        type: props?.type || "info",
        vars: props?.vars || {},
        message,
      });
      setTimeout(() => setNotification({ isOpen: true }), 500);
      setTimeout(() => setNotification({ isOpen: false }), 3500);
    },
  };
});
