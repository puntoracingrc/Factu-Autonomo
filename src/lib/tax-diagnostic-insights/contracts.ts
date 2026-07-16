export const TAX_PRODUCT_EVENT_CONTRACT_VERSION = "1.0.0" as const;

export const TAX_PRODUCT_EVENT_TYPES = [
  "tax_diagnostic_started",
  "tax_question_viewed",
  "tax_question_answered",
  "tax_question_changed",
  "tax_diagnostic_completed",
  "tax_diagnostic_abandoned",
  "tax_document_scan_started",
  "tax_document_classified",
  "tax_document_field_reviewed",
  "tax_document_scan_failed",
  "tax_evaluation_generated",
  "tax_model_recommendation_viewed",
  "tax_model_manual_added",
  "tax_model_manual_removed",
  "tax_models_saved",
  "tax_models_catalog_opened",
  "tax_calendar_opened",
  "tax_calendar_event_opened",
  "tax_calendar_filters_used",
  "tax_calendar_model_opened",
] as const;

export type TaxProductEventType = (typeof TAX_PRODUCT_EVENT_TYPES)[number];
export type TaxProductPage = "DIAGNOSTIC" | "MODELS" | "CALENDAR";
export type TaxProductConfidenceBucket = "HIGH" | "MEDIUM" | "LOW";
export type TaxProductDeviceCategory = "MOBILE" | "TABLET" | "DESKTOP" | "UNKNOWN";
export type TaxProductProperty = boolean | number | string | null;

export interface TaxProductEventInput {
  id: string;
  occurredAt: string;
  sessionId: string;
  eventType: TaxProductEventType;
  page?: TaxProductPage;
  deviceCategory?: TaxProductDeviceCategory;
  questionId?: string;
  questionGroup?: string;
  riskTag?: string;
  modelNumber?: string;
  recommendationStatus?: string;
  documentFamily?: string;
  extractionMethod?: string;
  confidenceBucket?: TaxProductConfidenceBucket;
  fiscalYear?: number;
  engineVersion?: string;
  rulesetVersion?: string;
  layoutVersion?: string;
  properties: Record<string, TaxProductProperty>;
}

export interface TaxProductEvent extends TaxProductEventInput {
  contractVersion: typeof TAX_PRODUCT_EVENT_CONTRACT_VERSION;
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const IDENTIFIER = /^[A-Z0-9][A-Z0-9_.:-]{0,119}$/i;
const QUESTION_ID = /^[A-Z][A-Z0-9_]{1,79}$/;
const MODEL_NUMBER = /^[A-Z0-9]{1,8}$/;
const ISO_DATE_TIME = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,3})?Z$/;
const EMAIL = /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/i;
const SPANISH_TAX_ID = /\b(?:[XYZ]\d{7}[A-Z]|\d{8}[A-Z]|[ABCDEFGHJNPQRSUVW]\d{7}[0-9A-J])\b/i;
const IBAN = /\bES\d{22}\b/i;
const PROHIBITED_KEY = /(?:name|nombre|surname|apellido|nif|nie|cif|email|mail|phone|telefono|address|domicilio|filename|file_name|raw|ocr|text|texto|amount|importe|iban|bank|nrc|csv|reference|referencia|coordinate|content|payload)/i;

type ScalarKind =
  | "boolean"
  | "integer"
  | "nonNegativeInteger"
  | "identifier"
  | readonly string[];

interface EventSchema {
  requiredTopLevel?: readonly (keyof TaxProductEventInput)[];
  requiredProperties: Readonly<Record<string, ScalarKind>>;
  optionalProperties?: Readonly<Record<string, ScalarKind>>;
}

const ANSWER_KINDS = [
  "YES",
  "NO",
  "UNKNOWN",
  "NOT_APPLICABLE",
  "OPTION_SELECTED",
] as const;
const RECOMMENDATION_STATUSES = [
  "LIKELY_REQUIRED",
  "POSSIBLY_REQUIRED",
  "UNLIKELY_REQUIRED",
  "NEEDS_INFORMATION",
  "MANUALLY_SELECTED",
] as const;
const SOURCE_PAGES = ["DIAGNOSTIC", "MODELS", "CALENDAR"] as const;

