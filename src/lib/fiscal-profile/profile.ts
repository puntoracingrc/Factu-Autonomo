import type {
  DirectTaxRegime,
  Jurisdiction,
  TaxpayerType,
  VatRegime,
} from "@/lib/tax-engine";
import {
  FISCAL_PROFILE_SCHEMA_VERSION,
  type BusinessFiscalProfile,
  type CensusCertificateCandidate,
  type FiscalActivity,
  type FiscalIdentityMatch,
  type FiscalProfileDraft,
  type FiscalProfileSource,
  type VatDeductionRight,
} from "./types";

const TAXPAYER_TYPES = new Set<TaxpayerType>([
  "UNKNOWN",
  "SELF_EMPLOYED_IRPF",
  "COMPANY_IS",
]);
const JURISDICTIONS = new Set<Jurisdiction>([
  "UNKNOWN",
  "ES_COMMON",
  "ES_CANARY_IGIC",
  "ES_NAVARRA",
  "ES_BASQUE_COUNTRY",
  "ES_CEUTA_MELILLA",
]);
const DIRECT_TAX_REGIMES = new Set<DirectTaxRegime>([
  "UNKNOWN",
  "DIRECT_ESTIMATION_NORMAL",
  "DIRECT_ESTIMATION_SIMPLIFIED",
]);
const VAT_REGIMES = new Set<VatRegime>([
  "UNKNOWN",
  "GENERAL",
  "PRORATA",
  "EXEMPT",
]);
const VAT_DEDUCTION_RIGHTS = new Set<VatDeductionRight>([
  "UNKNOWN",
  "FULL",
  "PARTIAL",
  "NONE",
]);
const MAX_ACTIVITIES = 20;
const MAX_ACTIVITY_DESCRIPTION = 240;
const MAX_ACTIVITY_CODE = 40;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function cleanText(value: unknown, maximum: number): string {
  return typeof value === "string"
    ? value.trim().replace(/\s+/g, " ").slice(0, maximum)
    : "";
}

function enumValue<T extends string>(value: unknown, values: Set<T>, fallback: T): T {
  return typeof value === "string" && values.has(value as T)
    ? (value as T)
    : fallback;
}

function isoTimestamp(value: unknown): string | undefined {
  return typeof value === "string" && Number.isFinite(Date.parse(value))
    ? value
    : undefined;
}

function isoDate(value: unknown): string | undefined {
  return typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value)
    ? value
    : undefined;
}

export function normalizeSpanishTaxId(value: string | null | undefined): string {
  return (value ?? "").toUpperCase().replace(/[\s.\-]/g, "");
}

/** Solo sugiere la naturaleza aparente del NIF; nunca acredita el régimen fiscal. */
export function inferTaxpayerTypeFromSpanishTaxId(
  value: string | null | undefined,
): Exclude<TaxpayerType, "UNKNOWN"> | null {
  const nif = normalizeSpanishTaxId(value);
  if (!/^[A-Z0-9]{9}$/.test(nif)) return null;
  if (/^[0-9XYZKLM]/.test(nif)) return "SELF_EMPLOYED_IRPF";
  if (/^[ABCDEFGHJNPQRSUVW]/.test(nif)) return "COMPANY_IS";
  return null;
}

export function normalizeFiscalActivities(value: unknown): FiscalActivity[] {
  if (!Array.isArray(value)) return [];
  const seen = new Set<string>();
  const activities: FiscalActivity[] = [];
  for (const candidate of value) {
    if (!isRecord(candidate)) continue;
    const description = cleanText(candidate.description, MAX_ACTIVITY_DESCRIPTION);
    const code = cleanText(candidate.code, MAX_ACTIVITY_CODE).toUpperCase();
    if (!description && !code) continue;
    const key = `${code}|${description.toLocaleLowerCase("es")}`;
    if (seen.has(key)) continue;
    seen.add(key);
    activities.push({
      ...(code ? { code } : {}),
      description,
      ...(candidate.isPrimary === true ? { isPrimary: true } : {}),
    });
    if (activities.length >= MAX_ACTIVITIES) break;
  }
  return activities;
}

