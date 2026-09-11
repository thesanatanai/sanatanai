"use client";
/*eslint-disable react-hooks/exhaustive-deps*/
import { initI18n } from "@/utils/i18n";
import { useDb } from "@/utils/utils";
import { usePathname } from "next/navigation";
import React, {
  createContext,
  useEffect,
  useMemo,
  useReducer,
  useState,
} from "react";
import manage from "./manageStart";
import Loading from "../loading";

export const All = createContext<AllProps | null>(
  null,
) as React.Context<AllProps>;
export default function AllContext(
  props: Readonly<{
    children: React.ReactNode[] | React.ReactNode;
  }>,
) {
  const [themeValue, setThemeValue] = useReducer<theme, [theme]>(
    setTheme,
    "light",
  );

  const theme = [themeValue, setThemeValue];
  const [mainTheme, setMainTheme] = useState<theme | "auto">(() => globalThis.window && (localStorage.getItem("theme") as theme ?? "auto"));
  const [fetched, setFetched] = useState(false);
  const language = useOnDb<"en" | "hi">("prefferedLocale", fetched, "en");
  const name = useOnDb("name", fetched, "");
  const picture = useOnDb("picture", fetched, "");
  const email = useOnDb("email", fetched, "");

  useEffect(() => manage({name, email, picture, language, setFetched}), []);
  useEffect(() => {
    localStorage.setItem("theme", mainTheme);
    if (mainTheme == "auto") handleTheme(setThemeValue);
    else setThemeValue(mainTheme);
  }, [mainTheme]);
  useEffect(() => initI18n(language[0]));
  const [message, setMessage] = useState<string>("");
  const [type, setType] = useState<"info" | "success" | "error">("info");
  const [isOpen, setIsOpen] = useState<boolean>(false);
  const [isLang, setIsLang] = useState<boolean>(false);
  const [vars, setVars] = useState<Record<string, string>>({});

  const userData = useMemo<AllProps["userData"]>(
    () => ({
      name,
      email,
      picture,
      language,
      mainTheme: [mainTheme, setMainTheme],
    }),
    [name, email, picture, language, mainTheme, setMainTheme],
  );

  // Memorize notification values to boost performance
  const notification = useMemo<AllProps["notification"]>(
    () => ({
      message: [message, setMessage],
      type: [type, setType],
      isOpen: [isOpen, setIsOpen],
      isLang: [isLang, setIsLang],
      vars: [vars, setVars],
    }),
    [message, type, isOpen, isLang, vars],
  );

  const values = useMemo<AllProps>(
    () => ({
      // Memorize all values
      theme: theme as uStat<theme>,
      userData,
      notification,
    }),
    [theme, userData, notification],
  );
  const path = usePathname();

  return (
    <All.Provider value={values}>
      {!(fetched || path.includes("welcome")) ? <Loading /> : props.children}
      </All.Provider>
  );
}

function handleTheme(setter: (value: theme) => void) {
  const preffered = globalThis.matchMedia("(prefers-color-scheme: dark)");
  if (preffered.matches) {
    setter("dark"); // Set theme to dark
  } else setter("light"); // Set theme to light
  preffered.onchange = () => handleTheme(setter);
}

export type usedOnDb<K> = [K, (val: K | ((value: K) => K), update?: boolean) => void];

/**
 * Works same as {@link useState}, as an alternative to it, which also updates value on database
 * @param name 
 * @param fetched 
 * @param initial 
 * @returns 
 */
function useOnDb<K extends string>(
  name: "name" | "email" | "picture" | "prefferedLocale",
  fetched: boolean,
  initial = "",
): usedOnDb<K> {
  const [value, setValue] = useState(initial);
  const setOnDb = useDb(fetched);
  const pathname = usePathname();

  // Update value on database also
  function update(val: K | ((value: K) => K), onDb = true) {
    if (val === value) return;
    const final = typeof val == "function" ? val(value as K) : val;
    setValue(final);
    if (pathname == "/" && onDb) setOnDb(name, final);
  }

  return [value as K, update];
}

/**
 * Sets the visible theme of app.
 * Also changes the theme color so that app could work perfectly in mobiles and PWAs.
 * @param newTheme The new theme to be applied
 */
function setTheme(_: theme, newTheme: theme) {
  if(!globalThis.window) return newTheme;
  const meta = document.querySelector(
    `meta[name="theme-color"]`,
  ) as HTMLMetaElement;
  if (meta) {
    document?.body?.classList[newTheme == "light" ? "add" : "remove"](
        "light_mode");
    switch (newTheme) {
      case "light": {
        meta.content = "#ffffff";
        break;
      }
      case "dark": {
        meta.content = "#000000";
        break;
      }
      default: {
        meta.content = "#000000";
      }
    }
  }
  return newTheme;
}
