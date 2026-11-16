"use client";

import LegalPage, { LegalSection } from "@/components/LegalPage";
import {
  Baby,
  Contact,
  Database,
  Handshake,
  Settings2,
  ShieldCheck,
} from "lucide-react";

const privacySections: LegalSection[] = [
  {
    title: "privacySectionCollect",
    icon: Database,
    items: "privacyCollect",
  },
  {
    title: "privacySectionUse",
    icon: ShieldCheck,
    items: "privacyUse",
  },
  {
    title: "privacySectionShare",
    icon: Handshake,
    items: "privacyShare",
  },
  {
    title: "privacySectionChoices",
    icon: Settings2,
    items: "privacyChoices",
  },
  {
    title: "privacySectionChildren",
    icon: Baby,
    items: ["privacyChildren"],
  },
  {
    title: "privacySectionContact",
    icon: Contact,
    items: ["privacyContact"],
  },
];

export default function Privacy() {
  return (
    <LegalPage
      eyebrow="Privacy Policy"
      title="privacyTitle"
      intro="privacyIntro"
      sections={privacySections}
      url="/privacy"
      t="hi"
    />
  );
}
