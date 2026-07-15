import type {
  FiscalDocumentExtractionResult,
  FiscalDocumentType,
  JsonValue,
} from "./extractors/contracts";

export const PENDING29_CORPUS_SCHEMA_VERSION = "2.0" as const;
export const PENDING29_CORPUS_FAMILY_COUNT = 29 as const;
export const PENDING29_CORPUS_BASE_FIXTURE_COUNT = 116 as const;
export const PENDING29_CORPUS_PDF_COUNT = 348 as const;

export type Pending29VisualVariant =
  | "NATIVE_TEXT_PDF"
  | "RASTER_SCAN_COMPRESSED"
  | "RASTER_ROTATED_CAPTURE";

export type Pending29ExpectedDisposition =
  | "ACCEPT_WITH_SYNTHETIC_LIMITATION"
  | "REVIEW_OR_REJECT";

export type Pending29CorpusDocumentType =
  | "AEAT_FORM_035"
  | `AEAT_MODEL_${
      | "100"
      | "123"
      | "131"
      | "151"
      | "180"
      | "184"
      | "190"
      | "193"
      | "200"
      | "202"
      | "216"
      | "296"
      | "308"
      | "309"
      | "341"
      | "347"
      | "349"
      | "369"
      | "714"
      | "720"
      | "721"
      | "840"}`
  | "AEAT_CERT_CURRENT_CENSUS_STATUS"
  | "TGSS_REPORT_CURRENT_STATUS"
  | "TGSS_REPORT_EMPLOYMENT_HISTORY"
  | "TGSS_REPORT_SELF_EMPLOYED_ACTIVITIES"
  | "AEAT_CERT_ROI"
  | "AEAT_CERT_LANDLORD_WITHHOLDING_EXEMPTION";

export interface Pending29FieldEvidence {
  fieldId: string;
  page: number;
  label: string;
  value: JsonValue;
}

export interface Pending29FixtureManifest {
  schemaVersion: typeof PENDING29_CORPUS_SCHEMA_VERSION;
  generatorVersion: string;
  fixtureId: string;
  baseFixtureId: string;
  semanticScenario:
    | "habitual"
    | "negative_zero"
    | "complex"
    | "incomplete_ambiguous";
  documentType: Pending29CorpusDocumentType;
  displayName: string;
  synthetic: true;
  notValidForFiling: true;
  containsRealPersonalData: false;
  documentKind: string;
  fiscalYear: number;
  period: string;
  expectedPages: number;
  visualVariant: Pending29VisualVariant;
  completeDocument: boolean;
  expectedDisposition: Pending29ExpectedDisposition;
  expectedFields: Readonly<Record<string, JsonValue>>;
  expectedQuestionMappings: Readonly<Record<string, JsonValue>>;
  mustNotInfer: readonly string[];
  fieldEvidence: readonly Pending29FieldEvidence[];
  missingOrAmbiguousFields: readonly string[];
  sourceTemplate: {
    authority: "AEAT" | "TGSS";
    templateStatus: string;
    officialSources: readonly string[];
    liveServiceGenerated: false;
  };
  pdfFile: string;
  sha256: string;
}

const NUMBERED_FAMILIES = [
  "100",
  "123",
  "131",
  "151",
  "180",
  "184",
  "190",
  "193",
  "200",
  "202",
  "216",
  "296",
  "308",
  "309",
  "341",
  "347",
  "349",
  "369",
  "714",
  "720",
  "721",
  "840",
] as const;

export const PENDING29_FAMILY_REGISTRY: readonly {
  corpusDocumentType: Pending29CorpusDocumentType;
  applicationDocumentType: FiscalDocumentType;
}[] = [
  { corpusDocumentType: "AEAT_FORM_035", applicationDocumentType: "MODEL_035" },
  ...NUMBERED_FAMILIES.map((code) => ({
    corpusDocumentType: `AEAT_MODEL_${code}` as const,
    applicationDocumentType: `MODEL_${code}` as const,
  })),
  {
    corpusDocumentType: "AEAT_CERT_CURRENT_CENSUS_STATUS",
    applicationDocumentType: "CURRENT_CENSUS_CERTIFICATE",
  },
  {
    corpusDocumentType: "TGSS_REPORT_CURRENT_STATUS",
    applicationDocumentType: "TGSS_CURRENT_STATUS_REPORT",
  },
  {
    corpusDocumentType: "TGSS_REPORT_EMPLOYMENT_HISTORY",
    applicationDocumentType: "TGSS_EMPLOYMENT_HISTORY",
  },
  {
    corpusDocumentType: "TGSS_REPORT_SELF_EMPLOYED_ACTIVITIES",
    applicationDocumentType: "TGSS_SELF_EMPLOYED_ACTIVITIES",
  },
  {
    corpusDocumentType: "AEAT_CERT_ROI",
    applicationDocumentType: "ROI_CERTIFICATE",
  },
  {
    corpusDocumentType: "AEAT_CERT_LANDLORD_WITHHOLDING_EXEMPTION",
    applicationDocumentType: "LANDLORD_WITHHOLDING_EXEMPTION_CERTIFICATE",
  },
];

