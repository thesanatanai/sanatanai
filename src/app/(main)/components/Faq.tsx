import type { Content } from "../lib/content";

export default function Faq({ t }: Readonly<{ t: Content["faq"] }>) {
  return (
    <section id="faq" aria-labelledby="faq-title" className="relative px-5 py-28 md:px-8 md:py-40">
      <div className="mx-auto max-w-3xl">
        <h2 id="faq-title" data-split className="text-[clamp(2.25rem,5vw,4.25rem)] leading-[1.05]">
          {t.title}
        </h2>
        <div className="mt-12 divide-y divide-ivory/15 border-y border-ivory/15">
          {t.items.map((f, i) => (
            <details key={f.q} className="group py-1" open={i === 0}>
              <summary className="flex cursor-pointer items-center justify-between gap-6 py-5 font-display text-xl md:text-2xl">
                {f.q}
                <span aria-hidden="true" className="faq-plus shrink-0 text-3xl leading-none text-ember">
                  +
                </span>
              </summary>
              <p className="max-w-[60ch] pb-6 text-lg text-ivory/75">{f.a}</p>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}
