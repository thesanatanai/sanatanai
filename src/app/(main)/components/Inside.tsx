import type { Content } from "../lib/content";
import type { Lang } from "../lib/i18n";
import ChatDemo from "./ChatDemo";

export default function Inside({ lang, t }: Readonly<{ lang: Lang; t: Content["inside"] }>) {
  return (
    <section aria-labelledby="inside-title" className="relative px-5 py-28 md:px-8 md:py-40">
      <div className="mx-auto grid max-w-6xl gap-16 lg:grid-cols-2 lg:gap-20">
        <div>
          <h2 id="inside-title" data-split className="text-[clamp(2.25rem,5vw,4.25rem)] leading-[1.05]">
            {t.title}
          </h2>
          <p className="mt-6 max-w-[48ch] text-lg text-ivory/75">{t.body}</p>
          <dl className="mt-12 space-y-8">
            {t.items.map((c) => (
              <div key={c.title}>
                <dt className="font-display text-2xl">{c.title}</dt>
                <dd className="mt-2 max-w-[52ch] text-ivory/75">{c.body}</dd>
              </div>
            ))}
          </dl>
        </div>
        <div className="lg:sticky lg:top-28 lg:self-start">
          <ChatDemo lang={lang} label={t.chatLabel} note={t.chatNote} toggleLabel={t.chatLang} />
        </div>
      </div>
    </section>
  );
}
