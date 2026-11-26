import "server-only";
import { cache } from "react";
import { defaultLocale, isLocale, type Locale } from "@/i18n/config";
import { createClient } from "./server";

export type BusinessRole = "owner" | "admin" | "staff";

export interface UserProfileData {
  id: string;
  email: string | null;
  fullName: string | null;
  preferredLocale: Locale;
  createdAt: string | null;
  updatedAt: string | null;
  lastSignInAt: string | null;
  emailConfirmedAt: string | null;
}

export interface BusinessWorkspaceItem {
  id: string;
  name: string;
  slug: string;
  category: string;
  timezone: string;
  defaultLocale: string;
  status: string;
  role: BusinessRole;
  createdAt: string;
  slotCount: number;
}

export interface LiveDashboardData {
  isAuthenticated: boolean;
  databaseConnected: boolean;
  profile: UserProfileData | null;
  businesses: BusinessWorkspaceItem[];
  totalTimeSlots: number;
}

interface RawBusinessRecord {
  id: string;
  name: string;
  slug: string;
  category: string;
  timezone: string;
  default_locale: string;
  status: string;
  created_at: string;
}

interface RawMembershipRow {
  role: string;
  businesses: RawBusinessRecord | RawBusinessRecord[] | null;
}

function normalizeRole(role: string): BusinessRole {
  if (role === "owner" || role === "admin" || role === "staff") {
    return role;
  }
  return "staff";
}

function normalizeLocale(value: unknown): Locale {
  if (typeof value === "string" && isLocale(value)) {
    return value;
  }
  return defaultLocale;
}

/**
 * Loads live authentication status, user profile, tenant businesses, and
 * time-slot counts from Supabase using the current request's SSR session.
 * Memoized per request via React `cache` so multiple Suspense sections share one fetch.
 */
export const getDashboardData = cache(async (): Promise<LiveDashboardData> => {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      const isMissingSession =
        !userError ||
        userError.name === "AuthSessionMissingError" ||
        userError.message.toLowerCase().includes("session missing");

      return {
        isAuthenticated: false,
        databaseConnected: isMissingSession,
        profile: null,
        businesses: [],
        totalTimeSlots: 0,
      };
    }

    const metadata = user.user_metadata as Record<string, unknown> | undefined;
    const fallbackName =
      typeof metadata?.full_name === "string" && metadata.full_name.trim().length > 0
        ? metadata.full_name.trim()
        : null;

    const [profileResult, membershipsResult, slotsResult] = await Promise.all([
      supabase
        .from("profiles")
        .select("id, full_name, preferred_locale, created_at, updated_at")
        .eq("id", user.id)
        .maybeSingle(),
      supabase
        .from("business_members")
        .select(
          "role, businesses ( id, name, slug, category, timezone, default_locale, status, created_at )"
        )
        .eq("user_id", user.id)
        .order("created_at", { ascending: false }),
      supabase.from("time_slots").select("id, business_id"),
    ]);

    const databaseConnected =
      !profileResult.error && !membershipsResult.error && !slotsResult.error;

    const slotCountByBusiness = new Map<string, number>();
    const slotRows = slotsResult.data ?? [];
    for (const slot of slotRows) {
      if (typeof slot.business_id === "string") {
        slotCountByBusiness.set(
          slot.business_id,
          (slotCountByBusiness.get(slot.business_id) ?? 0) + 1
        );
      }
    }

    const businesses: BusinessWorkspaceItem[] = [];
    const membershipRows = (membershipsResult.data ?? []) as unknown as RawMembershipRow[];

    for (const row of membershipRows) {
      const business = Array.isArray(row.businesses)
        ? row.businesses[0]
        : row.businesses;
      if (!business) {
        continue;
      }

      businesses.push({
        id: business.id,
        name: business.name,
        slug: business.slug,
        category: business.category,
        timezone: business.timezone,
        defaultLocale: business.default_locale,
        status: business.status,
        role: normalizeRole(row.role),
        createdAt: business.created_at,
        slotCount: slotCountByBusiness.get(business.id) ?? 0,
      });
    }

    const profileRow = profileResult.data;

    return {
      isAuthenticated: true,
      databaseConnected,
      profile: {
        id: user.id,
        email: user.email ?? null,
        fullName: profileRow?.full_name ?? fallbackName,
        preferredLocale: normalizeLocale(
          profileRow?.preferred_locale ?? metadata?.preferred_locale
        ),
        createdAt: profileRow?.created_at ?? user.created_at ?? null,
        updatedAt: profileRow?.updated_at ?? null,
        lastSignInAt: user.last_sign_in_at ?? null,
        emailConfirmedAt: user.email_confirmed_at ?? null,
      },
      businesses,
      totalTimeSlots: slotRows.length,
    };
  } catch {
    return {
      isAuthenticated: false,
      databaseConnected: false,
      profile: null,
      businesses: [],
      totalTimeSlots: 0,
    };
  }
});
