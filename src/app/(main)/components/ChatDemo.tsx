"use client";

import Image from "next/image";
import { useRef, useState } from "react";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { SplitText } from "gsap/SplitText";
import type { Lang } from "../lib/constants";

gsap.registerPlugin(useGSAP, ScrollTrigger, SplitText);

const copy = {
  en: {
    question: "What does the Gita say about karma?",
    answer:
      "The Gita asks you to act with full attention and let go of your grip on the result. This is the idea behind karma yoga. Verse 2.47 says:",
    meaning: "Your right is to the action alone, never to its fruits.",
    placeholder: "Ask anything about Sanatan Dharma",
  },
  hi: {
    question: "गीता कर्म के बारे में क्या कहती है?",
    answer:
      "गीता सिखाती है कि पूरे मन से कर्म करो और फल की आसक्ति छोड़ दो। यही कर्मयोग का सार है। श्लोक 2.47 कहता है:",
    meaning: "तुम्हारा अधिकार केवल कर्म करने में है, उसके फलों में कभी नहीं।",
    placeholder: "सनातन धर्म के बारे में कुछ भी पूछें",
  },
} satisfies Record<Lang, Record<string, string>>;

/** The illustrative conversation shown in "Inside the app". Follows the page language and can be toggled to the other one. */
export default function ChatDemo({ lang, label, note, toggleLabel }: { lang: Lang; label: string; note: string; toggleLabel: string }) {
  const root = useRef<HTMLDivElement>(null);
  const started = useRef(false);
  const [shown, setShown] = useState<Lang>(lang);
  const t = copy[shown];

  // The reply "streams" word by word. The words stay in the DOM the whole time, so crawlers and screen readers see them.
  useGSAP(
    () => {
      const el = root.current;
      if (!el) return;
      const mm = gsap.matchMedia();
      mm.add("(prefers-reduced-motion: no-preference)", () => {
        const split = SplitText.create(el.querySelectorAll(".stream"), { type: "words" });
        const play = () =>
          gsap.fromTo(split.words, { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.2, stagger: 0.05, ease: "none" });

        if (started.current) {
          play();
          return () => split.revert();
        }
        gsap.set(split.words, { autoAlpha: 0 });
        const st = ScrollTrigger.create({
          trigger: el,
          start: "top 65%",
          once: true,
          onEnter: () => {
            started.current = true;
            play();
          },
        });
        return () => {
          st.kill();
          split.revert();
        };
      });
    },
    { scope: root, dependencies: [shown], revertOnUpdate: true },
  );

  return (
    <div
      ref={root}
      role="group"
      aria-label={label}
      className="overflow-hidden rounded-3xl border border-ivory/15 bg-dusk/80 shadow-[0_30px_120px_-30px_rgba(143,95,208,0.45)]"
    >
      <div className="flex items-center justify-between gap-3 border-b border-ivory/10 px-5 py-3">
        <div className="flex items-center gap-3">
          <Image src="/192x192.png" alt="Sanatana Logo" width={28} height={28} className="size-7" />
          <span className="font-display text-lg">{shown === "hi" ? "सनातन एआई" : "Sanatan AI"}</span>
        </div>
        <div className="flex items-center gap-2 text-sm">
          <span className="rounded-full border border-ember/50 px-3 py-1 text-ember hidden sm:flex">Deep Think</span>
          <div className="flex overflow-hidden rounded-full border border-ivory/20" role="group" aria-label={toggleLabel}>
            {(["en", "hi"] as const).map((l) => (
              <button
                key={l}
                type="button"
                aria-pressed={shown === l}
                onClick={() => setShown(l)}
                className={`px-3 py-1 transition-colors ${shown === l ? "bg-ivory text-night" : "text-ivory/80 hover:text-ivory"}`}
              >
                {l === "en" ? "EN" : "हिं"}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="space-y-5 px-5 py-6 md:px-7" key={shown} lang={shown}>
        <div className="flex justify-end">
          <p className="max-w-[85%] rounded-2xl rounded-br-md bg-lotus/35 px-4 py-3">{t.question}</p>
        </div>

        <div className="max-w-[92%]">
          <p className="stream text-ivory/90">{t.answer}</p>
          <blockquote lang="sa" className="mt-4 rounded-2xl border-l-2 border-ember bg-night/60 px-5 py-4">
            <p className="stream font-display text-xl leading-relaxed md:text-2xl">
              कर्मण्येवाधिकारस्ते मा फलेषु कदाचन।
              <br />
              मा कर्मफलहेतुर्भूर्मा ते सङ्गोऽस्त्वकर्मणि॥
            </p>
          </blockquote>
          <p lang={shown} className="stream mt-4 text-ivory/90">
            {t.meaning}
          </p>
        </div>
      </div>

      <div className="border-t border-ivory/10 px-5 py-4 text-sm text-ivory/55" aria-hidden="true">
        <div className="rounded-full border border-ivory/15 px-4 py-2.5">{t.placeholder}</div>
      </div>
      <p className="border-t border-ivory/10 px-5 py-2.5 text-xs text-ivory/60">{note}</p>
    </div>
  );
}
