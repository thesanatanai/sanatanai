import type { Content } from "../lib/content";
import CalendarShowcase from "./CalendarShowcase";
import GitaCard from "./GitaCard";

/** "More from Sanatan AI": the Calendar showcase and a small Gita reference, one below the other. */
export default function Family({
  t,
  calendar,
  gita,
  externalLabel,
}: Readonly<{
  t: Content["family"];
  calendar: Content["calendar"];
  gita: Content["gita"];
  externalLabel: string;
}>) {
  return (
    <section id="calendar" aria-labelledby="family-title" className="relative px-5 py-28 md:px-8 md:py-40">
      <div className="mx-auto max-w-6xl">
        <h2 id="family-title" data-split className="text-[clamp(2.25rem,5vw,4.25rem)] leading-[1.05]">
          {t.title}
        </h2>
        <p className="mt-6 max-w-[48ch] text-lg text-ivory/75">{t.body}</p>

        <div className="mt-16 md:mt-20">
          <CalendarShowcase t={calendar} url="https://calendar.shivam.click/" externalLabel={externalLabel} />
        </div>

        <div className="mt-20 md:mt-24">
          <GitaCard t={gita} externalLabel={externalLabel} />
        </div>
      </div>
    </section>
  );
}
