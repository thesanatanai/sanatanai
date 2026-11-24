"use client";
import { initI18n } from "@/utils/i18n";
import { useAppStore } from "@/stores/appStore";
import { usePathname } from "next/navigation";
import React, { useEffect } from "react";
import manage from "./manageStart";
import Loading from "../loading";

/**
 * Starts the app (theme, language, service worker, profile) and holds `/app`
 * back behind the loading screen until the profile has loaded.
 * The state itself lives in {@link useAppStore}.
 */
export default function AppBootstrap(
  props: Readonly<{
    children: React.ReactNode[] | React.ReactNode;
  }>,
) {
  const fetched = useAppStore((s) => s.fetched);
  const language = useAppStore((s) => s.language);
  const path = usePathname();

  useEffect(() => {
    useAppStore.getState().initTheme();
    manage();
  }, []);
  useEffect(() => initI18n(language), [language]);

  return !(fetched || path !== "/app") ? <Loading /> : props.children;
}
