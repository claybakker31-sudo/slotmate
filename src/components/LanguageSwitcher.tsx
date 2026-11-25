"use client";

import Link from "next/link";
import { persistLocaleCookie } from "@/hooks/useBrowserStatus";
import { localeMeta, locales, type Locale } from "@/i18n/config";

interface LanguageSwitcherProps {
  currentLocale: Locale;
  label: string;
}

export function LanguageSwitcher({ currentLocale, label }: LanguageSwitcherProps) {
  return (
    <nav
      aria-label={label}
      className="flex items-center gap-1 rounded-full border border-slate-200 bg-slate-100/90 p-1 dark:border-slate-800 dark:bg-slate-900"
    >
      {locales.map((code) => {
        const meta = localeMeta[code];
        const isActive = code === currentLocale;
        return (
          <Link
            key={code}
            href={`/${code}`}
            onClick={() => persistLocaleCookie(code)}
            aria-current={isActive ? "page" : undefined}
            aria-label={meta.nativeName}
            title={meta.nativeName}
            className={`min-h-[34px] min-w-[38px] inline-flex items-center justify-center rounded-full px-2.5 text-xs font-semibold transition-colors ${
              isActive
                ? "bg-teal-700 text-white shadow-sm"
                : "text-slate-600 hover:bg-white hover:text-slate-900 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-white"
            }`}
          >
            {meta.label}
          </Link>
        );
      })}
    </nav>
  );
}