export function emptyFiscalProfileDraft(): FiscalProfileDraft {
  return {
    taxpayerType: "UNKNOWN",
    jurisdiction: "UNKNOWN",
    directTaxRegime: "UNKNOWN",
    vatRegime: "UNKNOWN",
    vatDeductionRight: "UNKNOWN",
    activities: [],
  };
}

export function createSkippedFiscalProfile(now: string): BusinessFiscalProfile {
  return {
    schemaVersion: FISCAL_PROFILE_SCHEMA_VERSION,
    setupStatus: "SKIPPED",
    ...emptyFiscalProfileDraft(),
    source: {
      kind: "SKIPPED",
      confirmedAt: now,
      identityMatch: "NOT_CHECKED",
    },
  };
}

export function createManualFiscalProfile(
  draft: FiscalProfileDraft,
  now: string,
): BusinessFiscalProfile {
  return {
    schemaVersion: FISCAL_PROFILE_SCHEMA_VERSION,
    setupStatus: "CONFIGURED",
    taxpayerType: enumValue(draft.taxpayerType, TAXPAYER_TYPES, "UNKNOWN"),
    jurisdiction: enumValue(draft.jurisdiction, JURISDICTIONS, "UNKNOWN"),
    directTaxRegime: enumValue(
      draft.directTaxRegime,
      DIRECT_TAX_REGIMES,
      "UNKNOWN",
    ),
    vatRegime: enumValue(draft.vatRegime, VAT_REGIMES, "UNKNOWN"),
    vatDeductionRight: enumValue(
      draft.vatDeductionRight,
      VAT_DEDUCTION_RIGHTS,
      "UNKNOWN",
    ),
    activities: normalizeFiscalActivities(draft.activities),
    source: {
      kind: "MANUAL",
      confirmedAt: now,
      identityMatch: "NOT_CHECKED",
    },
  };
}

export function createImportedFiscalProfile(
  candidate: CensusCertificateCandidate,
  now: string,
  identityMatch: FiscalIdentityMatch,
  options: { csvVerifiedByUser?: boolean } = {},
): BusinessFiscalProfile {
  if (candidate.documentKind === "UNKNOWN") {
    throw new Error(
      "El archivo no se ha reconocido como certificado censal o modelo 036 de la AEAT.",
    );
  }
  return {
    ...createManualFiscalProfile(candidate, now),
    source: {
      kind: "AEAT_CENSUS_CERTIFICATE",
      confirmedAt: now,
      identityMatch,
      documentKind: candidate.documentKind,
      extractionMethod: "LOCAL_TEXT",
      ...(candidate.detectedNif
        ? { matchedTaxId: normalizeSpanishTaxId(candidate.detectedNif) }
        : {}),
      ...(candidate.documentDate
        ? { documentDate: candidate.documentDate }
        : {}),
      ...(candidate.csv
        ? {
            csv: {
              detected: true as const,
              verificationStatus: options.csvVerifiedByUser
                ? ("USER_VERIFIED" as const)
                : ("PENDING_VERIFICATION" as const),
              ...(options.csvVerifiedByUser ? { verifiedAt: now } : {}),
            },
          }
        : {}),
    },
  };
}

