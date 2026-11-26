import { createServerClient, type CookieOptions } from "@supabase/ssr";
import type { EmailOtpType } from "@supabase/supabase-js";
import { NextResponse, type NextRequest } from "next/server";
import { defaultLocale, isLocale, LOCALE_COOKIE_NAME, type Locale } from "@/i18n/config";
import { getSafeRedirectPath, getSupabaseConfig } from "@/lib/supabase/env";

const ALLOWED_OTP_TYPES = new Set<EmailOtpType>([
  "signup",
  "invite",
  "magiclink",
  "recovery",
  "email_change",
  "email",
]);

function resolveLocaleFromRequest(request: NextRequest, nextPath: string | null): Locale {
  if (nextPath) {
    const firstSegment = nextPath.split("/").filter(Boolean)[0];
    if (firstSegment && isLocale(firstSegment)) {
      return firstSegment;
    }
  }

  const cookieLocale = request.cookies.get(LOCALE_COOKIE_NAME)?.value;
  if (cookieLocale && isLocale(cookieLocale)) {
    return cookieLocale;
  }

  return defaultLocale;
}

function resolveOrigin(request: NextRequest): string {
  const forwardedHost = request.headers.get("x-forwarded-host");
  const isLocalEnv = process.env.NODE_ENV === "development";

  if (!isLocalEnv && forwardedHost) {
    const forwardedProto = request.headers.get("x-forwarded-proto") ?? "https";
    return `${forwardedProto}://${forwardedHost}`;
  }

  return request.nextUrl.origin;
}

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const code = searchParams.get("code");
  const tokenHash = searchParams.get("token_hash");
  const type = searchParams.get("type");
  const rawNext = searchParams.get("next");
  const oauthError = searchParams.get("error");

  const locale = resolveLocaleFromRequest(request, rawNext);
  const safeNext = getSafeRedirectPath(rawNext, `/${locale}`);
  const origin = resolveOrigin(request);

  if (oauthError) {
    return NextResponse.redirect(new URL(`/${locale}/login?error=callback_failed`, origin));
  }

  const pendingCookies: Array<{ name: string; value: string; options: CookieOptions }> = [];
  const pendingHeaders: Record<string, string> = {};

  const { url, anonKey } = getSupabaseConfig();
  const supabase = createServerClient(url, anonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet, headers) {
        cookiesToSet.forEach((cookie) => {
          pendingCookies.push(cookie);
        });
        Object.assign(pendingHeaders, headers);
      },
    },
  });

  let isAuthenticated = false;

  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    isAuthenticated = !error;
  } else if (tokenHash && type && ALLOWED_OTP_TYPES.has(type as EmailOtpType)) {
    const { error } = await supabase.auth.verifyOtp({
      type: type as EmailOtpType,
      token_hash: tokenHash,
    });
    isAuthenticated = !error;
  }

  if (!isAuthenticated) {
    return NextResponse.redirect(new URL(`/${locale}/login?error=callback_failed`, origin));
  }

  const redirectTarget = new URL(safeNext, origin);
  if (!redirectTarget.searchParams.has("auth")) {
    redirectTarget.searchParams.set("auth", "confirmed");
  }

  const response = NextResponse.redirect(redirectTarget);
  pendingCookies.forEach(({ name, value, options }) => {
    response.cookies.set(name, value, options);
  });
  Object.entries(pendingHeaders).forEach(([key, value]) => {
    response.headers.set(key, value);
  });

  return response;
}
