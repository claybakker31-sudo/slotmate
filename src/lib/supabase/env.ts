export interface SupabaseConfig {
  url: string;
  anonKey: string;
  siteUrl: string | null;
}

/**
 * Reads and validates the public Supabase configuration required by both
 * browser and server SSR clients.
 */
export function getSupabaseConfig(): SupabaseConfig {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL?.trim() || null;

  if (!url || !anonKey) {
    throw new Error(
      "Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY environment variables."
    );
  }

  return { url, anonKey, siteUrl };
}

/**
 * Ensures redirect targets remain internal relative paths, preventing open redirects.
 */
export function getSafeRedirectPath(
  candidate: string | null | undefined,
  fallback: string
): string {
  if (!candidate) {
    return fallback;
  }

  const trimmed = candidate.trim();
  if (!trimmed.startsWith("/") || trimmed.startsWith("//") || trimmed.startsWith("/\\")) {
    return fallback;
  }

  // Reject control characters or scheme-like injections after leading slash
  if (/[\u0000-\u001f\u007f]/.test(trimmed)) {
    return fallback;
  }

  return trimmed;
}
