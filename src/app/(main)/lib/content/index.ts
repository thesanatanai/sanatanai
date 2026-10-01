import type { Lang } from "../i18n";
import { en } from "./en";
import { hi } from "./hi";
import type { Content } from "./types";

const dictionaries: Record<Lang, Content> = { en, hi };

export const getContent = (lang: Lang): Content => dictionaries[lang];
export type { Content } from "./types";
