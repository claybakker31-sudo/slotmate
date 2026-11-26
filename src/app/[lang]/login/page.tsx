import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { Suspense } from "react";
import type { AuthErrorCode } from "@/app/[lang]/auth/actions";
import { AuthShell } from "@/components/auth/AuthShell";
import { LoginForm } from "@/components/auth/LoginForm";
import { isLocale, type Locale } from "@/i18n/config";
import { getDictionary, type Dictionary } from "@/i18n/get-dictionary";
import { getCurrentUser } from "@/lib/supabase/auth";
import { getSafeRedirectPath } from "@/lib/supabase/env";

export async function generateMetadata({
  params,
}: PageProps<"/[lang]/login">): Promise<Metadata> {
  const { lang } = await params;
  if (!isLocale(lang)) {
    return { title: "SlotMate" };
  }

  const dict = await getDictionary(lang);
  return {
    title: dict.auth.login.metaTitle,
    description: dict.auth.login.metaDescription,
  };
}

function parseInitialError(errorParam: string | string[] | undefined): AuthErrorCode | undefined {
  const value = Array.isArray(errorParam) ? errorParam[0] : errorParam;
  if (value === "callback_failed") {
    return "callbackFailed";
  }
  return undefined;
}

async function LoginContent({
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

  const initialErrorCode = parseInitialError(resolvedSearchParams.error);
  const loggedOut = resolvedSearchParams.logged_out === "1";

  return (
    <LoginForm
      locale={locale}
      copy={dict.auth.login}
      errors={dict.auth.errors}
      nextPath={nextPath}
      initialErrorCode={initialErrorCode}
      loggedOut={loggedOut}
    />
  );
}

export default async function LoginPage({
  params,
  searchParams,
}: PageProps<"/[lang]/login">) {
  const { lang } = await params;

  if (!isLocale(lang)) {
    notFound();
  }

  const dict = await getDictionary(lang);

  return (
    <AuthShell locale={lang} dict={dict}>
      <Suspense
        fallback={
          <div className="h-80 animate-pulse rounded-3xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900" />
        }
      >
        <LoginContent locale={lang} dict={dict} searchParams={searchParams} />
      </Suspense>
    </AuthShell>
  );
}
