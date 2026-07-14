import {
  TAX_MODEL_DIAGNOSTIC_SCHEMA_VERSION,
  type ActivityKind,
  type DiagnosticVatRegime,
  type Evidence,
  type FiscalTerritory,
  type FourWayAnswer,
  type IncomeTaxRegime,
  type InvoicingSubject,
  type TaxModelDiagnosticSession,
  type TaxModelNumber,
  type TaxpayerProfile,
  type TaxpayerRole,
} from "./contracts";

const FOUR_WAY = new Set<FourWayAnswer>([
  "YES",
  "NO",
  "UNKNOWN",
  "NOT_APPLICABLE",
]);
const TERRITORIES = new Set<FiscalTerritory>([
  "UNKNOWN",
  "ES_COMMON",
  "ES_CANARY",
  "ES_NAVARRA",
  "ES_BASQUE_ALAVA",
  "ES_BASQUE_BIZKAIA",
  "ES_BASQUE_GIPUZKOA",
  "ES_CEUTA",
  "ES_MELILLA",
  "NON_RESIDENT",
  "UNCERTAIN",
]);
const INVOICING_SUBJECTS = new Set<InvoicingSubject>([
  "UNKNOWN",
  "NATURAL_PERSON",
  "COMPANY",
  "COMMUNITY_OF_PROPERTY",
  "CIVIL_PARTNERSHIP",
  "OTHER_ENTITY",
]);
const TAXPAYER_ROLES = new Set<TaxpayerRole>([
  "UNKNOWN",
  "INDIVIDUAL_SELF_EMPLOYED",
  "CORPORATE_SELF_EMPLOYED",
  "COLLABORATING_SELF_EMPLOYED",
  "PARTNER_OR_COMMUNITY_MEMBER",
  "DIRECTOR",
  "SEVERAL",
]);
const ACTIVITY_KINDS = new Set<ActivityKind>([
  "PROFESSIONAL",
  "BUSINESS",
  "AGRICULTURE",
  "LIVESTOCK",
  "FORESTRY",
  "OTHER",
]);
const INCOME_TAX_REGIMES = new Set<IncomeTaxRegime>([
  "UNKNOWN",
  "DIRECT_NORMAL",
  "DIRECT_SIMPLIFIED",
  "OBJECTIVE_ESTIMATION",
  "ENTITY_ATTRIBUTION",
  "NOT_APPLICABLE",
]);
const VAT_REGIMES = new Set<DiagnosticVatRegime>([
  "GENERAL",
  "SIMPLIFIED",
  "EQUIVALENCE_SURCHARGE",
  "AGRICULTURE_LIVESTOCK_FISHING",
  "CASH_ACCOUNTING",
  "EXEMPT",
  "NOT_SUBJECT",
  "OTHER_SPECIAL",
]);
export const TAX_MODEL_NUMBERS: readonly TaxModelNumber[] = [
  "035",
  "036",
  "100",
  "111",
  "115",
  "123",
  "130",
  "131",
  "180",
  "184",
  "190",
  "193",
  "200",
  "202",
  "216",
  "296",
  "303",
  "308",
  "309",
  "341",
  "347",
  "349",
  "369",
  "390",
  "714",
  "720",
  "721",
] as const;
const MODEL_NUMBERS = new Set<TaxModelNumber>(TAX_MODEL_NUMBERS);

const FOUR_WAY_FIELDS = [
  "hasPersonalActivity",
  "retaDuringYear",
  "redeme",
  "sii",
  "largeCompany",
  "vatAnnualSummaryExempt",
  "reverseChargeTransactions",
  "specialVatRefundSituation",
  "employees",
  "paidProfessionalsWithWithholding",
  "otherIrpfWithholdingPayments",
  "rentsBusinessPremises",
  "rentSubjectToWithholding",
  "landlordWithholdingExemption",
  "paidCapitalIncome",
  "paidNonResidentIncome",
  "nonResidentWithholdingConfirmed",
  "euGoodsSales",
  "euGoodsPurchases",
  "euServicesSales",
  "euServicesPurchases",
  "roiRegistered",
  "euConsumerSales",
  "ossRegistered",
  "thirdPartyThresholdExceeded",
  "thirdPartyOperationsAllExcluded",
  "companyInstallmentPayments",
  "attributionEntityIncomeAboveThreshold",
  "foreignAssetsPotentiallyReportable",
  "foreignCryptoPotentiallyReportable",
  "wealthTaxPotentiallyApplicable",
  "changesDuringYear",
  "censusReviewed",
] as const satisfies readonly (keyof TaxpayerProfile)[];

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function enumValue<T extends string>(
  value: unknown,
  allowed: ReadonlySet<T>,
  fallback: T,
): T {
  return typeof value === "string" && allowed.has(value as T)
    ? (value as T)
    : fallback;
}

