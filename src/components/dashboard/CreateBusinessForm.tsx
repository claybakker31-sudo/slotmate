"use client";

import { useRouter } from "next/navigation";
import { useActionState, useEffect, useRef } from "react";
import {
  createBusinessAction,
  type CreateBusinessActionState,
} from "@/app/[lang]/dashboard/actions";
import type { Locale } from "@/i18n/config";
import type { Dictionary } from "@/i18n/get-dictionary";

interface CreateBusinessFormProps {
  locale: Locale;
  copy: Dictionary["dashboard"];
}

const initialCreateBusinessState: CreateBusinessActionState = { status: "idle" };

const CATEGORY_KEYS = [
  "general",
  "consulting",
  "healthcare",
  "beauty",
  "fitness",
  "other",
] as const;

const TIMEZONE_OPTIONS = [
  "Europe/Rome",
  "Europe/London",
  "Europe/Madrid",
  "Europe/Paris",
  "Asia/Riyadh",
  "America/New_York",
  "UTC",
] as const;

export function CreateBusinessForm({ locale, copy }: CreateBusinessFormProps) {
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const [state, action, pending] = useActionState(
    createBusinessAction,
    initialCreateBusinessState
  );

  useEffect(() => {
    if (state.status === "success") {
      formRef.current?.reset();
      router.refresh();
    }
  }, [state.status, state.createdBusiness?.id, router]);

  const errorMessage =
    state.status === "error" && state.errorCode ? copy.errors[state.errorCode] : null;

  return (
    <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900 sm:p-6">
      <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
        {copy.createTitle}
      </h2>
      <p className="mt-1 text-sm leading-6 text-slate-600 dark:text-slate-400">
        {copy.createSubtitle}
      </p>

      {state.status === "success" && state.createdBusiness && (
        <div
          role="status"
          className="mt-4 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-900 dark:border-emerald-900 dark:bg-emerald-950/60 dark:text-emerald-200"
        >
          <span>{copy.createdSuccess} </span>
          <span className="font-bold">{state.createdBusiness.name}</span>
          {state.createdBusiness.slug && (
            <span className="ms-1.5 font-mono text-xs opacity-80">
              /{state.createdBusiness.slug}
            </span>
          )}
        </div>
      )}

      {errorMessage && (
        <div
          role="alert"
          className="mt-4 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-medium text-rose-900 dark:border-rose-900 dark:bg-rose-950/60 dark:text-rose-200"
        >
          {errorMessage}
        </div>
      )}

      <form ref={formRef} action={action} className="mt-5 flex flex-col gap-4" noValidate>
        <input type="hidden" name="locale" value={locale} />

        <div>
          <label
            htmlFor="business-name"
            className="block text-sm font-medium text-slate-700 dark:text-slate-200"
          >
            {copy.nameLabel}
          </label>
          <input
            id="business-name"
            name="name"
            type="text"
            required
            minLength={2}
            maxLength={120}
            defaultValue={state.status === "error" ? state.fields?.name ?? "" : ""}
            placeholder={copy.namePlaceholder}
            className="mt-1.5 w-full rounded-2xl border border-slate-300 bg-white px-4 py-2.5 text-sm text-slate-900 outline-none transition-colors focus:border-teal-600 focus:ring-2 focus:ring-teal-600/20 dark:border-slate-700 dark:bg-slate-950 dark:text-white dark:focus:border-teal-500"
          />
        </div>

        <div>
          <label
            htmlFor="business-slug"
            className="block text-sm font-medium text-slate-700 dark:text-slate-200"
          >
            {copy.slugLabel}
          </label>
          <input
            id="business-slug"
            name="slug"
            type="text"
            defaultValue={state.status === "error" ? state.fields?.slug ?? "" : ""}
            placeholder={copy.slugPlaceholder}
            className="mt-1.5 w-full rounded-2xl border border-slate-300 bg-white px-4 py-2.5 font-mono text-sm text-slate-900 outline-none transition-colors focus:border-teal-600 focus:ring-2 focus:ring-teal-600/20 dark:border-slate-700 dark:bg-slate-950 dark:text-white dark:focus:border-teal-500"
          />
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            {copy.slugHint}
          </p>
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div>
            <label
              htmlFor="business-category"
              className="block text-sm font-medium text-slate-700 dark:text-slate-200"
            >
              {copy.categoryLabel}
            </label>
            <select
              id="business-category"
              name="category"
              defaultValue={
                state.status === "error" ? state.fields?.category ?? "general" : "general"
              }
              className="mt-1.5 w-full rounded-2xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-900 outline-none transition-colors focus:border-teal-600 focus:ring-2 focus:ring-teal-600/20 dark:border-slate-700 dark:bg-slate-950 dark:text-white dark:focus:border-teal-500"
            >
              {CATEGORY_KEYS.map((key) => (
                <option key={key} value={key}>
                  {copy.categories[key]}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label
              htmlFor="business-timezone"
              className="block text-sm font-medium text-slate-700 dark:text-slate-200"
            >
              {copy.timezoneLabel}
            </label>
            <select
              id="business-timezone"
              name="timezone"
              defaultValue={
                state.status === "error"
                  ? state.fields?.timezone ?? "Europe/Rome"
                  : "Europe/Rome"
              }
              className="mt-1.5 w-full rounded-2xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-900 outline-none transition-colors focus:border-teal-600 focus:ring-2 focus:ring-teal-600/20 dark:border-slate-700 dark:bg-slate-950 dark:text-white dark:focus:border-teal-500"
            >
              {TIMEZONE_OPTIONS.map((tz) => (
                <option key={tz} value={tz}>
                  {tz}
                </option>
              ))}
            </select>
          </div>
        </div>

        <button
          type="submit"
          disabled={pending}
          className="mt-1 inline-flex min-h-[44px] w-full items-center justify-center rounded-2xl bg-teal-700 px-5 py-2.5 text-sm font-semibold text-white shadow-xs transition-colors hover:bg-teal-800 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {pending ? copy.submitting : copy.submit}
        </button>
      </form>
    </section>
  );
}
