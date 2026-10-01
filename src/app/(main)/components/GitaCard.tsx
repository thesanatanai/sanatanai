import Image from "next/image";
import type { Content } from "../lib/content";
import ButtonLink from "./ButtonLink";
import Icon from "./Lordicon";

/** A small reference to the Bhagavad Gita app: screenshot, one line, and a visit button. */
export default function GitaCard({ t, externalLabel }: Readonly<{ t: Content["gita"]; externalLabel: string }>) {
  return (
    <article id="gita" className="spot grid gap-6 rounded-3xl border border-ivory/15 bg-dusk/55 p-5 sm:grid-cols-[minmax(0,15rem)_1fr] sm:items-center md:gap-8 md:p-6">
      <Image
        src="/gita.webp"
        alt={t.imageAlt}
        width={720}
        height={540}
        unoptimized
        className="h-auto w-full rounded-2xl border border-ivory/15"
      />
      <div>
        <div className="flex items-center gap-3">
          <Icon src="gita" size={36} />
          <h3 className="text-2xl md:text-3xl">{t.title}</h3>
        </div>
        <p className="mt-4 max-w-[56ch] text-ivory/80">{t.body}</p>
        <ul className="mt-5 flex flex-wrap gap-2">
          {t.tags.map((tag) => (
            <li key={tag} className="rounded-full border border-ivory/20 px-3 py-1 text-sm text-ivory/80">
              {tag}
            </li>
          ))}
        </ul>
        <div className="mt-7">
          <ButtonLink href="https://shivamsharma999.github.io/gita" external externalLabel={externalLabel} variant="ghost" icon="arrow">
            {t.visit}
          </ButtonLink>
        </div>
      </div>
    </article>
  );
}
