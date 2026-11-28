"use client";
import { initI18n } from "@/utils/i18n";
import { useAppStore } from "@/stores/appStore";
import React, { useEffect } from "react";
import manage from "./manageStart";

/**
 * Starts the app (theme, language, service worker). The chat page brings its own user
 * and chats, and shows the loading screen until they are in place (see `ChatStoreProvider`).
 * The state itself lives in {@link useAppStore}.
 */
export default function AppBootstrap(
  props: Readonly<{
    children: React.ReactNode[] | React.ReactNode;
  }>,
) {
  const language = useAppStore((s) => s.language);

  useEffect(() => {
    useAppStore.getState().initTheme();
    manage();
  }, []);
  useEffect(() => initI18n(language), [language]);

  return props.children;
}
