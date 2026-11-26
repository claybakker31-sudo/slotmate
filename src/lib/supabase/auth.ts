import "server-only";
import { createClient } from "./server";

export interface AuthenticatedUserSummary {
  id: string;
  email: string | null;
  fullName: string | null;
  preferredLocale: string | null;
}

/**
 * Reads the currently authenticated user from the verified Supabase Auth server
 * session and enriches it with non-sensitive profile metadata.
 */
export async function getCurrentUser(): Promise<AuthenticatedUserSummary | null> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser();

    if (error || !user) {
      return null;
    }

    const metadata = user.user_metadata as Record<string, unknown> | undefined;
    const fallbackName =
      typeof metadata?.full_name === "string" && metadata.full_name.trim().length > 0
        ? metadata.full_name.trim()
        : null;
    const fallbackLocale =
      typeof metadata?.preferred_locale === "string" ? metadata.preferred_locale : null;

    const { data: profile } = await supabase
      .from("profiles")
      .select("full_name, preferred_locale")
      .eq("id", user.id)
      .maybeSingle();

    return {
      id: user.id,
      email: user.email ?? null,
      fullName: profile?.full_name ?? fallbackName,
      preferredLocale: profile?.preferred_locale ?? fallbackLocale,
    };
  } catch {
    return null;
  }
}
