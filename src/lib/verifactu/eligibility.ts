import { resolveIssuerNif } from "../issuer-snapshot";
import type { BusinessProfile, Document } from "../types";
import { documentAmounts, isVatExempt } from "../vat-regime";
import { hasLegacyImportProtectionClaim } from "../document-integrity/legacy-import-attestation";
import { normalizeIssuerNif } from "./qr";
import { documentRecordType } from "./record-input";
import type { VerifactuRecordType, VerifactuSettings } from "./types";
import { hasAuthenticatedVerifactuAttestation } from "./attestation";

export const DEFAULT_VERIFACTU_SETTINGS: VerifactuSettings = {
  enabled: false,
  environment: "test",
};

/**
 * Contención deliberada: la ruta de registro responde 503 y no existe todavía
 * una atestación de servidor autenticada. Activar este valor requiere cerrar
 * previamente ambos contratos, no solo cambiar configuración del cliente.
 */
export function isVerifactuSubmissionAvailable(): boolean {
  return false;
}

export function isVerifactuProductionModeAllowed(): boolean {
  return process.env.NEXT_PUBLIC_VERIFACTU_ALLOW_PRODUCTION === "true";
}

export function normalizeVerifactuSettings(
  settings?: Partial<VerifactuSettings>,
): VerifactuSettings {
  const productionAllowed = isVerifactuProductionModeAllowed();
  const optedIn = settings?.optInVersion === 1;
  return {
    enabled: optedIn && settings?.enabled === true,
    environment:
      productionAllowed && settings?.environment === "production"
        ? "production"
        : "test",
    ...(optedIn ? { optInVersion: 1 as const } : {}),
  };
}

export function isVerifactuEnabled(profile: BusinessProfile): boolean {
  return (
    isVerifactuSubmissionAvailable() &&
    normalizeVerifactuSettings(profile.verifactu).enabled
  );
}

export function getVerifactuEnvironment(
  profile: BusinessProfile,
): VerifactuSettings["environment"] {
  return normalizeVerifactuSettings(profile.verifactu).environment;
}

/**
 * Elegibilidad documental permanente, separada del interruptor temporal del
 * servicio. Un histórico importado nunca se convierte en un alta Veri*Factu
 * de esta aplicación, aunque su atestación sea válida para cálculos fiscales.
 */
export function isDocumentEligibleForVerifactuRegistration(
  doc: Document,
  profile: BusinessProfile,
): boolean {
  if (hasLegacyImportProtectionClaim(doc)) return false;
  if (doc.type !== "factura") return false;
  if (doc.status === "borrador") return false;
  if (!resolveIssuerNif(doc, profile)) return false;
  if (
    hasAuthenticatedVerifactuAttestation(doc) &&
    doc.verifactuPersistence === "server_confirmed" &&
    (doc.verifactu?.status === "registered" ||
      doc.verifactu?.status === "test_registered")
  ) {
    return false;
  }
  return true;
}

/** Solo facturas emitidas (no borrador, presupuesto ni recibo). */
export function needsVerifactuRegistration(
  doc: Document,
  profile: BusinessProfile,
): boolean {
  return (
    isVerifactuEnabled(profile) &&
    isDocumentEligibleForVerifactuRegistration(doc, profile)
  );
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