function normalizeSource(value: unknown): FiscalProfileSource | null {
  if (!isRecord(value)) return null;
  const kind =
    value.kind === "MANUAL" ||
    value.kind === "AEAT_CENSUS_CERTIFICATE" ||
    value.kind === "SKIPPED"
      ? value.kind
      : null;
  if (!kind) return null;
  const confirmedAt = isoTimestamp(value.confirmedAt);
  if (!confirmedAt) return null;
  const identityMatch = value.identityMatch === "MATCHED" ? "MATCHED" : "NOT_CHECKED";
  const csvRecord = isRecord(value.csv) ? value.csv : null;
  const csvDetected = csvRecord?.detected === true;
  const verificationStatus =
    csvRecord?.verificationStatus === "USER_VERIFIED"
      ? "USER_VERIFIED"
      : "PENDING_VERIFICATION";
  const matchedTaxId = normalizeSpanishTaxId(
    cleanText(value.matchedTaxId, 16),
  );
  return {
    kind,
    confirmedAt,
    identityMatch,
    ...(value.documentKind === "AEAT_CENSUS_CERTIFICATE" ||
    value.documentKind === "MODEL_036" ||
    value.documentKind === "UNKNOWN"
      ? { documentKind: value.documentKind }
      : {}),
    ...(value.extractionMethod === "LOCAL_TEXT"
      ? { extractionMethod: "LOCAL_TEXT" as const }
      : {}),
    ...(/^[A-Z0-9]{9}$/.test(matchedTaxId)
      ? { matchedTaxId }
      : {}),
    ...(isoDate(value.documentDate)
      ? { documentDate: value.documentDate as string }
      : {}),
    ...(csvDetected
      ? {
          csv: {
            detected: true as const,
            verificationStatus,
            ...(isoTimestamp(csvRecord?.verifiedAt)
              ? { verifiedAt: csvRecord?.verifiedAt as string }
              : {}),
          },
        }
      : {}),
  };
}

export function normalizeBusinessFiscalProfile(
  value: unknown,
): BusinessFiscalProfile | undefined {
  if (!isRecord(value)) return undefined;
  if (value.schemaVersion !== FISCAL_PROFILE_SCHEMA_VERSION) return undefined;
  const source = normalizeSource(value.source);
  if (!source) return undefined;
  const setupStatus = value.setupStatus === "SKIPPED" ? "SKIPPED" : "CONFIGURED";
  if (setupStatus === "SKIPPED") return createSkippedFiscalProfile(source.confirmedAt);
  return {
    schemaVersion: FISCAL_PROFILE_SCHEMA_VERSION,
    setupStatus,
    taxpayerType: enumValue(value.taxpayerType, TAXPAYER_TYPES, "UNKNOWN"),
    jurisdiction: enumValue(value.jurisdiction, JURISDICTIONS, "UNKNOWN"),
    directTaxRegime: enumValue(
      value.directTaxRegime,
      DIRECT_TAX_REGIMES,
      "UNKNOWN",
    ),
    vatRegime: enumValue(value.vatRegime, VAT_REGIMES, "UNKNOWN"),
    vatDeductionRight: enumValue(
      value.vatDeductionRight,
      VAT_DEDUCTION_RIGHTS,
      "UNKNOWN",
    ),
    activities: normalizeFiscalActivities(value.activities),
    source,
  };
}

export function fiscalProfileMissingLabels(profile: BusinessFiscalProfile): string[] {
  if (profile.setupStatus === "SKIPPED") {
    return ["perfil fiscal no configurado"];
  }
  const missing: string[] = [];
  if (profile.taxpayerType === "UNKNOWN") missing.push("tipo de contribuyente");
  if (profile.jurisdiction === "UNKNOWN") missing.push("territorio fiscal");
  if (
    profile.taxpayerType === "SELF_EMPLOYED_IRPF" &&
    profile.directTaxRegime === "UNKNOWN"
  ) {
    missing.push("régimen de IRPF");
  }
  if (profile.vatRegime === "UNKNOWN") missing.push("régimen de IVA");
  if (profile.vatDeductionRight === "UNKNOWN") {
    missing.push("derecho general a deducir IVA");
  }
  if (!profile.activities.some((activity) => activity.description.trim())) {
    missing.push("actividad económica");
  }
  return missing;
}

export function fiscalProfileToDraft(
  profile: BusinessFiscalProfile | undefined,
): FiscalProfileDraft {
  if (!profile) return emptyFiscalProfileDraft();
  return {
    taxpayerType: profile.taxpayerType,
    jurisdiction: profile.jurisdiction,
    directTaxRegime: profile.directTaxRegime,
    vatRegime: profile.vatRegime,
    vatDeductionRight: profile.vatDeductionRight,
    activities: profile.activities.map((activity) => ({ ...activity })),
  };
}
