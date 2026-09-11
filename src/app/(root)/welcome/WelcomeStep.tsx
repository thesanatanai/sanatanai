"use client";
import Image from "next/image";
import { Language, useT } from "@/utils/i18n";
import { useContext } from "react";
import { All } from "../AllContext";
import Lordicon from "@/components/Lordicon";
import Auth from "./Auth";
import jsCookie from "js-cookie";

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
          <code className="font-display">
            <Language need="languageLabel" />:
          </code>
        </label>
        <div className="center-flex gap-1 cursor-pointer">
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
      <h2 className="welcome-subtext text-center text-xl">
        <Language need="termsAgree" />
      </h2>
      <button
        id="agree-btn"
        className="welcomeButton center-flex"
        onClick={() => {
          localStorage.setItem("termsAgreed", "true");
          props.setStep("google");
        }}
      >
        <Language need="agreeProceed" />
        <Lordicon src="arrow" target="parent" colors="primary:#ffffff,secondary:#ffffff" />
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
      <h1 className="welcome-text fromTop font-display animated-gradient-text">
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
          jsCookie.set("setupComplete", "true", {
            expires: 365,
          });
          globalThis.localStorage.removeItem("emailVerified");
          globalThis.localStorage.removeItem("termsAgreed");
          globalThis.location.href = "/";
        }}
      >
        <span>
          <Language need="startAi" />
        </span>
        <Lordicon src="arrow" target="parent" colors="primary:#ffffff,secondary:#ffffff" />
      </button>
    </>
  );
}
