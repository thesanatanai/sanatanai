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
    items: ["privacyCollect1", "privacyCollect2", "privacyCollect3", "privacyCollect4"],
  },
  {
    title: "privacySectionUse",
    icon: ShieldCheck,
    items: ["privacyUse1", "privacyUse2", "privacyUse3", "privacyUse4", "privacyUse5"],
  },
  {
    title: "privacySectionShare",
    icon: Handshake,
    items: ["privacyShare1", "privacyShare2"],
  },
  {
    title: "privacySectionChoices",
    icon: Settings2,
    items: ["privacyChoices1", "privacyChoices2", "privacyChoices3", "privacyChoices4"],
  },
  {
    title: "privacySectionChildren",
    icon: Baby,
    items: ["privacyChildren1"],
  },
  {
    title: "privacySectionContact",
    icon: Contact,
    items: ["privacyContact1"],
  },
];

export default function Privacy() {
  return (
    <LegalPage
      eyebrow="Privacy Policy"
      title="privacyTitle"
      intro="privacyIntro"
      sections={privacySections}
    />
  );
}
