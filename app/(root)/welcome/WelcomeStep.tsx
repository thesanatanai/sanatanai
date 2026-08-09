"use client";
import Image from "next/image";
import { Language, useT } from "@/utils/i18n";
import { useContext } from "react";
import { All } from "../AllContext";
import Lordicon from "@/components/Lordicon";
import Auth from "./Auth";

export default function Step(
  props: Readonly<{
    step: string;
    setStep: (step: "customize" | "google" | "terms") => void;
  }>,
) {
  const step = props.step;
  return (
    <div id={`${step}-step`} className="welcome-step col">
      {(function () {
        if (step == "customize") {
          return <Customize />;
        } else if (step == "google") {
          return <Auth setStep={props.setStep} />;
        } else return <Terms setStep={props.setStep} />;
      })()}
    </div>
  );
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function Terms(props: any) {
  const [language, setLanguage] = useContext(All).userData.language;
  return (
    <>
      <h1 className="logoTxt welcome-title animated-gradient-text">
        <Language need="siteTitle" />
      </h1>
      <div className="center-flex gap-5">
        <label className="center-flex gap-1">
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
      <h2 className="welcome-subtext">
        <Language need="termsTitle" />
      </h2>
      <div className="terms-box">
        <p>
          <Language need="termsIntro" />
        </p>
        <ul>
          <li>
            <Language need="termsList1" />
          </li>
          <li>
            <Language need="termsList2" />
          </li>
          <li>
            <Language need="termsList3" />
          </li>
          <li>
            <Language need="termsList4" />
          </li>
          <li>
            <Language need="termsList5" />
          </li>
          <li>
            <Language need="termsList6" />
          </li>
          <li>
            <Language need="termsList7" />
          </li>
        </ul>
      </div>
      <button
        id="agree-btn"
        className="welcomeButton center-flex"
        onClick={() => {
          localStorage.setItem("termsAgreed", "true");
          props.setStep("google");
        }}
      >
        <Language need="agreeProceed" />
        <Lordicon src="arrow" target="parent" />
      </button>
    </>
  );
}

function Customize() {
  const name = useContext(All).userData.name;
  const t = useT();
  return (
    <>
      <div className="imgWrapper center-flex float-animation">
        <Image
          src="/logo.png"
          width={200}
          height={200}
          loading="eager"
          preload
          alt="Sanatan Logo"
          className="logo-glow"
          draggable="false"
        />
      </div>
      <h1 className="welcome-text fromTop animated-gradient-text">
        <Language need="almostThere" />
      </h1>
      <h2 className="welcome-subtext fromLeft">
        <Language need="tellAboutYou" />
      </h2>
      <div className="input-group col customize-group">
        <label htmlFor="welcome-name-input">
          <Language need="enterNameLabel" />
        </label>
        <input
          type="text"
          id="welcome-name-input"
          value={name[0]}
          onChange={(e) => name[1](e.target.value)}
          className="modern-input"
          placeholder={t("enterNameLabel")}
        />
      </div>
      <button
        id="finish-setup-btn"
        className="welcomeButton center-flex pulse-animation"
        onClick={() => {
          globalThis.cookieStore.set({
            name: "setupComplete",
            value: "true",
            expires: Date.now() + 365 * 24 * 3600 * 1000,
            domain: globalThis.location.hostname,
          });
          globalThis.localStorage.removeItem("emailVerified");
          globalThis.localStorage.removeItem("termsAgreed");
          globalThis.location.href = "/";
        }}
      >
        <span>
          <Language need="startAi" />
        </span>
        <Lordicon src="arrow" target="parent" />
      </button>
    </>
  );
}
