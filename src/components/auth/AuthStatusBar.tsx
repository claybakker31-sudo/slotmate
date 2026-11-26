import { connection } from "next/server";
import Link from "next/link";
import type { Locale } from "@/i18n/config";
import type { Dictionary } from "@/i18n/get-dictionary";
import { getDashboardData } from "@/lib/supabase/dashboard";
import { LogoutButton } from "./LogoutButton";
import { SessionSync } from "./SessionSync";

interface AuthStatusBarProps {
  locale: Locale;
  authCopy: Dictionary["auth"];
  dashboardCopy: Dictionary["dashboard"];
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}

export async function AuthStatusBar({
  locale,
  authCopy,
  dashboardCopy,
  searchParams,
}: AuthStatusBarProps) {
    await connection();
    const [data, resolvedSearchParams] = await Promise.all([
    getDashboardData(),
    searchParams ?? Promise.resolve({} as Record<string, string | string[] | undefined>),
  ]);

  const isConfirmed = resolvedSearchParams.auth === "confirmed";
  const user = data.profile;

  return (
    <section
      aria-label={dashboardCopy.authBadge}
      className="rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-xs dark:border-slate-800 dark:bg-slate-900"
    >
      <SessionSync />

      {data.isAuthenticated && user ? (
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-wrap items-center gap-2.5">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-semibold text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
              <span className="h-2 w-2 rounded-full bg-emerald-500" />
              {authCopy.header.sessionActive}
            </span>
            <div className="text-sm text-slate-700 dark:text-slate-200">
              <span className="font-semibold text-slate-900 dark:text-white">
                {user.fullName || user.email}
              </span>
              {user.fullName && user.email && (
                <span className="ms-2 text-xs text-slate-500 dark:text-slate-400">
                  ({user.email})
                </span>
              )}
            </div>
            {isConfirmed && (
              <span className="text-xs font-medium text-teal-700 dark:text-teal-300">
                {authCopy.login.confirmedNotice}
              </span>
            )}
          </div>

          <LogoutButton
            locale={locale}
            label={authCopy.header.logout}
            pendingLabel={authCopy.header.loggingOut}
          />
        </div>
      ) : (
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-700 dark:bg-slate-800 dark:text-slate-200">
              <span className="h-2 w-2 rounded-full bg-amber-500" />
              {authCopy.header.signedOut}
            </span>
            <span className="hidden text-xs text-slate-600 dark:text-slate-400 sm:inline">
              {dashboardCopy.authBadge}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <Link
              href={`/${locale}/login`}
              className="inline-flex min-h-[36px] items-center justify-center rounded-xl border border-slate-300 bg-white px-3.5 py-1.5 text-xs font-semibold text-slate-800 transition-colors hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100 dark:hover:bg-slate-800"
            >
              {authCopy.header.signIn}
            </Link>
            <Link
              href={`/${locale}/register`}
              className="inline-flex min-h-[36px] items-center justify-center rounded-xl bg-teal-700 px-3.5 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-teal-800"
            >
              {authCopy.header.register}
            </Link>
          </div>
        </div>
      )}
    </section>
  );
}
