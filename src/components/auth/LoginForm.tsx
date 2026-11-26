"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import { loginAction, type AuthErrorCode, type LoginActionState } from "@/app/[lang]/auth/actions";
import type { Locale } from "@/i18n/config";
import type { Dictionary } from "@/i18n/get-dictionary";

interface LoginFormProps {
  locale: Locale;
  copy: Dictionary["auth"]["login"];
  errors: Dictionary["auth"]["errors"];
  nextPath: string;
  initialErrorCode?: AuthErrorCode;
  loggedOut?: boolean;
}

const initialLoginState: LoginActionState = { status: "idle" };

export function LoginForm({
  locale,
  copy,
  errors,
  nextPath,
  initialErrorCode,
  loggedOut = false,
}: LoginFormProps) {
  const [state, action, pending] = useActionState(loginAction, initialLoginState);
  const [showPassword, setShowPassword] = useState(false);

  const activeErrorCode = state.status === "error" ? state.errorCode : initialErrorCode;
  const activeErrorMessage = activeErrorCode ? errors[activeErrorCode] : null;

  return (
    <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900 sm:p-8">
      <span className="inline-flex items-center rounded-full bg-teal-50 px-3 py-1 text-xs font-semibold text-teal-800 dark:bg-teal-950/70 dark:text-teal-200">
        {copy.badge}
      </span>

      <h1 className="mt-4 text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
        {copy.title}
      </h1>
      <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-400">
        {copy.subtitle}
      </p>

      {loggedOut && state.status === "idle" && (
        <div
          role="status"
          className="mt-5 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-900 dark:border-emerald-900 dark:bg-emerald-950/60 dark:text-emerald-200"
        >
          {copy.loggedOutNotice}
        </div>
      )}

      {activeErrorMessage && (
        <div
          role="alert"
          className="mt-5 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-medium text-rose-900 dark:border-rose-900 dark:bg-rose-950/60 dark:text-rose-200"
        >
          {activeErrorMessage}
        </div>
      )}

      <form action={action} className="mt-6 flex flex-col gap-4" noValidate>
        <input type="hidden" name="locale" value={locale} />
        <input type="hidden" name="next" value={nextPath} />

        <div>
          <label
            htmlFor="login-email"
            className="block text-sm font-medium text-slate-700 dark:text-slate-200"
          >
            {copy.emailLabel}
          </label>
          <input
            id="login-email"
            name="email"
            type="email"
            autoComplete="email"
            required
            defaultValue={state.email ?? ""}
            placeholder={copy.emailPlaceholder}
            className="mt-1.5 w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition-colors focus:border-teal-600 focus:ring-2 focus:ring-teal-600/20 dark:border-slate-700 dark:bg-slate-950 dark:text-white dark:focus:border-teal-500"
          />
        </div>

        <div>
          <div className="flex items-center justify-between gap-2">
            <label
              htmlFor="login-password"
              className="block text-sm font-medium text-slate-700 dark:text-slate-200"
            >
              {copy.passwordLabel}
            </label>
            <button
              type="button"
              onClick={() => setShowPassword((prev) => !prev)}
              className="text-xs font-semibold text-teal-700 hover:text-teal-800 dark:text-teal-400 dark:hover:text-teal-300"
            >
              {showPassword ? copy.hidePassword : copy.showPassword}
            </button>
          </div>
          <input
            id="login-password"
            name="password"
            type={showPassword ? "text" : "password"}
            autoComplete="current-password"
            required
            placeholder={copy.passwordPlaceholder}
            className="mt-1.5 w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition-colors focus:border-teal-600 focus:ring-2 focus:ring-teal-600/20 dark:border-slate-700 dark:bg-slate-950 dark:text-white dark:focus:border-teal-500"
          />
        </div>

        <button
          type="submit"
          disabled={pending}
          className="mt-2 inline-flex min-h-[46px] w-full items-center justify-center rounded-2xl bg-teal-700 px-5 py-3 text-sm font-semibold text-white shadow-xs transition-colors hover:bg-teal-800 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {pending ? copy.submitting : copy.submit}
        </button>
      </form>

      <p className="mt-6 text-center text-sm text-slate-600 dark:text-slate-400">
        {copy.noAccount}{" "}
        <Link
          href={`/${locale}/register`}
          className="font-semibold text-teal-700 hover:underline dark:text-teal-400"
        >
          {copy.createAccountLink}
        </Link>
      </p>
    </section>
  );
}