const EVENT_SCHEMAS: Readonly<Record<TaxProductEventType, EventSchema>> = {
  tax_diagnostic_started: {
    requiredTopLevel: ["engineVersion", "rulesetVersion", "fiscalYear"],
    requiredProperties: {
      entryPoint: ["FISCAL_ADVISORY_MENU", "MODELS", "CALENDAR", "DIRECT"],
    },
  },
  tax_question_viewed: {
    requiredTopLevel: ["questionId", "questionGroup"],
    requiredProperties: { position: "nonNegativeInteger" },
  },
  tax_question_answered: {
    requiredTopLevel: ["questionId", "questionGroup"],
    requiredProperties: {
      answerKind: ANSWER_KINDS,
      answerSource: ["USER", "DOCUMENT_PREFILL", "SAVED_PROFILE"],
      wasChanged: "boolean",
    },
  },
  tax_question_changed: {
    requiredTopLevel: ["questionId", "questionGroup"],
    requiredProperties: {
      previousAnswerKind: ANSWER_KINDS,
      newAnswerKind: ANSWER_KINDS,
      changeOrigin: ["USER", "DOCUMENT_CORRECTION", "BACK_NAVIGATION"],
    },
  },
  tax_diagnostic_completed: {
    requiredTopLevel: ["engineVersion", "rulesetVersion"],
    requiredProperties: {
      questionCountShown: "nonNegativeInteger",
      unknownCount: "nonNegativeInteger",
      contradictionCount: "nonNegativeInteger",
      documentCount: "nonNegativeInteger",
      durationBucket: ["UNDER_2M", "2_TO_5M", "5_TO_15M", "OVER_15M"],
    },
  },
  tax_diagnostic_abandoned: {
    requiredTopLevel: ["questionId", "questionGroup"],
    requiredProperties: {
      questionsAnswered: "nonNegativeInteger",
      unknownCount: "nonNegativeInteger",
      durationBucket: ["UNDER_2M", "2_TO_5M", "5_TO_15M", "OVER_15M"],
    },
  },
  tax_document_scan_started: {
    requiredProperties: {
      inputType: ["PDF", "IMAGE", "SCREENSHOT", "MIXED"],
      pageCountBucket: ["ONE", "TWO_TO_FIVE", "SIX_TO_TWENTY", "OVER_TWENTY", "UNKNOWN"],
    },
    optionalProperties: { documentCount: "nonNegativeInteger" },
  },
  tax_document_classified: {
    requiredTopLevel: ["documentFamily", "extractionMethod", "confidenceBucket"],
    requiredProperties: {
      classificationResult: ["RECOGNIZED", "AMBIGUOUS", "UNRECOGNIZED"],
    },
    optionalProperties: {
      prefilledQuestionCount: "nonNegativeInteger",
      extractedFactCount: "nonNegativeInteger",
    },
  },
  tax_document_field_reviewed: {
    requiredTopLevel: ["documentFamily", "extractionMethod", "confidenceBucket"],
    requiredProperties: {
      fieldId: "identifier",
      action: ["CONFIRMED", "CORRECTED", "REJECTED", "MARKED_UNKNOWN"],
      answeredQuestion: "boolean",
    },
  },
  tax_document_scan_failed: {
    requiredProperties: {
      failureCode: ["READ_FAILED", "CLASSIFICATION_FAILED", "EXTRACTION_FAILED", "UNSUPPORTED", "LIMIT_EXCEEDED"],
      extractionStage: ["INTAKE", "READ", "OCR", "CLASSIFICATION", "EXTRACTION"],
      inputType: ["PDF", "IMAGE", "SCREENSHOT", "MIXED"],
      pageCountBucket: ["ONE", "TWO_TO_FIVE", "SIX_TO_TWENTY", "OVER_TWENTY", "UNKNOWN"],
    },
  },
  tax_evaluation_generated: {
    requiredTopLevel: ["engineVersion", "rulesetVersion", "fiscalYear"],
    requiredProperties: {
      likelyRequiredCount: "nonNegativeInteger",
      possiblyRequiredCount: "nonNegativeInteger",
      unlikelyRequiredCount: "nonNegativeInteger",
      needsInformationCount: "nonNegativeInteger",
      manuallySelectedCount: "nonNegativeInteger",
      contradictionCount: "nonNegativeInteger",
      documentBackedFactCount: "nonNegativeInteger",
    },
  },
  tax_model_recommendation_viewed: {
    requiredTopLevel: ["modelNumber", "recommendationStatus", "page"],
    requiredProperties: {
      reasonExpanded: "boolean",
      sourcePage: SOURCE_PAGES,
    },
  },
  tax_model_manual_added: {
    requiredTopLevel: ["modelNumber", "page"],
    requiredProperties: {
      previousRecommendationStatus: RECOMMENDATION_STATUSES,
      sourcePage: SOURCE_PAGES,
    },
  },
  tax_model_manual_removed: {
    requiredTopLevel: ["modelNumber", "page"],
    requiredProperties: {
      previousRecommendationStatus: RECOMMENDATION_STATUSES,
      sourcePage: SOURCE_PAGES,
    },
  },
  tax_models_saved: {
    requiredTopLevel: ["engineVersion", "rulesetVersion"],
    requiredProperties: {
      recommendedCount: "nonNegativeInteger",
      manuallyAddedCount: "nonNegativeInteger",
      manuallyRemovedCount: "nonNegativeInteger",
    },
  },
  tax_models_catalog_opened: {
    requiredTopLevel: ["page"],
    requiredProperties: {},
  },
  tax_calendar_opened: {
    requiredTopLevel: ["page"],
    requiredProperties: { scope: ["ALL", "MINE"] },
  },
  tax_calendar_event_opened: {
    requiredTopLevel: ["page"],
    requiredProperties: { sourcePage: SOURCE_PAGES },
  },
  tax_calendar_filters_used: {
    requiredTopLevel: ["page"],
    requiredProperties: {
      categoryCount: "nonNegativeInteger",
      dateRangeBucket: ["UP_TO_31_DAYS", "32_TO_92_DAYS", "OVER_92_DAYS"],
    },
  },
  tax_calendar_model_opened: {
    requiredTopLevel: ["page", "modelNumber"],
    requiredProperties: { sourcePage: SOURCE_PAGES },
  },
};

