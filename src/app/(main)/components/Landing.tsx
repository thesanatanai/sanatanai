import { getContent } from "../lib/content";
import type { Lang } from "../lib/i18n";
import Cta from "./Cta";
import Faq from "./Faq";
import Family from "./Family";
import Features from "./Features";
import Footer from "./Footer";
import Header from "./Header";
import Hero from "./Hero";
import Inside from "./Inside";
import JsonLd from "./JsonLd";
import Marquee from "./Marquee";
import Providers from "./Providers";
import SceneLoader from "./SceneLoader";
import Stack from "./Stack";
import Story from "./Story";
import VideoStage from "./VideoStage";

export default function Landing({ lang }: Readonly<{ lang: Lang }>) {
  const t = getContent(lang);

  return (
    <Providers>
      <a
        href="#about"
        className="sr-only z-60 rounded-full bg-ember px-4 py-2 text-night focus:not-sr-only focus:fixed focus:left-4 focus:top-4"
      >
        {t.ui.skip}
      </a>
      <SceneLoader />
      <Header lang={lang} t={t.ui} />
      <main className="relative z-10">
        <Hero lang={lang} t={t.hero} hint={t.ui.scrollHint} />
        <Story t={t.story} />
        <Features t={t.features} />
        <Marquee items={t.marquee} />
       {lang == "en" && <VideoStage src="/demo.mp4" poster="/demo-poster.jpg" />}
        <Inside lang={lang} t={t.inside} />
        <Family t={t.family} calendar={t.calendar} gita={t.gita} externalLabel={t.ui.external} />
        <Stack t={t.stack} />
        <Faq t={t.faq} />
        <Cta t={t.cta} externalLabel={t.ui.external} />
      </main>
      <Footer t={t.footer} externalLabel={t.ui.external} />
      <JsonLd lang={lang} />
    </Providers>
  );
}
