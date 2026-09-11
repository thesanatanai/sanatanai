"use client";

import LegalPage, { LegalSection } from "@/components/LegalPage";

const termsSections: LegalSection[] = [
  {
    items: [
      "termsList1",
      "termsList2",
      "termsList3",
      "termsList4",
      "termsList5",
      "termsList6",
      "termsList7",
      "termsList8",
      "termsList9",
      "termsList10",
      "termsList11",
      "termsList12",
    ],
  },
];

export default function Terms() {
  return (
    <LegalPage
      eyebrow="Terms of Service"
      title="termsTitle"
      intro="termsIntro"
      sections={termsSections}
    />
  );
}