const FAMILY_MAP = new Map(
  PENDING29_FAMILY_REGISTRY.map((entry) => [
    entry.corpusDocumentType,
    entry.applicationDocumentType,
  ]),
);

export function mapPending29DocumentType(
  documentType: Pending29CorpusDocumentType,
): FiscalDocumentType {
  const mapped = FAMILY_MAP.get(documentType);
  if (!mapped) throw new Error(`Familia pending29 no registrada: ${documentType}`);
  return mapped;
}

export interface Pending29SafetyEvaluation {
  classificationMatches: boolean;
  requiresReviewAsExpected: boolean;
  forbiddenInferences: readonly string[];
}

/**
 * Evalúa únicamente garantías de seguridad del motor. No convierte el
 * manifiesto sintético en evidencia fiscal ni valida reglas tributarias.
 */
export function evaluatePending29Safety(
  manifest: Pending29FixtureManifest,
  result: FiscalDocumentExtractionResult,
): Pending29SafetyEvaluation {
  const forbiddenInferences: string[] = [];
  const facts = result.facts;
  const factTypes = new Set(facts.map((fact) => fact.factType));
  if (
    (result.envelope.filingStatus !== "NOT_VERIFIED" &&
      result.envelope.filingStatus !== "DRAFT" &&
      result.envelope.filingStatus !== "UNKNOWN") ||
    result.envelope.documentKind === "FILED_DECLARATION" ||
    result.envelope.documentKind === "FILED_DECLARATION_COPY" ||
    facts.some((fact) => fact.filingVerified) ||
    factTypes.has("FILING.MODEL")
  ) {
    forbiddenInferences.push("VALID_OFFICIAL_SUBMISSION");
  }
  if (facts.some((fact) => fact.temporalScope === "FUTURE_INTENTION")) {
    forbiddenInferences.push("FUTURE_OBLIGATION_WITHOUT_CURRENT_EVIDENCE");
  }
  if (
    manifest.documentType !== "AEAT_CERT_CURRENT_CENSUS_STATUS" &&
    factTypes.has("CENSUS.CURRENT_STATUS")
  ) {
    forbiddenInferences.push("CURRENT_CENSUS_STATUS");
  }
  if (
    manifest.documentType !== "AEAT_CERT_ROI" &&
    factTypes.has("EU.ROI")
  ) {
    forbiddenInferences.push("CURRENT_ROI_STATUS");
  }
  if (
    manifest.documentType === "AEAT_FORM_035" &&
    factTypes.has("ECOMMERCE.OSS_IOSS_OPERATIONS")
  ) {
    forbiddenInferences.push("ACTUAL_OSS_IOSS_OPERATIONS");
  }
  if (
    manifest.documentType === "AEAT_CERT_ROI" &&
    factTypes.has("EU.OPERATIONS")
  ) {
    forbiddenInferences.push("ACTUAL_INTRACOMMUNITY_OPERATIONS");
  }
  const reviewExpected = manifest.expectedDisposition === "REVIEW_OR_REJECT";
  const isReview =
    result.status !== "RESOLVED" &&
    !result.envelope.isComplete &&
    result.questionResolutions.every((resolution) => !resolution.canSkipQuestion);
  return {
    classificationMatches:
      result.envelope.detectedDocumentType ===
      mapPending29DocumentType(manifest.documentType),
    requiresReviewAsExpected: !reviewExpected || isReview,
    forbiddenInferences: [...new Set(forbiddenInferences)].filter((code) =>
      manifest.mustNotInfer.includes(code),
    ),
  };
}

export function validatePending29Manifest(
  manifest: Pending29FixtureManifest,
): readonly string[] {
  const errors: string[] = [];
  if (manifest.schemaVersion !== PENDING29_CORPUS_SCHEMA_VERSION) {
    errors.push("schemaVersion incompatible");
  }
  if (!manifest.synthetic || !manifest.notValidForFiling) {
    errors.push("el fixture debe ser sintético y no presentable");
  }
  if (manifest.containsRealPersonalData) {
    errors.push("el fixture no puede contener datos personales reales");
  }
  if (manifest.sourceTemplate.liveServiceGenerated) {
    errors.push("el fixture no puede declararse generado por el servicio vivo");
  }
  if (
    manifest.semanticScenario === "incomplete_ambiguous" &&
    (manifest.completeDocument ||
      manifest.expectedDisposition !== "REVIEW_OR_REJECT")
  ) {
    errors.push("un caso incompleto debe terminar en revisión o rechazo");
  }
  if (
    (manifest.documentType === "AEAT_MODEL_720" ||
      manifest.documentType === "AEAT_MODEL_721") &&
    manifest.semanticScenario === "negative_zero" &&
    (manifest.documentKind !== "SYNTHETIC_EMPTY_DRAFT" ||
      manifest.expectedDisposition !== "REVIEW_OR_REJECT")
  ) {
    errors.push("un 720/721 vacío debe seguir siendo un borrador no concluyente");
  }
  return errors;
}
