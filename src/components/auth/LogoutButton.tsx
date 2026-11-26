"use client";

import { useTransition } from "react";
import { logoutAction } from "@/app/[lang]/auth/actions";
import type { Locale } from "@/i18n/config";
import { createClient } from "@/lib/supabase/client";

interface LogoutButtonProps {
  locale: Locale;
  label: string;
  pendingLabel: string;
  className?: string;
}

export function LogoutButton({
  locale,
  label,
  pendingLabel,
  className = "",
}: LogoutButtonProps) {
  const [isPending, startTransition] = useTransition();

  function handleLogout() {
    startTransition(async () => {
      try {
        const supabase = createClient();
        await supabase.auth.signOut();
      } catch {
        // Proceed with server signOut even if client storage cleanup fails
      }

      await logoutAction(locale);
    });
  }

  return (
    <button
      type="button"
      onClick={handleLogout}
      disabled={isPending}
      className={
        className ||
        "inline-flex min-h-[36px] items-center justify-center rounded-xl border border-slate-300 bg-white px-3.5 py-1.5 text-xs font-semibold text-slate-800 transition-colors hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-60 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:hover:bg-slate-800"
      }
    >
      {isPending ? pendingLabel : label}
    </button>
  );
}