const TOP_LEVEL_KEYS = new Set([
  "contractVersion",
  "id",
  "occurredAt",
  "sessionId",
  "eventType",
  "page",
  "deviceCategory",
  "questionId",
  "questionGroup",
  "riskTag",
  "modelNumber",
  "recommendationStatus",
  "documentFamily",
  "extractionMethod",
  "confidenceBucket",
  "fiscalYear",
  "engineVersion",
  "rulesetVersion",
  "layoutVersion",
  "properties",
]);

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function containsSensitiveValue(value: string): boolean {
  return EMAIL.test(value) || SPANISH_TAX_ID.test(value) || IBAN.test(value);
}

function validScalar(value: unknown, kind: ScalarKind): boolean {
  if (kind === "boolean") return typeof value === "boolean";
  if (kind === "integer") {
    return typeof value === "number" && Number.isSafeInteger(value);
  }
  if (kind === "nonNegativeInteger") {
    return (
      typeof value === "number" &&
      Number.isSafeInteger(value) &&
      value >= 0 &&
      value <= 100_000
    );
  }
  if (kind === "identifier") return validIdentifier(value);
  return typeof value === "string" && kind.includes(value);
}

function validIdentifier(value: unknown, pattern = IDENTIFIER): value is string {
  return typeof value === "string" && pattern.test(value) && !containsSensitiveValue(value);
}

