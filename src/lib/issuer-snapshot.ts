import type { BusinessProfile, Document, IssuerSnapshot } from "./types";

export type { IssuerSnapshot };

export type IssuerProfile = Pick<
  IssuerSnapshot,
  | "commercialName"
  | "name"
  | "nif"
  | "vatId"
  | "address"
  | "city"
  | "postalCode"
  | "province"
  | "country"
  | "phone"
  | "email"
  | "website"
  | "iban"
  | "logoUrl"
>;

type IssuerIdentity = {
  commercialName?: string | null;
  name?: string | null;
};

function text(value: string | null | undefined): string {
  return value?.trim() ?? "";
}

function comparableName(value: string | null | undefined): string {
  return text(value).replace(/\s+/g, " ").toLowerCase();
}

export function issuerDisplayName(issuer: IssuerIdentity): string {
  return text(issuer.commercialName) || text(issuer.name) || "Tu negocio";
}

export function hasDistinctFiscalName(issuer: IssuerIdentity): boolean {
  const commercialName = comparableName(issuer.commercialName);
  const fiscalName = comparableName(issuer.name);
  return Boolean(commercialName && fiscalName && commercialName !== fiscalName);
}

export function isEmittedDocument(doc: Document): boolean {
  return doc.type !== "presupuesto" && doc.status !== "borrador";
}

export function captureIssuerSnapshot(
  profile: BusinessProfile,
  capturedAt = new Date().toISOString(),
): IssuerSnapshot {
  return {
    commercialName: profile.commercialName?.trim() || undefined,
    name: profile.name.trim(),
    nif: profile.nif.trim(),
    vatId: profile.vatId?.trim().toUpperCase() || undefined,
    address: profile.address.trim(),
    city: profile.city.trim(),
    postalCode: profile.postalCode.trim(),
    province: profile.province?.trim() || undefined,
    country: profile.country?.trim() || undefined,
    phone: profile.phone?.trim() || undefined,
    email: profile.email?.trim() || undefined,
    website: profile.website?.trim() || undefined,
    iban: profile.iban?.trim() || undefined,
    logoUrl: profile.logoUrl,
    capturedAt,
  };
}

/** Congela el encabezado en la primera emisión; no se sobrescribe después. */
export function attachIssuerSnapshot(
  doc: Document,
  profile: BusinessProfile,
): Document {
  if (!isEmittedDocument(doc) || doc.issuer) return doc;
  return { ...doc, issuer: captureIssuerSnapshot(profile) };
}

export function resolveIssuerForDocument(
  doc: Document,
  profile: BusinessProfile,
): IssuerProfile {
  const base = doc.issuer ?? profile;
  return {
    ...base,
    commercialName:
      text(base.commercialName) || text(profile.commercialName) || undefined,
    website: text(base.website) || text(profile.website) || undefined,
    logoUrl: base.logoUrl ?? profile.logoUrl,
  };
}

export function resolveIssuerNif(
  doc: Document,
  profile: BusinessProfile,
): string {
  return resolveIssuerForDocument(doc, profile).nif?.trim() ?? "";
}
