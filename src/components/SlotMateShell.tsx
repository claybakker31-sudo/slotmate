"use client";

import { useState } from "react";
import { useIsOnline } from "@/hooks/useBrowserStatus";
import type { Locale } from "@/i18n/config";
import type { Dictionary } from "@/i18n/get-dictionary";
import { LanguageSwitcher } from "./LanguageSwitcher";
import { PwaFoundationCard } from "./PwaFoundationCard";

type MobileTab = "overview" | "slots" | "pwa" | "roadmap";

interface SlotMateShellProps {
  locale: Locale;
  dict: Dictionary;
}

export function SlotMateShell({ locale, dict }: SlotMateShellProps) {
  const [activeTab, setActiveTab] = useState<MobileTab>("overview");
  const [selectedSlotId, setSelectedSlotId] = useState<string | null>(null);
  const isOnline = useIsOnline();

  const selectedSlot = dict.slots.demoItems.find((item) => item.id === selectedSlotId) ?? null;

  const mobileTabs: Array<{ id: MobileTab; label: string }> = [
    { id: "overview", label: dict.tabs.overview },
    { id: "slots", label: dict.tabs.slots },
    { id: "pwa", label: dict.tabs.pwa },
    { id: "roadmap", label: dict.tabs.roadmap },
  ];

  return (
    <div className="min-h-screen bg-slate-50 pb-24 text-slate-900 dark:bg-slate-950 dark:text-slate-50 md:pb-12">
      <header className="sticky top-0 z-30 border-b border-slate-200/80 bg-white/90 backdrop-blur-md dark:border-slate-800 dark:bg-slate-950/90">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-3 px-4 py-3 sm:px-6">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-teal-700 text-sm font-bold text-white shadow-sm">
              SM
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-base font-bold tracking-tight text-slate-900 dark:text-white">
                  {dict.header.brand}
                </span>
                <span
                  className={`hidden rounded-full px-2 py-0.5 text-[11px] font-medium sm:inline-flex ${
                    isOnline
                      ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300"
                      : "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300"
                  }`}
                >
                  {isOnline ? dict.header.onlineBadge : dict.header.offlineBadge}
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {dict.header.tagline}
              </p>
            </div>
          </div>

          <LanguageSwitcher currentLocale={locale} label={dict.header.languageLabel} />
        </div>
      </header>

      <main className="mx-auto flex max-w-5xl flex-col gap-6 px-4 pt-5 sm:px-6 sm:pt-8">
        <section
          className={`${
            activeTab === "overview" ? "block" : "hidden md:block"
          } overflow-hidden rounded-3xl bg-gradient-to-br from-teal-700 via-teal-800 to-slate-900 p-6 text-white shadow-md sm:p-8`}
        >
          <span className="inline-flex items-center rounded-full bg-white/15 px-3 py-1 text-xs font-semibold tracking-wide text-teal-50">
            {dict.hero.badge}
          </span>
          <h1 className="mt-4 max-w-2xl text-2xl font-bold leading-tight tracking-tight sm:text-4xl">
            {dict.hero.title}
          </h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-teal-50/90 sm:text-base">
            {dict.hero.subtitle}
          </p>
          <div className="mt-6 flex flex-col gap-3 sm:flex-row">
            <button
              type="button"
              onClick={() => setActiveTab("slots")}
              className="inline-flex min-h-[44px] items-center justify-center rounded-2xl bg-white px-5 py-2.5 text-sm font-semibold text-teal-900 transition-colors hover:bg-teal-50"
            >
              {dict.hero.primaryAction}
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("pwa")}
              className="inline-flex min-h-[44px] items-center justify-center rounded-2xl border border-white/30 bg-white/10 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-white/20"
            >
              {dict.hero.secondaryAction}
            </button>
          </div>
        </section>

        <section
          aria-labelledby="metrics-heading"
          className={`${activeTab === "overview" ? "block" : "hidden md:block"}`}
        >
          <h2
            id="metrics-heading"
            className="mb-3 text-sm font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400"
          >
            {dict.metrics.title}
          </h2>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {dict.metrics.items.map((item) => (
              <div
                key={item.label}
                className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900"
              >
                <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
                  {item.label}
                </p>
                <p className="mt-1 text-lg font-bold text-slate-900 dark:text-white">
                  {item.value}
                </p>
                <p className="mt-1 text-xs text-slate-600 dark:text-slate-300">
                  {item.detail}
                </p>
              </div>
            ))}
          </div>
        </section>

        <div className="grid gap-6 md:grid-cols-12">
          <section
            className={`${
              activeTab === "slots" ? "block" : "hidden md:block"
            } rounded-3xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900 sm:p-6 md:col-span-7`}
          >
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
                  {dict.slots.title}
                </h2>
                <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
                  {dict.slots.subtitle}
                </p>
              </div>
              {selectedSlotId && (
                <button
                  type="button"
                  onClick={() => setSelectedSlotId(null)}
                  className="min-h-[36px] rounded-xl border border-slate-200 px-3 text-xs font-semibold text-slate-700 transition-colors hover:bg-slate-100 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
                >
                  {dict.slots.resetButton}
                </button>
              )}
            </div>

            <div className="mt-4 rounded-2xl border border-teal-200 bg-teal-50/70 px-4 py-3 text-sm font-medium text-teal-900 dark:border-teal-900 dark:bg-teal-950/50 dark:text-teal-200">
              {selectedSlot
                ? `${dict.slots.selectedNotice} ${selectedSlot.time} — ${selectedSlot.title}`
                : dict.slots.noSelection}
            </div>

            <ul className="mt-4 flex flex-col gap-3">
              {dict.slots.demoItems.map((slot) => {
                const isSelected = slot.id === selectedSlotId;
                return (
                  <li
                    key={slot.id}
                    className={`flex flex-col justify-between gap-3 rounded-2xl border p-4 transition-colors sm:flex-row sm:items-center ${
                      isSelected
                        ? "border-teal-600 bg-teal-50/60 dark:border-teal-500 dark:bg-teal-950/40"
                        : "border-slate-200 bg-slate-50/70 dark:border-slate-800 dark:bg-slate-950/40"
                    }`}
                  >
                    <div className="flex items-center gap-3.5">
                      <div className="flex h-12 w-16 shrink-0 flex-col items-center justify-center rounded-xl bg-white text-center shadow-xs dark:bg-slate-900">
                        <span className="text-sm font-bold text-slate-900 dark:text-white">
                          {slot.time}
                        </span>
                        <span className="text-[11px] text-slate-500 dark:text-slate-400">
                          {slot.duration}
                        </span>
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-slate-900 dark:text-white">
                          {slot.title}
                        </p>
                        <div className="mt-1 flex items-center gap-2">
                          <span className="text-xs text-slate-500 dark:text-slate-400">
                            {slot.category}
                          </span>
                          <span
                            className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${
                              isSelected
                                ? "bg-teal-700 text-white"
                                : "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300"
                            }`}
                          >
                            {isSelected
                              ? dict.slots.statusReserved
                              : dict.slots.statusAvailable}
                          </span>
                        </div>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() =>
                        setSelectedSlotId(isSelected ? null : slot.id)
                      }
                      className={`min-h-[42px] shrink-0 rounded-xl px-4 text-sm font-semibold transition-colors ${
                        isSelected
                          ? "border border-slate-300 bg-white text-slate-800 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
                          : "bg-slate-900 text-white hover:bg-slate-800 dark:bg-teal-600 dark:hover:bg-teal-500"
                      }`}
                    >
                      {isSelected
                        ? dict.slots.releaseButton
                        : dict.slots.bookButton}
                    </button>
                  </li>
                );
              })}
            </ul>
          </section>

          <div
            className={`${
              activeTab === "pwa" || activeTab === "roadmap"
                ? "flex"
                : "hidden md:flex"
            } flex-col gap-6 md:col-span-5`}
          >
            <div className={activeTab === "pwa" ? "block" : "hidden md:block"}>
              <PwaFoundationCard copy={dict.pwa} />
            </div>

            <section
              className={`${
                activeTab === "roadmap" ? "block" : "hidden md:block"
              } rounded-3xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900 sm:p-6`}
            >
              <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
                {dict.roadmap.title}
              </h2>
              <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
                {dict.roadmap.subtitle}
              </p>

              <ul className="mt-4 flex flex-col gap-3">
                {dict.roadmap.items.map((step) => (
                  <li
                    key={step.title}
                    className="rounded-2xl border border-slate-100 bg-slate-50 p-3.5 dark:border-slate-800 dark:bg-slate-950/60"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                        {step.title}
                      </span>
                      <span
                        className={`shrink-0 rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${
                          step.done
                            ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300"
                            : "bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-300"
                        }`}
                      >
                        {step.done
                          ? dict.roadmap.completedLabel
                          : dict.roadmap.nextLabel}
                      </span>
                    </div>
                    <p className="mt-1 text-xs leading-5 text-slate-600 dark:text-slate-400">
                      {step.description}
                    </p>
                  </li>
                ))}
              </ul>
            </section>
          </div>
        </div>

        <footer className="pb-4 pt-2 text-center text-xs text-slate-500 dark:text-slate-400">
          {dict.footer.note}
        </footer>
      </main>

      <nav
        aria-label="Mobile navigation"
        className="fixed inset-x-0 bottom-0 z-40 border-t border-slate-200 bg-white/95 px-2 py-2 backdrop-blur-md dark:border-slate-800 dark:bg-slate-950/95 md:hidden"
      >
        <div className="mx-auto grid max-w-md grid-cols-4 gap-1">
          {mobileTabs.map((tab) => {
            const active = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`min-h-[44px] rounded-2xl px-2 text-xs font-semibold transition-colors ${
                  active
                    ? "bg-teal-700 text-white shadow-xs"
                    : "text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-900"
                }`}
              >
                {tab.label}
              </button>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
