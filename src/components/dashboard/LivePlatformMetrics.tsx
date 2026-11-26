import { localeMeta, type Locale } from "@/i18n/config";
import type { Dictionary } from "@/i18n/get-dictionary";
import { getDashboardData } from "@/lib/supabase/dashboard";

interface LivePlatformMetricsProps {
  locale: Locale;
  metricsCopy: Dictionary["metrics"];
}

export async function LivePlatformMetrics({
  metricsCopy,
}: LivePlatformMetricsProps) {
  const data = await getDashboardData();

  const authValue = data.isAuthenticated
    ? metricsCopy.authCard.authenticatedValue
    : metricsCopy.authCard.unauthenticatedValue;

  const authDetail = data.isAuthenticated
    ? data.profile?.email || metricsCopy.authCard.authenticatedDetail
    : metricsCopy.authCard.unauthenticatedDetail;

  const dbValue = !data.databaseConnected
    ? metricsCopy.databaseCard.offlineValue
    : data.isAuthenticated
      ? metricsCopy.databaseCard.connectedValue
      : metricsCopy.databaseCard.guestValue;

  const dbDetail = !data.databaseConnected
    ? metricsCopy.databaseCard.offlineDetail
    : data.isAuthenticated
      ? `${data.businesses.length} ${metricsCopy.databaseCard.workspacesWord} · ${data.totalTimeSlots} ${metricsCopy.databaseCard.slotsWord}`
      : metricsCopy.databaseCard.guestDetail;

  return (
    <>
      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
          {metricsCopy.authCard.label}
        </p>
        <p className="mt-1 flex items-center gap-2 text-lg font-bold text-slate-900 dark:text-white">
          <span
            className={`h-2.5 w-2.5 shrink-0 rounded-full ${
              data.isAuthenticated ? "bg-emerald-500" : "bg-amber-500"
            }`}
          />
          <span>{authValue}</span>
        </p>
        <p className="mt-1 truncate text-xs text-slate-600 dark:text-slate-300">
          {authDetail}
        </p>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
          {metricsCopy.databaseCard.label}
        </p>
        <p className="mt-1 flex items-center gap-2 text-lg font-bold text-slate-900 dark:text-white">
          <span
            className={`h-2.5 w-2.5 shrink-0 rounded-full ${
              data.databaseConnected ? "bg-emerald-500" : "bg-rose-500"
            }`}
          />
          <span>{dbValue}</span>
        </p>
        <p className="mt-1 text-xs text-slate-600 dark:text-slate-300">
          {dbDetail}
        </p>
      </div>
    </>
  );
}

export function formatShortDate(iso: string | null, locale: Locale): string {
  if (!iso) {
    return "—";
  }

  const parsed = new Date(iso);
  if (Number.isNaN(parsed.getTime())) {
    return "—";
  }

  return new Intl.DateTimeFormat(localeMeta[locale].code, {
    dateStyle: "medium",
  }).format(parsed);
}