export function normalizeTaxProductEvent(input: unknown): TaxProductEvent | null {
  if (!isRecord(input)) return null;
  if (Object.keys(input).some((key) => !TOP_LEVEL_KEYS.has(key) || PROHIBITED_KEY.test(key))) {
    return null;
  }
  if (
    typeof input.eventType !== "string" ||
    !TAX_PRODUCT_EVENT_TYPES.includes(input.eventType as TaxProductEventType) ||
    !UUID.test(String(input.id ?? "")) ||
    !UUID.test(String(input.sessionId ?? "")) ||
    typeof input.occurredAt !== "string" ||
    !ISO_DATE_TIME.test(input.occurredAt) ||
    !isRecord(input.properties)
  ) {
    return null;
  }
  if (
    input.contractVersion !== undefined &&
    input.contractVersion !== TAX_PRODUCT_EVENT_CONTRACT_VERSION
  ) {
    return null;
  }

  const eventType = input.eventType as TaxProductEventType;
  const schema = EVENT_SCHEMAS[eventType];
  for (const field of schema.requiredTopLevel ?? []) {
    if (input[field] === undefined || input[field] === null || input[field] === "") return null;
  }

  if (input.page !== undefined && !["DIAGNOSTIC", "MODELS", "CALENDAR"].includes(String(input.page))) return null;
  if (input.deviceCategory !== undefined && !["MOBILE", "TABLET", "DESKTOP", "UNKNOWN"].includes(String(input.deviceCategory))) return null;
  if (input.questionId !== undefined && !validIdentifier(input.questionId, QUESTION_ID)) return null;
  if (input.questionGroup !== undefined && !validIdentifier(input.questionGroup)) return null;
  if (input.riskTag !== undefined && !validIdentifier(input.riskTag)) return null;
  if (input.modelNumber !== undefined && !validIdentifier(input.modelNumber, MODEL_NUMBER)) return null;
  if (input.recommendationStatus !== undefined && !RECOMMENDATION_STATUSES.includes(input.recommendationStatus as (typeof RECOMMENDATION_STATUSES)[number])) return null;
  if (input.documentFamily !== undefined && !validIdentifier(input.documentFamily)) return null;
  if (input.extractionMethod !== undefined && !validIdentifier(input.extractionMethod)) return null;
  if (input.extractionMethod !== undefined && !["NATIVE", "PDF_FORM", "OCR", "MIXED"].includes(String(input.extractionMethod))) return null;
  if (input.confidenceBucket !== undefined && !["HIGH", "MEDIUM", "LOW"].includes(String(input.confidenceBucket))) return null;
  if (input.fiscalYear !== undefined && (!Number.isInteger(input.fiscalYear) || Number(input.fiscalYear) < 2020 || Number(input.fiscalYear) > 2100)) return null;
  for (const key of ["engineVersion", "rulesetVersion", "layoutVersion"] as const) {
    if (input[key] !== undefined && !validIdentifier(input[key])) return null;
  }

  const propertySchema = {
    ...schema.requiredProperties,
    ...(schema.optionalProperties ?? {}),
  };
  if (Object.keys(input.properties).some((key) => !(key in propertySchema) || PROHIBITED_KEY.test(key))) return null;
  for (const [key, kind] of Object.entries(schema.requiredProperties)) {
    if (!(key in input.properties) || !validScalar(input.properties[key], kind)) return null;
  }
  for (const [key, value] of Object.entries(input.properties)) {
    const kind = propertySchema[key];
    if (!kind || !validScalar(value, kind)) return null;
    if (typeof value === "string" && (value.length > 120 || containsSensitiveValue(value))) return null;
  }

  return Object.freeze({
    ...(input as unknown as TaxProductEventInput),
    contractVersion: TAX_PRODUCT_EVENT_CONTRACT_VERSION,
    properties: Object.freeze({ ...(input.properties as Record<string, TaxProductProperty>) }),
  });
}

export function confidenceBucket(value: number): TaxProductConfidenceBucket {
  if (value >= 0.85) return "HIGH";
  if (value >= 0.6) return "MEDIUM";
  return "LOW";
}

export function durationBucket(startedAt: number, endedAt = Date.now()) {
  const duration = Math.max(0, endedAt - startedAt);
  if (duration < 2 * 60_000) return "UNDER_2M" as const;
  if (duration < 5 * 60_000) return "2_TO_5M" as const;
  if (duration < 15 * 60_000) return "5_TO_15M" as const;
  return "OVER_15M" as const;
}

export function answerKindFromValue(value: unknown) {
  if (value === "YES") return "YES" as const;
  if (value === "NO") return "NO" as const;
  if (value === "UNKNOWN" || value === "UNCERTAIN") return "UNKNOWN" as const;
  if (value === "NOT_APPLICABLE") return "NOT_APPLICABLE" as const;
  return "OPTION_SELECTED" as const;
}
