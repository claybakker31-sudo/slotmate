import { createServerClient } from "@supabase/ssr";
import type { User } from "@supabase/supabase-js";
import { NextResponse, type NextRequest } from "next/server";
import { getSupabaseConfig } from "./env";

export interface SessionUpdateResult {
  response: NextResponse;
  user: User | null;
}

/**
 * Refreshes the Supabase auth session on incoming requests and persists
 * updated auth cookies plus no-cache headers onto the outgoing response.
 */
export async function updateSession(request: NextRequest): Promise<SessionUpdateResult> {
  let supabaseResponse = NextResponse.next({
    request,
  });

  const { url, anonKey } = getSupabaseConfig();

  const supabase = createServerClient(url, anonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet, headers) {
        cookiesToSet.forEach(({ name, value }) => {
          request.cookies.set(name, value);
        });

        supabaseResponse = NextResponse.next({
          request,
        });

        cookiesToSet.forEach(({ name, value, options }) => {
          supabaseResponse.cookies.set(name, value, options);
        });

        Object.entries(headers).forEach(([key, value]) => {
          supabaseResponse.headers.set(key, value);
        });
      },
    },
  });

  try {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    return { response: supabaseResponse, user };
  } catch {
    return { response: supabaseResponse, user: null };
  }
}

/**
 * Copies refreshed auth cookies and cache-control headers from a proxy response
 * onto a redirect response so token refreshes are never dropped.
 */
export function copySessionHeadersAndCookies(
  source: NextResponse,
  target: NextResponse
): NextResponse {
  source.cookies.getAll().forEach((cookie) => {
    target.cookies.set(cookie);
  });

  const cacheControl = source.headers.get("Cache-Control");
  if (cacheControl) {
    target.headers.set("Cache-Control", cacheControl);
  }

  return target;
}