function isoDate(value: unknown): string | null {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return null;
  }
  const date = new Date(`${value}T00:00:00Z`);
  return Number.isFinite(date.getTime()) && date.toISOString().startsWith(value)
    ? value
    : null;
}

function stringArray<T extends string>(
  value: unknown,
  allowed: ReadonlySet<T>,
  maximum: number,
): T[] {
  if (!Array.isArray(value)) return [];
  return [...new Set(value.filter((item): item is T =>
    typeof item === "string" && allowed.has(item as T),
  ))].slice(0, maximum);
}

export function createEmptyTaxpayerProfile(
  fiscalYear: 2025 | 2026 = 2026,
): TaxpayerProfile {
  const profile: TaxpayerProfile = {
    fiscalYear,
    territory: "UNKNOWN",
    invoicingSubject: "UNKNOWN",
    taxpayerRole: "UNKNOWN",
    hasPersonalActivity: "UNKNOWN",
    retaDuringYear: "UNKNOWN",
    activityStartDate: null,
    activityEndDate: null,
    activityKinds: [],
    incomeTaxRegime: "UNKNOWN",
    withheldIncomePercent: null,
    vatRegimes: [],
    redeme: "UNKNOWN",
    sii: "UNKNOWN",
    largeCompany: "UNKNOWN",
    vatAnnualSummaryExempt: "UNKNOWN",
    reverseChargeTransactions: "UNKNOWN",
    specialVatRefundSituation: "UNKNOWN",
    employees: "UNKNOWN",
    paidProfessionalsWithWithholding: "UNKNOWN",
    otherIrpfWithholdingPayments: "UNKNOWN",
    rentsBusinessPremises: "UNKNOWN",
    rentSubjectToWithholding: "UNKNOWN",
    landlordWithholdingExemption: "UNKNOWN",
    paidCapitalIncome: "UNKNOWN",
    paidNonResidentIncome: "UNKNOWN",
    nonResidentWithholdingConfirmed: "UNKNOWN",
    euGoodsSales: "UNKNOWN",
    euGoodsPurchases: "UNKNOWN",
    euServicesSales: "UNKNOWN",
    euServicesPurchases: "UNKNOWN",
    roiRegistered: "UNKNOWN",
    euConsumerSales: "UNKNOWN",
    ossRegistered: "UNKNOWN",
    thirdPartyThresholdExceeded: "UNKNOWN",
    thirdPartyOperationsAllExcluded: "UNKNOWN",
    companyInstallmentPayments: "UNKNOWN",
    attributionEntityIncomeAboveThreshold: "UNKNOWN",
    foreignAssetsPotentiallyReportable: "UNKNOWN",
    foreignCryptoPotentiallyReportable: "UNKNOWN",
    wealthTaxPotentiallyApplicable: "UNKNOWN",
    changesDuringYear: "UNKNOWN",
    censusReviewed: "UNKNOWN",
    censusObligations: [],
  };
  return profile;
}

export function normalizeTaxpayerProfile(value: unknown): TaxpayerProfile {
  const input = isRecord(value) ? value : {};
  const fiscalYear = input.fiscalYear === 2025 ? 2025 : 2026;
  const profile = createEmptyTaxpayerProfile(fiscalYear);
  profile.territory = enumValue(input.territory, TERRITORIES, "UNKNOWN");
  profile.invoicingSubject = enumValue(
    input.invoicingSubject,
    INVOICING_SUBJECTS,
    "UNKNOWN",
  );
  profile.taxpayerRole = enumValue(
    input.taxpayerRole,
    TAXPAYER_ROLES,
    "UNKNOWN",
  );
  profile.activityStartDate = isoDate(input.activityStartDate);
  profile.activityEndDate = isoDate(input.activityEndDate);
  profile.activityKinds = stringArray(input.activityKinds, ACTIVITY_KINDS, 6);
  profile.incomeTaxRegime = enumValue(
    input.incomeTaxRegime,
    INCOME_TAX_REGIMES,
    "UNKNOWN",
  );
  profile.withheldIncomePercent =
    typeof input.withheldIncomePercent === "number" &&
    Number.isFinite(input.withheldIncomePercent) &&
    input.withheldIncomePercent >= 0 &&
    input.withheldIncomePercent <= 100
      ? Math.round(input.withheldIncomePercent * 100) / 100
      : null;
  profile.vatRegimes = stringArray(input.vatRegimes, VAT_REGIMES, 8);
  profile.censusObligations = stringArray(
    input.censusObligations,
    MODEL_NUMBERS,
    TAX_MODEL_NUMBERS.length,
  );
  for (const field of FOUR_WAY_FIELDS) {
    profile[field] = enumValue(input[field], FOUR_WAY, "UNKNOWN");
  }
  return profile;
}

