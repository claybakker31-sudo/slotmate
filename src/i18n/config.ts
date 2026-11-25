export const locales = ["it", "en", "ar", "es"] as const;

export type Locale = (typeof locales)[number];

export const defaultLocale: Locale = "it";

export const LOCALE_COOKIE_NAME = "slotmate_locale";

export interface LocaleMeta {
  code: Locale;
  label: string;
  nativeName: string;
  dir: "ltr" | "rtl";
}

export const localeMeta: Record<Locale, LocaleMeta> = {
  it: {
    code: "it",
    label: "IT",
    nativeName: "Italiano",
    dir: "ltr",
  },
  en: {
    code: "en",
    label: "EN",
    nativeName: "English",
    dir: "ltr",
  },
  ar: {
    code: "ar",
    label: "AR",
    nativeName: "العربية",
    dir: "rtl",
  },
  es: {
    code: "es",
    label: "ES",
    nativeName: "Español",
    dir: "ltr",
  },
};

export function isLocale(value: string): value is Locale {
  return (locales as readonly string[]).includes(value);
}

export function getDirection(locale: Locale): "ltr" | "rtl" {
  return localeMeta[locale].dir;
}
