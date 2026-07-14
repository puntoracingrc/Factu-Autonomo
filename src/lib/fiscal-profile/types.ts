import type {
  DirectTaxRegime,
  Jurisdiction,
  TaxpayerType,
  VatRegime,
} from "@/lib/tax-engine";

export const FISCAL_PROFILE_SCHEMA_VERSION = 1 as const;

export type VatDeductionRight = "FULL" | "PARTIAL" | "NONE" | "UNKNOWN";

export type FiscalProfileSourceKind =
  "MANUAL" | "AEAT_CENSUS_CERTIFICATE" | "SKIPPED";

export type FiscalIdentityMatch = "MATCHED" | "NOT_CHECKED";

export type FiscalCsvVerificationStatus =
  "PENDING_VERIFICATION" | "USER_VERIFIED";

export interface FiscalActivity {
  code?: string;
  description: string;
  isPrimary?: boolean;
}

export interface FiscalProfileSource {
  kind: FiscalProfileSourceKind;
  confirmedAt: string;
  documentKind?:
    "AEAT_CENSUS_CERTIFICATE" | "MODEL_036" | "MODEL_037" | "UNKNOWN";
  extractionMethod?: "LOCAL_TEXT";
  documentDate?: string;
  identityMatch: FiscalIdentityMatch;
  /** NIF normalizado leído del documento; permite detectar un cambio posterior. */
  matchedTaxId?: string;
  csv?: {
    detected: true;
    verificationStatus: FiscalCsvVerificationStatus;
    verifiedAt?: string;
  };
}

/**
 * Contexto fiscal reutilizable de la empresa. No sustituye a BusinessProfile:
 * se persiste como un bloque opcional dentro del perfil canónico existente.
 */
export interface BusinessFiscalProfile {
  schemaVersion: typeof FISCAL_PROFILE_SCHEMA_VERSION;
  setupStatus: "CONFIGURED" | "SKIPPED";
  taxpayerType: TaxpayerType;
  jurisdiction: Jurisdiction;
  directTaxRegime: DirectTaxRegime;
  vatRegime: VatRegime;
  vatDeductionRight: VatDeductionRight;
  activities: FiscalActivity[];
  source: FiscalProfileSource;
}

export interface FiscalProfileDraft {
  taxpayerType: TaxpayerType;
  jurisdiction: Jurisdiction;
  directTaxRegime: DirectTaxRegime;
  vatRegime: VatRegime;
  vatDeductionRight: VatDeductionRight;
  activities: FiscalActivity[];
}

export interface CensusCertificateCandidate extends FiscalProfileDraft {
  detectedNif: string | null;
  documentDate?: string;
  csv?: string;
  documentKind:
    "AEAT_CENSUS_CERTIFICATE" | "MODEL_036" | "MODEL_037" | "UNKNOWN";
  warnings: string[];
}