function normalizeEvidence(value: unknown): Evidence[] {
  if (!Array.isArray(value)) return [];
  const evidence: Evidence[] = [];
  for (const item of value) {
    if (!isRecord(item) || item.userConfirmed !== true) continue;
    if (typeof item.evidenceId !== "string" || typeof item.field !== "string") {
      continue;
    }
    if (
      item.extractionMethod !== "MANUAL" &&
      item.extractionMethod !== "PDF_NATIVE_TEXT" &&
      item.extractionMethod !== "OCR_LOCAL" &&
      item.extractionMethod !== "OCR_EXTERNAL"
    ) {
      continue;
    }
    const confidence =
      typeof item.confidence === "number" && Number.isFinite(item.confidence)
        ? Math.min(1, Math.max(0, item.confidence))
        : 0;
    const type =
      item.type === "CURRENT_CENSUS" ||
      item.type === "MODEL_036" ||
      item.type === "PREVIOUS_RETURN" ||
      item.type === "OPERATIONS_DOCUMENT" ||
      item.type === "OTHER"
        ? item.type
        : "USER_ANSWER";
    const rawValue = item.value;
    const safeValue = Array.isArray(rawValue)
      ? rawValue.filter((entry): entry is string => typeof entry === "string").slice(0, 30)
      : typeof rawValue === "string" ||
          typeof rawValue === "number" ||
          typeof rawValue === "boolean" ||
          rawValue === null
        ? rawValue
        : null;
    evidence.push({
      evidenceId: item.evidenceId.slice(0, 120),
      type,
      ...(typeof item.documentId === "string"
        ? { documentId: item.documentId.slice(0, 120) }
        : {}),
      ...(typeof item.page === "number" && Number.isInteger(item.page) && item.page > 0
        ? { page: item.page }
        : {}),
      field: item.field.slice(0, 120),
      ...(typeof item.sourceLocation === "string"
        ? { sourceLocation: item.sourceLocation.slice(0, 240) }
        : {}),
      value: safeValue,
      confidence,
      ...(isoDate(item.date) ? { date: isoDate(item.date) as string } : {}),
      extractionMethod: item.extractionMethod,
      userConfirmed: true,
      sourcePriority:
        typeof item.sourcePriority === "number" && Number.isInteger(item.sourcePriority)
          ? Math.min(100, Math.max(0, item.sourcePriority))
          : 0,
    });
    if (evidence.length >= 200) break;
  }
  return evidence;
}

export function createTaxModelDiagnosticSession(
  now: string,
  fiscalYear: 2025 | 2026 = 2026,
): TaxModelDiagnosticSession {
  return {
    schemaVersion: TAX_MODEL_DIAGNOSTIC_SCHEMA_VERSION,
    profile: createEmptyTaxpayerProfile(fiscalYear),
    evidence: [],
    completedQuestionIds: [],
    currentSection: "A",
    updatedAt: now,
  };
}

export function normalizeTaxModelDiagnosticSession(
  value: unknown,
): TaxModelDiagnosticSession | undefined {
  if (!isRecord(value) || value.schemaVersion !== TAX_MODEL_DIAGNOSTIC_SCHEMA_VERSION) {
    return undefined;
  }
  const updatedAt =
    typeof value.updatedAt === "string" && Number.isFinite(Date.parse(value.updatedAt))
      ? value.updatedAt
      : new Date(0).toISOString();
  return {
    schemaVersion: TAX_MODEL_DIAGNOSTIC_SCHEMA_VERSION,
    profile: normalizeTaxpayerProfile(value.profile),
    evidence: normalizeEvidence(value.evidence),
    completedQuestionIds: Array.isArray(value.completedQuestionIds)
      ? [...new Set(
          value.completedQuestionIds.filter(
            (item): item is string => typeof item === "string",
          ),
        )].slice(0, 200)
      : [],
    currentSection:
      typeof value.currentSection === "string"
        ? value.currentSection.slice(0, 20)
        : "A",
    updatedAt,
  };
}
