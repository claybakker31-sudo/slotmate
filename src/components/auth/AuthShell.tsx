import Link from "next/link";
import type { ReactNode } from "react";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import type { Locale } from "@/i18n/config";
import type { Dictionary } from "@/i18n/get-dictionary";

interface AuthShellProps {
  locale: Locale;
  dict: Dictionary;
  children: ReactNode;
}

export function AuthShell({ locale, dict, children }: AuthShellProps) {
  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 dark:bg-slate-950 dark:text-slate-50">
      <header className="sticky top-0 z-30 border-b border-slate-200/80 bg-white/90 backdrop-blur-md dark:border-slate-800 dark:bg-slate-950/90">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-3 px-4 py-3 sm:px-6">
          <Link
            href={`/${locale}`}
            className="flex items-center gap-3 transition-opacity hover:opacity-85"
          >
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-teal-700 text-sm font-bold text-white shadow-sm">
              SM
            </div>
            <div>
              <span className="block text-base font-bold tracking-tight text-slate-900 dark:text-white">
                {dict.header.brand}
              </span>
              <span className="block text-xs text-slate-500 dark:text-slate-400">
                {dict.auth.header.backToHome}
              </span>
            </div>
          </Link>

          <LanguageSwitcher currentLocale={locale} label={dict.header.languageLabel} />
        </div>
      </header>

      <main className="mx-auto flex w-full max-w-md flex-col px-4 py-8 sm:px-6 sm:py-12">
        {children}
      </main>
    </div>
  );
}
