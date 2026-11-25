import "server-only";
import type { Locale } from "./config";

export type Dictionary = typeof import("./dictionaries/it.json");

const dictionaries: Record<Locale, () => Promise<Dictionary>> = {
  it: () => import("./dictionaries/it.json").then((module) => module.default),
  en: () => import("./dictionaries/en.json").then((module) => module.default),
  ar: () => import("./dictionaries/ar.json").then((module) => module.default),
  es: () => import("./dictionaries/es.json").then((module) => module.default),
};

export async function getDictionary(locale: Locale): Promise<Dictionary> {
  return dictionaries[locale]();
}
