import Link from "next/link";
import { localeMeta, type Locale } from "@/i18n/config";
import type { Dictionary } from "@/i18n/get-dictionary";
import { getDashboardData } from "@/lib/supabase/dashboard";
import { LogoutButton } from "../auth/LogoutButton";
import { CreateBusinessForm } from "./CreateBusinessForm";
import { formatShortDate } from "./LivePlatformMetrics";

interface WorkspaceDashboardProps {
  locale: Locale;
  dict: Dictionary;
}

function getInitials(name: string | null, email: string | null): string {
  const source = (name || email || "SM").trim();
  const parts = source.split(/\s+/).filter(Boolean);
  if (parts.length >= 2) {
    return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
  }
  return source.slice(0, 2).toUpperCase();
}

export async function WorkspaceDashboard({
  locale,
  dict,
}: WorkspaceDashboardProps) {
  const data = await getDashboardData();
  const copy = dict.dashboard;

  if (!data.isAuthenticated || !data.profile) {
    return (
      <section
        id="workspace"
        className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900 sm:p-8"
      >
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-900 dark:bg-amber-950/70 dark:text-amber-200">
              <span className="h-2 w-2 rounded-full bg-amber-500" />
              {copy.unauthenticated}
            </span>
            <h2 className="mt-3 text-xl font-bold text-slate-900 dark:text-white">
              {copy.guestCardTitle}
            </h2>
            <p className="mt-1.5 max-w-2xl text-sm leading-6 text-slate-600 dark:text-slate-400">
              {copy.guestCardBody}
            </p>
          </div>

          <div className="flex shrink-0 flex-wrap items-center gap-3">
            <Link
              href={`/${locale}/login`}
              className="inline-flex min-h-[44px] items-center justify-center rounded-2xl border border-slate-300 bg-white px-5 py-2.5 text-sm font-semibold text-slate-900 transition-colors hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-950 dark:text-white dark:hover:bg-slate-800"
            >
              {dict.auth.header.signIn}
            </Link>
            <Link
              href={`/${locale}/register`}
              className="inline-flex min-h-[44px] items-center justify-center rounded-2xl bg-teal-700 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-teal-800"
            >
              {dict.auth.header.register}
            </Link>
          </div>
        </div>
      </section>
    );
  }

  const { profile, businesses } = data;
  const initials = getInitials(profile.fullName, profile.email);
  const categoryLabels = copy.categories as Record<string, string>;

  return (
    <div id="workspace" className="grid gap-6 lg:grid-cols-12">
      <div className="flex flex-col gap-6 lg:col-span-7">
        {/* Profile Card */}
        <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900 sm:p-6">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="flex items-center gap-3.5">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-teal-700 text-sm font-bold text-white shadow-xs">
                {initials}
              </div>
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
                    {copy.profileTitle}
                  </h2>
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-100 px-2.5 py-0.5 text-[11px] font-semibold text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                    {copy.authenticated}
                  </span>
                </div>
                <p className="mt-0.5 text-xs text-slate-600 dark:text-slate-400">
                  {copy.profileSubtitle}
                </p>
              </div>
            </div>

            <LogoutButton
              locale={locale}
              label={dict.auth.header.logout}
              pendingLabel={dict.auth.header.loggingOut}
            />
          </div>

          <dl className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="rounded-2xl border border-slate-100 bg-slate-50 p-3.5 dark:border-slate-800 dark:bg-slate-950/60">
              <dt className="text-xs font-medium text-slate-500 dark:text-slate-400">
                {copy.fullNameLabel}
              </dt>
              <dd className="mt-1 text-sm font-semibold text-slate-900 dark:text-white">
                {profile.fullName || copy.unnamedUser}
              </dd>
            </div>

            <div className="rounded-2xl border border-slate-100 bg-slate-50 p-3.5 dark:border-slate-800 dark:bg-slate-950/60">
              <dt className="text-xs font-medium text-slate-500 dark:text-slate-400">
                {copy.emailLabel}
              </dt>
              <dd className="mt-1 truncate text-sm font-semibold text-slate-900 dark:text-white">
                {profile.email || "—"}
              </dd>
              <dd className="mt-1 text-[11px] font-medium text-emerald-700 dark:text-emerald-400">
                {profile.emailConfirmedAt ? copy.verifiedEmail : copy.pendingEmail}
              </dd>
            </div>

            <div className="rounded-2xl border border-slate-100 bg-slate-50 p-3.5 dark:border-slate-800 dark:bg-slate-950/60">
              <dt className="text-xs font-medium text-slate-500 dark:text-slate-400">
                {copy.preferredLocaleLabel}
              </dt>
              <dd className="mt-1 text-sm font-semibold text-slate-900 dark:text-white">
                {localeMeta[profile.preferredLocale].nativeName} (
                {localeMeta[profile.preferredLocale].label})
              </dd>
            </div>

            <div className="rounded-2xl border border-slate-100 bg-slate-50 p-3.5 dark:border-slate-800 dark:bg-slate-950/60">
              <dt className="text-xs font-medium text-slate-500 dark:text-slate-400">
                {copy.memberSinceLabel}
              </dt>
              <dd className="mt-1 text-sm font-semibold text-slate-900 dark:text-white">
                {formatShortDate(profile.createdAt, locale)}
              </dd>
            </div>

            <div className="rounded-2xl border border-slate-100 bg-slate-50 p-3.5 dark:border-slate-800 dark:bg-slate-950/60">
              <dt className="text-xs font-medium text-slate-500 dark:text-slate-400">
                {copy.lastSignInLabel}
              </dt>
              <dd className="mt-1 text-sm font-semibold text-slate-900 dark:text-white">
                {formatShortDate(profile.lastSignInAt, locale)}
              </dd>
            </div>

            <div className="rounded-2xl border border-slate-100 bg-slate-50 p-3.5 dark:border-slate-800 dark:bg-slate-950/60">
              <dt className="text-xs font-medium text-slate-500 dark:text-slate-400">
                {copy.userIdLabel}
              </dt>
              <dd className="mt-1 truncate font-mono text-xs text-slate-700 dark:text-slate-300">
                {profile.id}
              </dd>
            </div>
          </dl>
        </section>

        {/* Businesses List Card */}
        <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900 sm:p-6">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
                {copy.businessesTitle}
              </h2>
              <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
                {copy.businessesSubtitle}
              </p>
            </div>
            <span className="inline-flex h-8 min-w-[32px] items-center justify-center rounded-full bg-teal-50 px-2.5 text-xs font-bold text-teal-800 dark:bg-teal-950 dark:text-teal-200">
              {businesses.length}
            </span>
          </div>

          {businesses.length === 0 ? (
            <p className="mt-4 rounded-2xl border border-dashed border-slate-300 bg-slate-50/80 p-4 text-sm leading-6 text-slate-600 dark:border-slate-700 dark:bg-slate-950/50 dark:text-slate-300">
              {copy.noBusinesses}
            </p>
          ) : (
            <ul className="mt-4 flex flex-col gap-3">
              {businesses.map((business) => (
                <li
                  key={business.id}
                  className="flex flex-col justify-between gap-3 rounded-2xl border border-slate-200 bg-slate-50/70 p-4 dark:border-slate-800 dark:bg-slate-950/50 sm:flex-row sm:items-center"
                >
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="truncate text-sm font-semibold text-slate-900 dark:text-white">
                        {business.name}
                      </span>
                      <span className="rounded-full bg-teal-100 px-2 py-0.5 text-[11px] font-semibold text-teal-900 dark:bg-teal-950 dark:text-teal-200">
                        {copy.roleLabels[business.role]}
                      </span>
                      <span
                        className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${
                          business.status === "active"
                            ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300"
                            : "bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-300"
                        }`}
                      >
                        {business.status === "active"
                          ? copy.statusActive
                          : copy.statusInactive}
                      </span>
                    </div>

                    <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-600 dark:text-slate-400">
                      <span className="font-mono">/{business.slug}</span>
                      <span>
                        {categoryLabels[business.category] ?? business.category}
                      </span>
                      <span>{business.timezone}</span>
                    </div>
                  </div>

                  <div className="shrink-0 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200">
                    {business.slotCount} {copy.slotsCountLabel}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      {/* Create Business Column */}
      <div className="lg:col-span-5">
        <CreateBusinessForm locale={locale} copy={copy} />
      </div>
    </div>
  );
}
