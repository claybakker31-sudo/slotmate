import { NextResponse, type NextRequest } from "next/server";
import { defaultLocale, isLocale, LOCALE_COOKIE_NAME, locales } from "@/i18n/config";
import { getSafeRedirectPath } from "@/lib/supabase/env";
import { copySessionHeadersAndCookies, updateSession } from "@/lib/supabase/proxy";

const PUBLIC_FILE_PATTERN = /\.[^/]+$/;

function getPreferredLocale(request: NextRequest) {
  const cookieLocale = request.cookies.get(LOCALE_COOKIE_NAME)?.value;
  if (cookieLocale && isLocale(cookieLocale)) {
    return cookieLocale;
  }

  return defaultLocale;
}

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/api") ||
    pathname === "/auth/callback" ||
    pathname.startsWith("/auth/") ||
    pathname === "/manifest.webmanifest" ||
    pathname === "/sw.js" ||
    PUBLIC_FILE_PATTERN.test(pathname)
  ) {
    return NextResponse.next();
  }

  const matchedLocale = locales.find(
    (locale) => pathname === `/${locale}` || pathname.startsWith(`/${locale}/`)
  );

  if (!matchedLocale) {
    const locale = getPreferredLocale(request);
    const url = request.nextUrl.clone();
    url.pathname = pathname === "/" ? `/${locale}` : `/${locale}${pathname}`;

    return NextResponse.redirect(url);
  }

  const { response, user } = await updateSession(request);

  const isAuthPage =
    pathname === `/${matchedLocale}/login` ||
    pathname === `/${matchedLocale}/register`;

  if (user && isAuthPage) {
    const nextPath = getSafeRedirectPath(
      request.nextUrl.searchParams.get("next"),
      `/${matchedLocale}`
    );
    const redirectResponse = NextResponse.redirect(new URL(nextPath, request.url));
    return copySessionHeadersAndCookies(response, redirectResponse);
  }

  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
