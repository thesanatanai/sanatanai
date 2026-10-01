import type { Content } from "../lib/content";

export default function Stack({ t }: Readonly<{ t: Content["stack"] }>) {
  return (
    <section aria-labelledby="stack-title" className="relative px-5 py-24 md:px-8 md:py-32">
      <div className="mx-auto max-w-6xl">
        <h2 id="stack-title" data-split className="max-w-2xl text-[clamp(2rem,4.2vw,3.5rem)] leading-[1.08]">
          {t.title}
        </h2>
        <p className="mt-5 max-w-[52ch] text-lg text-ivory/75">{t.body}</p>
        <dl className="mt-14 grid gap-x-10 gap-y-10 sm:grid-cols-2 lg:grid-cols-4">
          {t.groups.map((s) => (
            <div key={s.group}>
              <dt className="font-display text-2xl text-ember">{s.group}</dt>
              <dd className="mt-3">
                <ul className="space-y-1.5 text-ivory/80">
                  {s.items.map((i) => (
                    <li key={i}>{i}</li>
                  ))}
                </ul>
              </dd>
            </div>
          ))}
        </dl>
      </div>
    </section>
  );
}
