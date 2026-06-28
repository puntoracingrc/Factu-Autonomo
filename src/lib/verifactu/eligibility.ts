import { resolveIssuerNif } from "../issuer-snapshot";
import type { BusinessProfile, Document } from "../types";
import { documentAmounts, isVatExempt } from "../vat-regime";
import { normalizeIssuerNif } from "./qr";
import { documentRecordType } from "./record-input";
import type { VerifactuRecordType, VerifactuSettings } from "./types";

export const DEFAULT_VERIFACTU_SETTINGS: VerifactuSettings = {
  enabled: true,
  environment: "test",
};

export function isVerifactuProductionModeAllowed(): boolean {
  return process.env.NEXT_PUBLIC_VERIFACTU_ALLOW_PRODUCTION === "true";
}

export function normalizeVerifactuSettings(
  settings?: Partial<VerifactuSettings>,
): VerifactuSettings {
  const productionAllowed = isVerifactuProductionModeAllowed();
  return {
    enabled: settings?.enabled ?? DEFAULT_VERIFACTU_SETTINGS.enabled,
    environment:
      productionAllowed && settings?.environment === "production"
        ? "production"
        : "test",
  };
}

export function isVerifactuEnabled(profile: BusinessProfile): boolean {
  return normalizeVerifactuSettings(profile.verifactu).enabled;
}

export function getVerifactuEnvironment(
  profile: BusinessProfile,
): VerifactuSettings["environment"] {
  return normalizeVerifactuSettings(profile.verifactu).environment;
}

/** Solo facturas emitidas (no borrador, presupuesto ni recibo). */
export function needsVerifactuRegistration(
  doc: Document,
  profile: BusinessProfile,
): boolean {
  if (!isVerifactuEnabled(profile)) return false;
  if (doc.type !== "factura") return false;
  if (doc.status === "borrador") return false;
  if (!resolveIssuerNif(doc, profile)) return false;
  if (doc.verifactu?.status === "registered" || doc.verifactu?.status === "test_registered") {
    return false;
  }
  return true;
}

/** Tipo de registro para huella/XML. Rectificativas van como alta (F1/R1/R4). */
export function verifactuRecordType(doc: Document): VerifactuRecordType {
  return documentRecordType(doc);
}

export function documentTotalForVerifactu(
  doc: Document,
  profile: BusinessProfile,
): number {
  return documentAmounts(doc, isVatExempt(profile)).total;
}

export function initialChainState(profile: BusinessProfile): {
  issuerNif: string;
  lastHash: string;
  recordCount: number;
} {
  return {
    issuerNif: normalizeIssuerNif(profile.nif),
    lastHash: "",
    recordCount: 0,
  };
}
