import type { BusinessProfile } from "@/lib/types";
import { DEFAULT_PROFILE } from "@/lib/types";

function cloneJson<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function optionalString(value: unknown): string | undefined {
  return typeof value === "string" ? value : undefined;
}

/**
 * Construye el perfil inicial de una empresa nueva desde una lista positiva de
 * ajustes reutilizables. La identidad fiscal, dirección, impuestos, series,
 * numeración, diagnóstico tributario y Veri*Factu siempre parten de cero.
 */
export function buildSafeCompanyCopyProfile(
  source: unknown,
): BusinessProfile | null {
  if (!isRecord(source)) return null;

  const profile = cloneJson(DEFAULT_PROFILE);
  const commercialName = optionalString(source.commercialName);
  const phone = optionalString(source.phone);
  const email = optionalString(source.email);
  const website = optionalString(source.website);
  const logoUrl = optionalString(source.logoUrl);

  profile.commercialName = commercialName ?? "";
  profile.phone = phone ?? "";
  profile.email = email ?? "";
  profile.website = website ?? "";
  if (logoUrl !== undefined) profile.logoUrl = logoUrl;

  const reusableObjectFields = [
    "advisorContact",
    "documentPhrases",
    "documentPaymentMethods",
    "documentUnits",
    "documentTemplate",
    "productFamilyMarkups",
    "googlePlaces",
    "appPreferences",
  ] as const;
  for (const field of reusableObjectFields) {
    if (isRecord(source[field])) {
      Object.assign(profile, { [field]: cloneJson(source[field]) });
    }
  }

  if (
    typeof source.quoteValidityDays === "number" &&
    Number.isFinite(source.quoteValidityDays)
  ) {
    profile.quoteValidityDays = source.quoteValidityDays;
  }

  return profile;
}
