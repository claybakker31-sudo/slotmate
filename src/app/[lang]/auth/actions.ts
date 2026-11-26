"use server";

import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { defaultLocale, isLocale, type Locale } from "@/i18n/config";
import { getSafeRedirectPath, getSupabaseConfig } from "@/lib/supabase/env";
import { createClient } from "@/lib/supabase/server";

export type AuthErrorCode =
  | "invalidEmail"
  | "fullNameTooShort"
  | "businessNameTooShort"
  | "passwordTooShort"
  | "passwordsMismatch"
  | "invalidCredentials"
  | "emailNotConfirmed"
  | "userAlreadyExists"
  | "rateLimited"
  | "callbackFailed"
  | "generic";

export interface LoginActionState {
  status: "idle" | "error";
  errorCode?: AuthErrorCode;
  email?: string;
}

export interface RegisterActionState {
  status: "idle" | "error" | "confirm_email";
  errorCode?: AuthErrorCode;
  email?: string;
  fields?: {
    fullName: string;
    businessName: string;
    email: string;
  };
}

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function normalizeLocale(value: FormDataEntryValue | string | null | undefined): Locale {
  if (typeof value === "string" && isLocale(value)) {
    return value;
  }
  return defaultLocale;
}

function mapSupabaseAuthError(error: {
  message?: string;
  code?: string;
  status?: number;
}): AuthErrorCode {
  const code = (error.code ?? "").toLowerCase();
  const message = (error.message ?? "").toLowerCase();

  if (code === "invalid_credentials" || message.includes("invalid login credentials")) {
    return "invalidCredentials";
  }
  if (code === "email_not_confirmed" || message.includes("email not confirmed")) {
    return "emailNotConfirmed";
  }
  if (
    code === "user_already_exists" ||
    code === "email_exists" ||
    message.includes("already registered") ||
    message.includes("already exists")
  ) {
    return "userAlreadyExists";
  }
  if (code === "weak_password" || message.includes("password should be at least")) {
    return "passwordTooShort";
  }
  if (error.status === 429 || code === "over_request_rate_limit" || code === "over_email_send_rate_limit") {
    return "rateLimited";
  }
  if (code === "validation_failed" && message.includes("email")) {
    return "invalidEmail";
  }

  return "generic";
}

async function resolveRequestOrigin(): Promise<string> {
  const headerStore = await headers();
  const forwardedHost = headerStore.get("x-forwarded-host");
  const forwardedProto = headerStore.get("x-forwarded-proto") ?? "https";
  if (forwardedHost) {
    return `${forwardedProto}://${forwardedHost}`;
  }

  const origin = headerStore.get("origin");
  if (origin) {
    return origin;
  }

  const host = headerStore.get("host");
  if (host) {
    const protocol = host.startsWith("localhost") || host.startsWith("127.0.0.1") ? "http" : "https";
    return `${protocol}://${host}`;
  }

  return getSupabaseConfig().siteUrl ?? "http://localhost:3000";
}

export async function loginAction(
  _prevState: LoginActionState,
  formData: FormData
): Promise<LoginActionState> {
  const locale = normalizeLocale(formData.get("locale"));
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");
  const safeNext = getSafeRedirectPath(
    typeof formData.get("next") === "string" ? String(formData.get("next")) : null,
    `/${locale}`
  );

  if (!EMAIL_PATTERN.test(email)) {
    return { status: "error", errorCode: "invalidEmail", email };
  }

  if (password.length === 0) {
    return { status: "error", errorCode: "invalidCredentials", email };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    return {
      status: "error",
      errorCode: mapSupabaseAuthError(error),
      email,
    };
  }

  revalidatePath("/", "layout");
  redirect(safeNext);
}

export async function registerAction(
  _prevState: RegisterActionState,
  formData: FormData
): Promise<RegisterActionState> {
  const locale = normalizeLocale(formData.get("locale"));
  const fullName = String(formData.get("fullName") ?? "").trim();
  const businessName = String(formData.get("businessName") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");
  const confirmPassword = String(formData.get("confirmPassword") ?? "");
  const safeNext = getSafeRedirectPath(
    typeof formData.get("next") === "string" ? String(formData.get("next")) : null,
    `/${locale}`
  );

  const fields = { fullName, businessName, email };

  if (fullName.length < 2) {
    return { status: "error", errorCode: "fullNameTooShort", fields };
  }

  if (businessName.length > 0 && businessName.length < 2) {
    return { status: "error", errorCode: "businessNameTooShort", fields };
  }

  if (!EMAIL_PATTERN.test(email)) {
    return { status: "error", errorCode: "invalidEmail", fields };
  }

  if (password.length < 8) {
    return { status: "error", errorCode: "passwordTooShort", fields };
  }

  if (password !== confirmPassword) {
    return { status: "error", errorCode: "passwordsMismatch", fields };
  }

  const origin = await resolveRequestOrigin();
  const emailRedirectTo = `${origin}/auth/callback?next=${encodeURIComponent(safeNext)}`;

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo,
      data: {
        full_name: fullName,
        preferred_locale: locale,
        ...(businessName.length >= 2 ? { pending_business_name: businessName } : {}),
      },
    },
  });

  if (error) {
    return {
      status: "error",
      errorCode: mapSupabaseAuthError(error),
      fields,
    };
  }

  if (data.user && Array.isArray(data.user.identities) && data.user.identities.length === 0) {
    return {
      status: "error",
      errorCode: "userAlreadyExists",
      fields,
    };
  }

  if (data.session) {
    revalidatePath("/", "layout");
    redirect(safeNext);
  }

  return {
    status: "confirm_email",
    email,
  };
}

export async function logoutAction(localeInput?: string): Promise<void> {
  const locale = normalizeLocale(localeInput);
  const supabase = await createClient();
  await supabase.auth.signOut();
  revalidatePath("/", "layout");
  redirect(`/${locale}/login?logged_out=1`);
}
