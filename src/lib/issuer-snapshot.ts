import type { BusinessProfile, Document, IssuerSnapshot } from "./types";

export type { IssuerSnapshot };

export type IssuerProfile = Pick<
  IssuerSnapshot,
  | "name"
  | "nif"
  | "address"
  | "city"
  | "postalCode"
  | "phone"
  | "email"
  | "iban"
  | "logoUrl"
>;

export function isEmittedDocument(doc: Document): boolean {
  return doc.status !== "borrador";
}

export function captureIssuerSnapshot(
  profile: BusinessProfile,
): IssuerSnapshot {
  return {
    name: profile.name.trim(),
    nif: profile.nif.trim(),
    address: profile.address.trim(),
    city: profile.city.trim(),
    postalCode: profile.postalCode.trim(),
    phone: profile.phone?.trim() || undefined,
    email: profile.email?.trim() || undefined,
    iban: profile.iban?.trim() || undefined,
    logoUrl: profile.logoUrl,
    capturedAt: new Date().toISOString(),
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
    logoUrl: base.logoUrl ?? profile.logoUrl,
  };
}

export function resolveIssuerNif(
  doc: Document,
  profile: BusinessProfile,
): string {
  return resolveIssuerForDocument(doc, profile).nif?.trim() ?? "";
}
