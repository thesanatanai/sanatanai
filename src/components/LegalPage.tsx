"use client";

import Lordicon from "@/components/Lordicon";
import { All } from "@/app/(root)/AllContext";
import { Language, locales } from "@/utils/i18n";
import { Check, LucideIcon } from "lucide-react";
import { useContext } from "react";
import type { CSSProperties } from "react";
import styles from "./LegalPage.module.css";

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
    <main className={styles.page}>
      <div className={styles.shell}>
        <header className={styles.hero}>
          <div>
            <p className={styles.eyebrow}>{eyebrow}</p>
            <h1 className={`${styles.title} animated-gradient-text`}>
              <Language need={title} />
            </h1>
            <p className={styles.intro}>
              <Language need={intro} />
            </p>
          </div>

          <div className={styles.languageSwitch}>
            <span className={styles.languageLabel}>
              <Lordicon src="language" target="parent*2" size={24} />
              <span className="font-display">
                <Language need="languageLabel" />
              </span>
            </span>
            <div className={styles.languageOptions} role="group" aria-label="Language">
              <button
                type="button"
                className={`${styles.languageButton} ${
                  language === "en" ? styles.languageButtonActive : ""
                }`}
                aria-pressed={language === "en"}
                onClick={() => setLanguage("en")}
              >
                English
              </button>
              <button
                type="button"
                className={`${styles.languageButton} ${
                  language === "hi" ? styles.languageButtonActive : ""
                }`}
                aria-pressed={language === "hi"}
                onClick={() => setLanguage("hi")}
              >
                हिन्दी
              </button>
            </div>
          </div>
        </header>

        <div className={styles.content}>
          {sections.map((section, sectionIndex) => {
            const Icon = section.icon;

            return (
              <section
                className={styles.panel}
                key={section.title ?? section.items.join("-")}
                style={{ "--legal-index": sectionIndex } as CSSProperties}
              >
                {section.title && (
                  <div className={styles.sectionHeader}>
                    {Icon && (
                      <span className={styles.sectionIcon} aria-hidden="true">
                        <Icon size={20} strokeWidth={2.2} />
                      </span>
                    )}
                    <h2 className={styles.sectionTitle}>
                      <Language need={section.title} />
                    </h2>
                  </div>
                )}

                <ul className={styles.list}>
                  {section.items.map((item, itemIndex) => (
                    <li
                      className={styles.item}
                      key={item}
                      style={{ "--item-index": itemIndex } as CSSProperties}
                    >
                      <span className={styles.marker} aria-hidden="true">
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

        <div className={styles.footer}>
          
        <button
          id="agree-btn"
          className={`welcomeButton center-flex ${styles.action}`}
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

export { styles as legalPageStyles };
