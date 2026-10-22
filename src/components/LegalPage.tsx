"use client";

import { Icon } from "@/components/Lordicon";
import { locales, t } from "@/utils/i18n";
import { Check, LucideIcon } from "lucide-react";
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
  t: "en" | "hi";
  url?: string;
};

export default function LegalPage({
  eyebrow,
  title,
  intro,
  sections,
  t: lang,
  url
}: Readonly<LegalPageProps>) {
  const language = lang;
  const shell = url || "/terms";
  return (
    <main className="page">
      <div className="shell">
        <header className="hero">
          <div>
            <p className="eyebrow">{eyebrow}</p>
            <h1 className="title">
              {t(title, {}, language)}
            </h1>
            <p className="intro">
              {t(intro, {}, language)}
            </p>
          </div>

          <div className="languageSwitch">
            <span className="languageLabel">
              <Icon src="language" target="parent*2" size={24} />
              <span className="font-display">
                {t("languageLabel", {}, language)}
              </span>
            </span>
            <div className="languageOptions" role="group" aria-label="Language">
              <button
                type="button"
                className={`languageButton ${
                  language === "en" ? "languageButtonActive" : ""
                }`}
                aria-pressed={language === "en"}
                {...(
                  language == "hi" &&  {
                    onClick: () => location.href = shell
                  }
                )}
              >
                English
              </button>
              <button
                type="button"
                className={`languageButton ${
                  language === "hi" ? "languageButtonActive" : ""
                }`}
                aria-pressed={language === "hi"}
                {...(
                  language == "en" &&  {
                    onClick: () => location.href = `${shell}/hi`
                  }
                )}
              >
                हिन्दी
              </button>
            </div>
          </div>
        </header>

        <div className="content">
          {sections.map((section, sectionIndex) => {
            const SectionIcon = section.icon;

            return (
              <section
                className="panel"
                key={section.title ?? section.items.join("-")}
                style={{ "--legal-index": sectionIndex } as CSSProperties}
              >
                {section.title && (
                  <div className="sectionHeader">
                    {SectionIcon && (
                      <span className="sectionIcon" aria-hidden="true">
                        <SectionIcon size={20} strokeWidth={2.2} />
                      </span>
                    )}
                    <h2 className="sectionTitle">
                      {t(section.title, {}, language)}
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
                        {t(item, {}, language)}
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
          {t("agreeProceed", {}, language)}
          <Icon src="arrow" target="parent" colors="primary:#ffffff,secondary:#ffffff" />
        </button>
        </div>
      </div>
    </main>
  );
}

