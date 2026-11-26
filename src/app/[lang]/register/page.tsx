import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { Suspense } from "react";
import { AuthShell } from "@/components/auth/AuthShell";
import { RegisterForm } from "@/components/auth/RegisterForm";
import { isLocale, type Locale } from "@/i18n/config";
import { getDictionary, type Dictionary } from "@/i18n/get-dictionary";
import { getCurrentUser } from "@/lib/supabase/auth";
import { getSafeRedirectPath } from "@/lib/supabase/env";

export async function generateMetadata({
  params,
}: PageProps<"/[lang]/register">): Promise<Metadata> {
  const { lang } = await params;
  if (!isLocale(lang)) {
    return { title: "SlotMate" };
  }

  const dict = await getDictionary(lang);
  return {
    title: dict.auth.register.metaTitle,
    description: dict.auth.register.metaDescription,
  };
}

async function RegisterContent({
  locale,
  dict,
  searchParams,
}: {
  locale: Locale;
  dict: Dictionary;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const resolvedSearchParams = await searchParams;
  const rawNext = Array.isArray(resolvedSearchParams.next)
    ? resolvedSearchParams.next[0]
    : resolvedSearchParams.next;
  const nextPath = getSafeRedirectPath(rawNext, `/${locale}`);

  const user = await getCurrentUser();
  if (user) {
    redirect(nextPath);
  }

  return (
    <RegisterForm
      locale={locale}
      copy={dict.auth.register}
      loginCopy={dict.auth.login}
      errors={dict.auth.errors}
      nextPath={nextPath}
    />
  );
}

export default async function RegisterPage({
  params,
  searchParams,
}: PageProps<"/[lang]/register">) {
  const { lang } = await params;

  if (!isLocale(lang)) {
    notFound();
  }

  const dict = await getDictionary(lang);

  return (
    <AuthShell locale={lang} dict={dict}>
      <Suspense
        fallback={
          <div className="h-96 animate-pulse rounded-3xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900" />
        }
      >
        <RegisterContent locale={lang} dict={dict} searchParams={searchParams} />
      </Suspense>
    </AuthShell>
  );
}
