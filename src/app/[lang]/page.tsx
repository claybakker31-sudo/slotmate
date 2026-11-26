import { notFound } from "next/navigation";
import { Suspense } from "react";
import { AuthStatusBar } from "@/components/auth/AuthStatusBar";
import { SlotMateShell } from "@/components/SlotMateShell";
import { isLocale } from "@/i18n/config";
import { getDictionary } from "@/i18n/get-dictionary";

export default async function LocaleHomePage({
  params,
  searchParams,
}: PageProps<"/[lang]">) {
  const { lang } = await params;

  if (!isLocale(lang)) {
    notFound();
  }

  const dict = await getDictionary(lang);

  return (
    <SlotMateShell
      locale={lang}
      dict={dict}
      authSlot={
        <Suspense
          fallback={
            <div className="h-[54px] animate-pulse rounded-2xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900" />
          }
        >
          <AuthStatusBar
            locale={lang}
            authCopy={dict.auth}
            searchParams={searchParams}
          />
        </Suspense>
      }
    />
  );
}
