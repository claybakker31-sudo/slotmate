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


"use client";

import { useActionState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  saveServiceAction,
  type ServiceActionState,
  type ServiceActionErrorCode,
} from "@/app/[lang]/dashboard/actions";
import type { Locale } from "@/i18n/config";

export interface ServiceRecord {
  id: string;
  business_id: string;
  name: string;
  description: string | null;
  price_minor: number;
  currency_code: string;
  duration_minutes: number;
  is_active: boolean;
}

export interface ServiceCopy {
  title: string;
  subtitle: string;
  add: string;
  edit: string;
  name: string;
  description: string;
  price: string;
  duration: string;
  status: string;
  active: string;
  inactive: string;
  save: string;
  saving: string;
  saved: string;
  noServices: string;
  viewOnly: string;
  errors: Record<ServiceActionErrorCode, string>;
}

interface Props {
  businessId: string;
  businessName: string;
  locale: Locale;
  services: ServiceRecord[];
  canManage: boolean;
  copy: ServiceCopy;
}

const initialState: ServiceActionState = { status: "idle" };

function ServiceForm({
  businessId,
  locale,
  service,
  copy,
}: {
  businessId: string;
  locale: Locale;
  service?: ServiceRecord;
  copy: ServiceCopy;
}) {
  const router = useRouter();
  const [state, action, pending] = useActionState(
    saveServiceAction,
    initialState
  );

  useEffect(() => {
    if (state.status === "success") {
      router.refresh();
    }
  }, [state, router]);

  const errorMessage =
    state.status === "error"
      ? copy.errors[state.errorCode ?? "generic"]
      : null;

  return (
    <form
      action={action}
      className="rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-950"
    >
      <input type="hidden" name="businessId" value={businessId} />
      <input type="hidden" name="locale" value={locale} />
      {service && (
        <input type="hidden" name="serviceId" value={service.id} />
      )}

      <h3 className="mb-4 text-sm font-semibold text-slate-900 dark:text-white">
        {service ? copy.edit : copy.add}
      </h3>

      <div className="grid gap-3 sm:grid-cols-2">
        <label className="text-sm font-medium text-slate-700 dark:text-slate-200">
          {copy.name}
          <input
            name="name"
            required
            minLength={2}
            maxLength={120}
            defaultValue={service?.name ?? ""}
            className="mt-1 block w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-900 dark:text-white"
          />
        </label>

        <label className="text-sm font-medium text-slate-700 dark:text-slate-200">
          {copy.description}
          <input
            name="description"
            maxLength={1000}
            defaultValue={service?.description ?? ""}
            className="mt-1 block w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-900 dark:text-white"
          />
        </label>

        <label className="text-sm font-medium text-slate-700 dark:text-slate-200">
          {copy.price} (€)
          <input
            name="price"
            type="number"
            required
            min="0"
            max="9999999.99"
            step="0.01"
            defaultValue={
              service ? (service.price_minor / 100).toFixed(2) : "20.00"
            }
            className="mt-1 block w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-900 dark:text-white"
          />
        </label>

        <label className="text-sm font-medium text-slate-700 dark:text-slate-200">
          {copy.duration} 
          <input
            name="durationMinutes"
            type="number"
            required
            min="5"
            max="480"
            step="1"
            defaultValue={service?.duration_minutes ?? 30}
            className="mt-1 block w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-900 dark:text-white"
          />
        </label>

        <label className="text-sm font-medium text-slate-700 dark:text-slate-200 sm:col-span-2">
          {copy.status}
          <select
            name="is_active"
            defaultValue={service?.is_active === false ? "inactive" : "active"}
            className="mt-1 block w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-900 dark:text-white"
          >
            <option value="active">{copy.active}</option>
            <option value="inactive">{copy.inactive}</option>
          </select>
        </label>
      </div>

      {errorMessage && (
        <p role="alert" className="mt-3 text-sm text-rose-600">
          {errorMessage}
        </p>
      )}

      {state.status === "success" && (
        <p role="status" className="mt-3 text-sm text-emerald-700 dark:text-emerald-400">
          {copy.saved}
        </p>
      )}

      <button
        type="submit"
        disabled={pending}
        className="mt-4 min-h-11 rounded-xl bg-teal-700 px-5 py-2 text-sm font-semibold text-white hover:bg-teal-800 disabled:opacity-60"
      >
        {pending ? copy.saving : copy.save}
      </button>
    </form>
  );
}

export function ServicesManager({
  businessId,
  businessName,
  locale,
  services,
  canManage,
  copy,
}: Props) {
  const currencyLocale =
    locale === "it"
      ? "it-IT"
      : locale === "es"
        ? "es-ES"
        : locale === "ar"
          ? "ar"
          : "en-GB";

  const money = new Intl.NumberFormat(currencyLocale, {
    style: "currency",
    currency: "EUR",
  });

  return (
    <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900 sm:p-6">
      <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
        {copy.title}
      </h2>
      <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
        {businessName} — {copy.subtitle}
      </p>

      <div className="mt-5 space-y-4">
        {canManage ? (
          <ServiceForm
            businessId={businessId}
            locale={locale}
            copy={copy}
          />
        ) : (
          <p className="rounded-xl bg-slate-50 p-3 text-sm text-slate-600 dark:bg-slate-950 dark:text-slate-400">
            {copy.viewOnly}
          </p>
        )}

        {services.length === 0 ? (
          <p className="py-4 text-sm text-slate-500">{copy.noServices}</p>
        ) : (
          <div className="space-y-3">
            {services.map((service) => (
              <div
                key={service.id}
                className="rounded-2xl border border-slate-200 p-4 dark:border-slate-700"
              >
                <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <h3 className="font-semibold text-slate-900 dark:text-white">
                      {service.name}
                    </h3>
                    <p className="text-sm text-slate-600 dark:text-slate-400">
                      {money.format(service.price_minor / 100)} ·{" "}
                      {service.duration_minutes} min
                    </p>
                    {service.description && (
                      <p className="mt-1 text-sm text-slate-500">
                        {service.description}
                      </p>
                    )}
                  </div>

                  <span
                    className={`rounded-full px-3 py-1 text-xs font-medium ${
                      service.is_active
                        ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300"
                        : "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300"
                    }`}
                  >
                    {service.is_active ? copy.active : copy.inactive}
                  </span>
                </div>

                {canManage && (
                  <ServiceForm
                    businessId={businessId}
                    locale={locale}
                    service={service}
                    copy={copy}
                  />
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
