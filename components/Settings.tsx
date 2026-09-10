"use client";
import "@/css/settings.css";
import { SettingsIcon } from "lucide-react";
import Lordicon from "./Lordicon";
import { All } from "@/app/(root)/AllContext";
import { useContext } from "react";
import { Language, useT } from "@/utils/i18n";
import { useNotification } from "./Notification";
import PageContext from "@/app/(root)/PageContext";

export default function Settings() {
  const {
    userData: {
      language: [language, setTheLanguage],
      name: [name, setName],
      mainTheme: [theme, setTheTheme],
    },
  } = useContext(All);
  const {
    settingsOpen: [open, setShow],
    userData: {
      persona: [custom, setCustom],
    },
  } = useContext(PageContext);

  const notification = useNotification();
  const t = useT();
  const setTheme = modifySetter(setTheTheme, t("themeLabel"), notification);
  const setLanguage = modifySetter(setTheLanguage, t("languageLabel"), notification);
  return (
    <>
      {open ? (
        <div className={`fullscreen block`}>
          <div className="settings glass-dark" id="settings-popup">
            <div className="settings-header">
              <h2 className="gradient-text font-display">
                <SettingsIcon />
                <span><Language need="settingsTitle" /></span>
              </h2>
              <button
                className="close-btn"
                id="close-settings"
                onClick={() => setShow(false)}
              >
                ✕
              </button>
            </div>
            <div className="settings-body">
              <SettingItem className="name-input">
                <label htmlFor="name">
                  <Lordicon src="avatar" target="parent*2" />
                  <code>
                    <Language need="nameLabel" />
                  </code>
                </label>
                <input
                  type="text"
                  autoComplete="true"
                  className="modern-input"
                  id="name"
                  placeholder={t("enterNameLabel")}
                  defaultValue={name}
                  onBlur={(e) => setName(e.target.value)}
                />
              </SettingItem>
              <SettingItem className="col gap-[inherit]">
                <div className="flex md:gap-[inherit]">
                  <label>
                    <Lordicon src="theme" target="parent*2" />
                    <code>
                      <Language need="themeLabel" />:
                    </code>
                  </label>
                  <div className="center-flex gap-1 cursor-pointer">
                    <span
                      className={`rounded-xl transition-all pb-1 pt-1 pl-2 pr-2 ${theme == "light" ? "bg-blue-500" : ""}`}
                      onClick={() => {
                        setTheme("light");
                      }}
                    >
                      <Language need="themeLight" />
                    </span>
                    <span
                      className={`rounded-xl transition-all pb-1 pt-1 pl-2 pr-2 ${theme == "dark" ? "bg-blue-500" : ""}`}
                      onClick={() => setTheme("dark")}
                    >
                      <Language need="themeDark" />
                    </span>
                    <span
                      className={`rounded-xl transition-all pb-1 pt-1 pl-2 pr-2 ${theme == "auto" ? "bg-blue-500" : ""}`}
                      onClick={() => setTheme("auto")}
                    >
                      <Language need="themeAuto" />
                    </span>
                  </div>
                </div>
                <div className="flex gap-[inherit]">
                  <label>
                    <Lordicon src="language" target="parent*2" />
                    <code>
                      <Language need="languageLabel" />:
                    </code>
                  </label>
                  <div className="center-flex gap-1">
                    <span
                      className={`rounded-xl transition-all pb-1 pt-1 pl-2 pr-2 ${language == "en" ? "bg-green-500" : ""}`}
                      onClick={() => setLanguage("en")}
                    >
                      English
                    </span>
                    <span
                      className={`rounded-xl transition-all pb-1 pt-1 pl-2 pr-2 ${language == "hi" ? "bg-green-500" : ""}`}
                      onClick={() => setLanguage("hi")}
                    >
                      हिन्दी
                    </span>
                  </div>
                </div>
              </SettingItem>
              <SettingItem className="col">
                <label>
                  <Language need="chatActions" />
                </label>
                <button className="btn-gradient mb-2 gap-1 center-flex">
                  <Lordicon src="trash" target="parent" />
                  <Language need="deleteAllMessages" />
                </button>
                <button className="btn-gradient gap-1 center-flex">
                  <Lordicon src="manage" target="parent" />
                  <Language need="manageAIMemory" />
                </button>
              </SettingItem>
              <SettingItem className="col">
                <label>
                  <Language need="import" />
                </label>
                <button className="btn-gradient center-flex gap-1 mb-2">
                  <Lordicon src="import" target="parent" />
                  <Language need="importChat" />
                </button>
                <button
                  className="btn-gradient gap-1 center-flex"
                  onClick={() => notification("Successfully exported")}
                >
                  <Lordicon src="export" target="parent" />
                  <Language need="exportChat" />
                </button>
              </SettingItem>
            </div>
            <SettingItem className="min-w-full mt-5">
              <label>
                <Lordicon src="persona" target="parent*2" />
                <code className="flex">
                  <Language need="persona" />:
                </code>
              </label>
              <textarea
                value={custom}
                onChange={(e) => setCustom(e.target.value)}
                className="modern-input resize-none h-40"
              />
            </SettingItem>
          </div>
        </div>
      ) : (
        <></>
      )}
    </>
  );
};

function SettingItem(props: Record<string, React.ReactNode>) {
  return (
    <div
      className={`setting-item ${props.className ? " " + props.className : ""}`}
    >
      {props.children}
    </div>
  );
}

/**
 * Modify a setter function to notify when changed
 * @param setter The setter function
 * @param name The name of setting changed (Prefer with {@link useT})
 * @param notification 
 * @returns The new modified setter
 */
function modifySetter<K>(
  setter: (val: K) => void,
  name: string,
  notification: ReturnType<typeof useNotification<true>>,
) {
  return (val: K) => {
    setter(val);
    notification("changedSetting", {
      type: "success",
      vars: { setting: name },
      language: true,
    });
  };
}