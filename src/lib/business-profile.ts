import type { BusinessProfile } from "./types";
import { normalizeGooglePlacesSettings } from "./google-places";
import { normalizeQuoteValidityDays } from "./quote-validity";
import { normalizeProductFamilyMarkupSettings } from "./product-family-markups";
import { normalizeBusinessFiscalProfile } from "./fiscal-profile";
import { normalizeTaxModelDiagnosticSession } from "./tax-model-diagnostic/profile";

export interface BusinessProfileFields {
  commercialName?: string;
  name: string;
  nif: string;
  vatId?: string;
  address: string;
  postalCode: string;
  city: string;
  province?: string;
  country?: string;
  email?: string;
  phone?: string;
  website?: string;
}

export type BusinessProfileNoticeLevel = "missing" | "warning";

export interface BusinessProfileNotice {
  field: keyof BusinessProfile;
  label: string;
  level: BusinessProfileNoticeLevel;
  message: string;
}

const REQUIRED_DOCUMENT_FIELDS: Array<{
  field: keyof Pick<
    BusinessProfile,
    "name" | "nif" | "address" | "postalCode" | "city"
  >;
  label: string;
}> = [
  { field: "name", label: "nombre fiscal o razón social" },
  { field: "nif", label: "NIF/CIF" },
  { field: "address", label: "dirección fiscal" },
  { field: "postalCode", label: "código postal" },
  { field: "city", label: "ciudad" },
];

function text(value: string | undefined): string {
  return value?.trim() ?? "";
}

export function isBasicBusinessEmail(value: string | undefined): boolean {
  const email = text(value);
  if (!email) return true;
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export function isBasicBusinessPhone(value: string | undefined): boolean {
  const phone = text(value);
  if (!phone) return true;
  const digits = phone.replace(/\D/g, "");
  return digits.length >= 6 && /^[+\d\s().-]+$/.test(phone);
}

export function hasUsualSpanishTaxIdShape(value: string | undefined): boolean {
  const nif = text(value).replace(/[\s.-]/g, "").toUpperCase();
  if (!nif) return true;
  return /^[A-Z0-9][A-Z0-9]{7}[A-Z0-9]$/.test(nif);
}

export function normalizeBusinessProfileForSave(
  profile: BusinessProfile,
): BusinessProfile {
  return {
    ...profile,
    commercialName: text(profile.commercialName),
    name: text(profile.name),
    nif: text(profile.nif).toUpperCase(),
    vatId: text(profile.vatId).toUpperCase(),
    address: text(profile.address),
    city: text(profile.city),
    postalCode: text(profile.postalCode),
    province: text(profile.province),
    country: text(profile.country),
    phone: text(profile.phone),
    email: text(profile.email).toLowerCase(),
    website: normalizeWebsite(profile.website),
    iban: text(profile.iban) || undefined,
    googlePlaces: normalizeGooglePlacesSettings(profile.googlePlaces),
    productFamilyMarkups: normalizeProductFamilyMarkupSettings(
      profile.productFamilyMarkups,
    ),
    quoteValidityDays: normalizeQuoteValidityDays(profile.quoteValidityDays),
    fiscalProfile: normalizeBusinessFiscalProfile(profile.fiscalProfile),
    taxModelDiagnostic: normalizeTaxModelDiagnosticSession(
      profile.taxModelDiagnostic,
    ),
  };
}

function normalizeWebsite(value: string | undefined): string {
  const website = text(value);
  if (!website) return "";
  if (/^https?:\/\//i.test(website)) return website;
  return `https://${website}`;
}

export function businessProfileNotices(
  profile: BusinessProfileFields,
): BusinessProfileNotice[] {
  const notices: BusinessProfileNotice[] = [];

  for (const item of REQUIRED_DOCUMENT_FIELDS) {
    if (!text(profile[item.field])) {
      notices.push({
        ...item,
        level: "missing",
        message: `Falta ${item.label}.`,
      });
    }
  }

  if (!isBasicBusinessEmail(profile.email)) {
    notices.push({
      field: "email",
      label: "email",
      level: "warning",
      message: "El email informado no parece válido.",
    });
  }

  if (!isBasicBusinessPhone(profile.phone)) {
    notices.push({
      field: "phone",
      label: "teléfono",
      level: "warning",
      message: "El teléfono informado no parece válido.",
    });
  }

  if (!hasUsualSpanishTaxIdShape(profile.nif)) {
    notices.push({
      field: "nif",
      label: "NIF/CIF",
      level: "warning",
      message: "El NIF/CIF no tiene el formato habitual. La app no lo valida con AEAT.",
    });
  }

  return notices;
}

export function businessProfileMissingDocumentLabels(
  profile: BusinessProfileFields,
): string[] {
  return businessProfileNotices(profile)
    .filter((notice) => notice.level === "missing")
    .map((notice) => notice.label);
}

export function isBusinessProfileReadyForIssuedInvoices(
  profile: BusinessProfileFields,
): boolean {
  return (
    businessProfileMissingDocumentLabels(profile).length === 0 &&
    hasUsualSpanishTaxIdShape(profile.nif)
  );
}

export function businessProfileQrNotice(profile: BusinessProfile): string {
  if (isBusinessProfileReadyForIssuedInvoices(profile)) {
    return "Datos listos para emitir documentos reales.";
  }

  return "Rellena estos datos para emitir documentos reales.";
}

export function livePdfIssuerWarning(
  profile: BusinessProfileFields,
): string | null {
  const missing = businessProfileMissingDocumentLabels(profile);
  if (
    missing.length === 0 &&
    hasUsualSpanishTaxIdShape(profile.nif)
  ) {
    return null;
  }
  return "Completa los datos del emisor para generar correctamente el documento.";
}
