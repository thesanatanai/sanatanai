"use client";

import LegalPage, { LegalSection } from "@/components/LegalPage";

const termsSections: LegalSection[] = [
  {
    items: "termsList"
  },
];

export default function Terms() {
  return (
    <LegalPage
      eyebrow="Terms of Service"
      title="termsTitle"
      intro="termsIntro"
      sections={termsSections}
      t="en"
    />
  );
}
