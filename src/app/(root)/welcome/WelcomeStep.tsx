"use client";
import { Language } from "@/utils/i18n";
import { useContext } from "react";
import { All } from "../AllContext";
import Lordicon from "@/components/Lordicon";
import Auth from "./Auth";

export default function Step(
  props: Readonly<{
    step: string;
    setStep: (step: "google" | "terms") => void;
  }>,
) {
  const step = props.step;
  return (
    <div id={`${step}-step`} className="welcome-step col">
      {(function () {
        if (step == "google") {
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
