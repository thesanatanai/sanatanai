"use client";

import Lordicon from "@/components/Lordicon";
import { All } from "@/app/(root)/AllContext";
import { Language, locales } from "@/utils/i18n";
import { Check, LucideIcon } from "lucide-react";
import { useContext } from "react";
import type { CSSProperties } from "react";
import "@/css/legalPage.css";

type LanguageKey = keyof typeof locales.en;

export type LegalSection = {
  title?: LanguageKey;
  items: LanguageKey[];
  icon?: LucideIcon;
};

type LegalPageProps = {
  eyebrow: string;
  title: LanguageKey;
  intro: LanguageKey;
  sections: LegalSection[];
};

export default function LegalPage({
  eyebrow,
  title,
  intro,
  sections
}: Readonly<LegalPageProps>) {
  const [language, setLanguage] = useContext(All).userData.language;

  return (
    <main className="page">
      <div className="shell">
        <header className="hero">
          <div>
            <p className="eyebrow">{eyebrow}</p>
            <h1 className="title">
              <Language need={title} />
            </h1>
            <p className="intro">
              <Language need={intro} />
            </p>
          </div>

          <div className="languageSwitch">
            <span className="languageLabel">
              <Lordicon src="language" target="parent*2" size={24} />
              <span className="font-display">
                <Language need="languageLabel" />
              </span>
            </span>
            <div className="languageOptions" role="group" aria-label="Language">
              <button
                type="button"
                className={`languageButton ${
                  language === "en" ? "languageButtonActive" : ""
                }`}
                aria-pressed={language === "en"}
                onClick={() => setLanguage("en")}
              >
                English
              </button>
              <button
                type="button"
                className={`languageButton ${
                  language === "hi" ? "languageButtonActive" : ""
                }`}
                aria-pressed={language === "hi"}
                onClick={() => setLanguage("hi")}
              >
                हिन्दी
              </button>
            </div>
          </div>
        </header>

        <div className="content">
          {sections.map((section, sectionIndex) => {
            const Icon = section.icon;

            return (
              <section
                className="panel"
                key={section.title ?? section.items.join("-")}
                style={{ "--legal-index": sectionIndex } as CSSProperties}
              >
                {section.title && (
                  <div className="sectionHeader">
                    {Icon && (
                      <span className="sectionIcon" aria-hidden="true">
                        <Icon size={20} strokeWidth={2.2} />
                      </span>
                    )}
                    <h2 className="sectionTitle">
                      <Language need={section.title} />
                    </h2>
                  </div>
                )}

                <ul className="list">
                  {section.items.map((item, itemIndex) => (
                    <li
                      className="item"
                      key={item}
                      style={{ "--item-index": itemIndex } as CSSProperties}
                    >
                      <span className="marker" aria-hidden="true">
                        <Check size={14} strokeWidth={3} />
                      </span>
                      <span>
                        <Language need={item} />
                      </span>
                    </li>
                  ))}
                </ul>
              </section>
            );
          })}
        </div>

        <div className="footer">
          
        <button
          id="agree-btn"
          className={`welcomeButton center-flex action`}
          onClick={() => {
            window.location.href = "/welcome";
          }}
        >
          <Language need="agreeProceed" />
          <Lordicon src="arrow" target="parent" colors="primary:#ffffff,secondary:#ffffff" />
        </button>
        </div>
      </div>
    </main>
  );
}

