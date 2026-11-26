import { createBrowserClient } from "@supabase/ssr";
import { getSupabaseConfig } from "./env";

/**
 * Creates a browser Supabase client that persists auth sessions in cookies
 * compatible with @supabase/ssr server rendering.
 */
export function createClient() {
  const { url, anonKey } = getSupabaseConfig();
  return createBrowserClient(url, anonKey);
}
