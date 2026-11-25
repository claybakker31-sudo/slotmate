"use client";

import { useEffect, useState } from "react";
import {
  useHasServiceWorker,
  useIsIos,
  useIsOnline,
  useIsStandalone,
} from "@/hooks/useBrowserStatus";
import type { Dictionary } from "@/i18n/get-dictionary";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

type SwStatus = "checking" | "active" | "unsupported" | "error";

interface PwaFoundationCardProps {
  copy: Dictionary["pwa"];
}

export function PwaFoundationCard({ copy }: PwaFoundationCardProps) {
  const isOnline = useIsOnline();
  const isStandalone = useIsStandalone();
  const isIos = useIsIos();
  const hasServiceWorker = useHasServiceWorker();

  const [swRegistrationState, setSwRegistrationState] = useState<
    "checking" | "active" | "error"
  >("checking");
  const [installPrompt, setInstallPrompt] = useState<BeforeInstallPromptEvent | null>(
    null
  );

  useEffect(() => {
    const handleBeforeInstallPrompt = (event: Event) => {
      event.preventDefault();
      setInstallPrompt(event as BeforeInstallPromptEvent);
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);

    if (hasServiceWorker) {
      navigator.serviceWorker
        .register("/sw.js", { scope: "/", updateViaCache: "none" })
        .then(() => setSwRegistrationState("active"))
        .catch(() => setSwRegistrationState("error"));
    }

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    };
  }, [hasServiceWorker]);

  async function handleInstall() {
    if (!installPrompt) return;
    await installPrompt.prompt();
    const result = await installPrompt.userChoice;
    if (result.outcome === "accepted") {
      setInstallPrompt(null);
    }
  }

  const swStatus: SwStatus = hasServiceWorker
    ? swRegistrationState
    : "unsupported";

  const swStatusText: Record<SwStatus, string> = {
    checking: copy.swChecking,
    active: copy.swActive,
    unsupported: copy.swUnsupported,
    error: copy.swError,
  };

  return (
    <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900 sm:p-6">
      <div className="flex flex-col gap-2">
        <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-50">
          {copy.title}
        </h2>
        <p className="text-sm leading-6 text-slate-600 dark:text-slate-400">
          {copy.subtitle}
        </p>
      </div>

      <dl className="mt-5 grid gap-3 sm:grid-cols-2">
        <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-950/60">
          <dt className="text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">
            {copy.swLabel}
          </dt>
          <dd className="mt-1.5 flex items-center gap-2 text-sm font-semibold text-slate-900 dark:text-slate-100">
            <span
              className={`h-2.5 w-2.5 shrink-0 rounded-full ${
                swStatus === "active"
                  ? "bg-emerald-500"
                  : swStatus === "checking"
                    ? "bg-amber-400"
                    : "bg-rose-500"
              }`}
            />
            <span>{swStatusText[swStatus]}</span>
          </dd>
        </div>

        <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-950/60">
          <dt className="text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">
            {copy.connectionLabel}
          </dt>
          <dd className="mt-1.5 flex items-center gap-2 text-sm font-semibold text-slate-900 dark:text-slate-100">
            <span
              className={`h-2.5 w-2.5 shrink-0 rounded-full ${
                isOnline ? "bg-emerald-500" : "bg-amber-500"
              }`}
            />
            <span>{isOnline ? copy.online : copy.offline}</span>
          </dd>
        </div>
      </dl>

      <div className="mt-4">
        {isStandalone ? (
          <p className="rounded-2xl bg-teal-50 px-4 py-3 text-sm font-medium text-teal-900 dark:bg-teal-950/60 dark:text-teal-200">
            {copy.installedNotice}
          </p>
        ) : installPrompt ? (
          <button
            type="button"
            onClick={handleInstall}
            className="inline-flex min-h-[44px] w-full items-center justify-center rounded-2xl bg-teal-700 px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-teal-800 sm:w-auto"
          >
            {copy.installButton}
          </button>
        ) : (
          <p className="rounded-2xl bg-slate-100 px-4 py-3 text-xs leading-5 text-slate-600 dark:bg-slate-800/80 dark:text-slate-300">
            {isIos ? copy.iosHint : copy.browserHint}
          </p>
        )}
      </div>
    </section>
  );
}
