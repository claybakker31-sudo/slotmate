"use server";

import { revalidatePath } from "next/cache";
import { defaultLocale, isLocale, type Locale } from "@/i18n/config";
import { createClient } from "@/lib/supabase/server";

export type BusinessErrorCode =
  | "unauthenticated"
  | "nameLength"
  | "slugTaken"
  | "slugInvalid"
  | "generic";

export interface CreateBusinessActionState {
  status: "idle" | "error" | "success";
  errorCode?: BusinessErrorCode;
  createdBusiness?: {
    id: string;
    name: string;
    slug: string;
  };
  fields?: {
    name: string;
    slug: string;
    category: string;
    timezone: string;
  };
}

const SLUG_INPUT_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

function normalizeLocale(value: FormDataEntryValue | null): Locale {
  if (typeof value === "string" && isLocale(value)) {
    return value;
  }
  return defaultLocale;
}

export async function createBusinessAction(
  _prevState: CreateBusinessActionState,
  formData: FormData
): Promise<CreateBusinessActionState> {
  const locale = normalizeLocale(formData.get("locale"));
  const name = String(formData.get("name") ?? "").trim();
  const rawSlug = String(formData.get("slug") ?? "")
    .trim()
    .toLowerCase();
  const category = String(formData.get("category") ?? "general").trim() || "general";
  const timezone =
    String(formData.get("timezone") ?? "Europe/Rome").trim() || "Europe/Rome";

  const fields = { name, slug: rawSlug, category, timezone };

  if (name.length < 2 || name.length > 120) {
    return { status: "error", errorCode: "nameLength", fields };
  }

  if (
    rawSlug.length > 0 &&
    (rawSlug.length < 2 || rawSlug.length > 72 || !SLUG_INPUT_PATTERN.test(rawSlug))
  ) {
    return { status: "error", errorCode: "slugInvalid", fields };
  }

  const supabase = await createClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return { status: "error", errorCode: "unauthenticated", fields };
  }

  const { data, error } = await supabase.rpc("register_business", {
    p_name: name,
    p_slug: rawSlug.length > 0 ? rawSlug : null,
    p_category: category.slice(0, 60),
    p_timezone: timezone.slice(0, 80),
    p_default_locale: locale,
  });

  if (error) {
    const code = (error.code ?? "").toLowerCase();
    const message = (error.message ?? "").toLowerCase();

    if (code === "42501" || message.includes("authentication required")) {
      return { status: "error", errorCode: "unauthenticated", fields };
    }
    if (code === "23505" || message.includes("already taken")) {
      return { status: "error", errorCode: "slugTaken", fields };
    }
    if (code === "22023" || message.includes("between 2 and 120")) {
      return { status: "error", errorCode: "nameLength", fields };
    }

    return { status: "error", errorCode: "generic", fields };
  }

  const created = Array.isArray(data) ? data[0] : data;

  revalidatePath(`/${locale}`);
  revalidatePath("/", "layout");

  return {
    status: "success",
    createdBusiness: created
      ? {
          id: String(created.id ?? ""),
          name: String(created.name ?? name),
          slug: String(created.slug ?? rawSlug),
        }
      : {
          id: "",
          name,
          slug: rawSlug,
        },
  };
}
