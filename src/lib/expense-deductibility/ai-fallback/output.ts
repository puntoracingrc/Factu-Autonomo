import {
  allowedSourceIdsForCategory,
  containsSensitiveFiscalText,
} from "./legal-context";
import type { FiscalAiContext } from "./legal-context";
import type {
  AiConfidenceBand,
  AiFallbackClassification,
  AiFallbackTaxProposal,
  ExpenseInput,
  TaxContext,
} from "@/lib/tax-engine/types";

export const FISCAL_AI_OUTPUT_SCHEMA_NAME = "fiscal_expense_review_proposal";
export const FISCAL_AI_OUTPUT_SCHEMA_VERSION = "fiscal-ai-proposal.v1";

export interface FiscalAiProposal {
  schemaVersion: typeof FISCAL_AI_OUTPUT_SCHEMA_VERSION;
  classification: AiFallbackClassification;
  confidenceBand: AiConfidenceBand;
  sourcesSufficient: boolean;
  summary: string;
  sourceIds: readonly string[];
  missingInformation: readonly string[];
  evidenceRequired: readonly string[];
  directTax: AiFallbackTaxProposal;
  indirectTax: AiFallbackTaxProposal;
}

export type FiscalAiValidatorErrorCode =
  | "OUTPUT_NOT_OBJECT"
  | "OUTPUT_SCHEMA_MISMATCH"
  | "OUTPUT_INCOMPLETE"
  | "OUTPUT_TEXT_INVALID"
  | "OUTPUT_SENSITIVE_DATA"
  | "OUTPUT_ARRAY_INVALID"
  | "CLASSIFICATION_UNSUPPORTED"
  | "CONFIDENCE_BAND_INVALID"
  | "SOURCE_INVENTED"
  | "SOURCE_NOT_SUPPLIED"
  | "SOURCE_NOT_VERIFIED"
  | "SOURCE_NOT_RELEVANT_TO_CLASSIFICATION"
  | "UNSUPPORTED_LEGAL_REFERENCE"
  | "TAX_TYPE_UNSUPPORTED"
  | "PERCENTAGE_INVALID"
  | "AMOUNT_INVALID"
  | "AMOUNT_EXCEEDS_EXPENSE"
  | "TAX_PROPOSAL_INCOMPLETE"
  | "UNSUPPORTED_JURISDICTION"
  | "UNSUPPORTED_TAXPAYER"
  | "UNSUPPORTED_TAX_CONTEXT"
  | "INSUFFICIENT_SOURCES_WITH_AMOUNTS"
  | "INSUFFICIENT_SOURCES_NOT_EXPLAINED"
  | "LEGAL_CONTEXT_REVIEW_ONLY";

export type FiscalAiValidationResult =
  | { ok: true; proposal: FiscalAiProposal }
  | { ok: false; errorCodes: readonly FiscalAiValidatorErrorCode[] };

const TAX_PROPOSAL_SCHEMA = (taxType: "IRPF" | "IVA") => ({
  type: "object",
  properties: {
    taxType: { type: "string", enum: [taxType] },
    proposedPercentage: {
      anyOf: [
        { type: "integer", minimum: 0, maximum: 100 },
        { type: "null" },
      ],
    },
    proposedDeductibleAmountCents: {
      anyOf: [{ type: "integer", minimum: 0 }, { type: "null" }],
    },
    explanation: { type: "string", minLength: 1, maxLength: 700 },
  },
  required: [
    "taxType",
    "proposedPercentage",
    "proposedDeductibleAmountCents",
    "explanation",
  ],
  additionalProperties: false,
});

export const FISCAL_AI_OUTPUT_JSON_SCHEMA = {
  type: "object",
  properties: {
    schemaVersion: {
      type: "string",
      enum: [FISCAL_AI_OUTPUT_SCHEMA_VERSION],
    },
    classification: {
      type: "string",
      enum: [
        "MEALS_AND_HOSPITALITY",
        "VEHICLE_RUNNING_COSTS",
        "UNCLASSIFIED",
      ],
    },
    confidenceBand: {
      type: "string",
      enum: ["LOW", "MEDIUM", "HIGH"],
    },
    sourcesSufficient: { type: "boolean" },
    summary: { type: "string", minLength: 1, maxLength: 700 },
    sourceIds: {
      type: "array",
      maxItems: 20,
      items: { type: "string", minLength: 1, maxLength: 120 },
    },
    missingInformation: {
      type: "array",
      maxItems: 12,
      items: { type: "string", minLength: 1, maxLength: 500 },
    },
    evidenceRequired: {
      type: "array",
      maxItems: 12,
      items: { type: "string", minLength: 1, maxLength: 500 },
    },
    directTax: TAX_PROPOSAL_SCHEMA("IRPF"),
    indirectTax: TAX_PROPOSAL_SCHEMA("IVA"),
  },
  required: [
    "schemaVersion",
    "classification",
    "confidenceBand",
    "sourcesSufficient",
    "summary",
    "sourceIds",
    "missingInformation",
    "evidenceRequired",
    "directTax",
    "indirectTax",
  ],
  additionalProperties: false,
} as const;

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function hasExactKeys(value: Record<string, unknown>, expected: readonly string[]) {
  const keys = Object.keys(value).sort();
  return (
    keys.length === expected.length &&
    [...expected].sort().every((key, index) => key === keys[index])
  );
}

function cleanText(value: unknown, maxLength: number): string | null {
  if (typeof value !== "string") return null;
  const clean = value.trim();
  return clean && clean.length <= maxLength ? clean : null;
}

function cleanTextArray(value: unknown): readonly string[] | null {
  if (!Array.isArray(value) || value.length > 12) return null;
  const result = value.map((item) => cleanText(item, 500));
  return result.every((item): item is string => item !== null) ? result : null;
}

function legalReferenceAppears(value: string): boolean {
  return /\b(?:art[ií]culo|art\.|ley\s+\d+(?:\/\d+)?|real decreto|consulta vinculante)\b/i.test(
    value,
  );
}

function parseTaxProposal(
  value: unknown,
  expectedTaxType: "IRPF" | "IVA",
  maximumCents: number,
  errors: Set<FiscalAiValidatorErrorCode>,
): AiFallbackTaxProposal | null {
  if (!isRecord(value)) {
    errors.add("OUTPUT_INCOMPLETE");
    return null;
  }
  if (
    !hasExactKeys(value, [
      "taxType",
      "proposedPercentage",
      "proposedDeductibleAmountCents",
      "explanation",
    ])
  ) {
    errors.add("OUTPUT_SCHEMA_MISMATCH");
  }
  if (value.taxType !== expectedTaxType) {
    errors.add("TAX_TYPE_UNSUPPORTED");
  }
  const explanation = cleanText(value.explanation, 700);
  if (!explanation) errors.add("OUTPUT_TEXT_INVALID");
  if (explanation && legalReferenceAppears(explanation)) {
    errors.add("UNSUPPORTED_LEGAL_REFERENCE");
  }
  if (explanation && containsSensitiveFiscalText(explanation)) {
    errors.add("OUTPUT_SENSITIVE_DATA");
  }

  const percentage = value.proposedPercentage;
  const amount = value.proposedDeductibleAmountCents;
  if ((percentage === null) !== (amount === null)) {
    errors.add("TAX_PROPOSAL_INCOMPLETE");
  }
  if (
    percentage !== null &&
    (!Number.isInteger(percentage) ||
      (percentage as number) < 0 ||
      (percentage as number) > 100)
  ) {
    errors.add("PERCENTAGE_INVALID");
  }
  if (
    amount !== null &&
    (!Number.isSafeInteger(amount) || (amount as number) < 0)
  ) {
    errors.add("AMOUNT_INVALID");
  } else if (typeof amount === "number" && amount > maximumCents) {
    errors.add("AMOUNT_EXCEEDS_EXPENSE");
  }
  if (
    !explanation ||
    value.taxType !== expectedTaxType ||
    (percentage !== null && !Number.isInteger(percentage)) ||
    (amount !== null && !Number.isSafeInteger(amount))
  ) {
    return null;
  }
  return {
    taxType: expectedTaxType,
    proposedPercentage: percentage as number | null,
    proposedDeductibleAmountCents: amount as number | null,
    explanation,
  };
}

function supportedContext(
  input: ExpenseInput,
  context: TaxContext,
  errors: Set<FiscalAiValidatorErrorCode>,
) {
  if (context.jurisdiction !== "ES_COMMON" || input.currency !== "EUR") {
    errors.add("UNSUPPORTED_JURISDICTION");
  }
  if (context.taxpayerType !== "SELF_EMPLOYED_IRPF") {
    errors.add("UNSUPPORTED_TAXPAYER");
  }
  if (
    (context.directTaxRegime !== "DIRECT_ESTIMATION_NORMAL" &&
      context.directTaxRegime !== "DIRECT_ESTIMATION_SIMPLIFIED") ||
    context.vatRegime === "UNKNOWN"
  ) {
    errors.add("UNSUPPORTED_TAX_CONTEXT");
  }
}

export function validateFiscalAiOutput(
  value: unknown,
  suppliedContext: FiscalAiContext,
  input: ExpenseInput,
  context: TaxContext,
): FiscalAiValidationResult {
  const errors = new Set<FiscalAiValidatorErrorCode>();
  supportedContext(input, context, errors);
  if (!isRecord(value)) {
    return { ok: false, errorCodes: ["OUTPUT_NOT_OBJECT"] };
  }
  const expectedKeys = [
    "schemaVersion",
    "classification",
    "confidenceBand",
    "sourcesSufficient",
    "summary",
    "sourceIds",
    "missingInformation",
    "evidenceRequired",
    "directTax",
    "indirectTax",
  ];
  if (!hasExactKeys(value, expectedKeys)) {
    errors.add("OUTPUT_SCHEMA_MISMATCH");
  }
  if (value.schemaVersion !== FISCAL_AI_OUTPUT_SCHEMA_VERSION) {
    errors.add("OUTPUT_SCHEMA_MISMATCH");
  }

  const classification = value.classification;
  if (
    classification !== "MEALS_AND_HOSPITALITY" &&
    classification !== "VEHICLE_RUNNING_COSTS" &&
    classification !== "UNCLASSIFIED"
  ) {
    errors.add("CLASSIFICATION_UNSUPPORTED");
  }
  const confidenceBand = value.confidenceBand;
  if (
    confidenceBand !== "LOW" &&
    confidenceBand !== "MEDIUM" &&
    confidenceBand !== "HIGH"
  ) {
    errors.add("CONFIDENCE_BAND_INVALID");
  }
  const summary = cleanText(value.summary, 700);
  if (!summary) errors.add("OUTPUT_TEXT_INVALID");
  if (summary && legalReferenceAppears(summary)) {
    errors.add("UNSUPPORTED_LEGAL_REFERENCE");
  }
  if (summary && containsSensitiveFiscalText(summary)) {
    errors.add("OUTPUT_SENSITIVE_DATA");
  }
  const missingInformation = cleanTextArray(value.missingInformation);
  const evidenceRequired = cleanTextArray(value.evidenceRequired);
  if (!missingInformation || !evidenceRequired) {
    errors.add("OUTPUT_ARRAY_INVALID");
  } else if (
    [...missingInformation, ...evidenceRequired].some(legalReferenceAppears)
  ) {
    errors.add("UNSUPPORTED_LEGAL_REFERENCE");
  } else if (
    [...missingInformation, ...evidenceRequired].some(
      containsSensitiveFiscalText,
    )
  ) {
    errors.add("OUTPUT_SENSITIVE_DATA");
  }

  const suppliedSourceIds = new Set(
    suppliedContext.legalFragments.map((fragment) => fragment.sourceId),
  );
  const sourceIds = cleanTextArray(value.sourceIds);
  if (!sourceIds) {
    errors.add("OUTPUT_ARRAY_INVALID");
  } else {
    const unique = new Set(sourceIds);
    if (unique.size !== sourceIds.length) errors.add("SOURCE_INVENTED");
    for (const sourceId of sourceIds) {
      if (!suppliedSourceIds.has(sourceId)) errors.add("SOURCE_NOT_SUPPLIED");
      const fragment = suppliedContext.legalFragments.find(
        (candidate) => candidate.sourceId === sourceId,
      );
      if (!fragment) {
        errors.add("SOURCE_INVENTED");
      } else if (fragment.verificationStatus !== "VERIFIED") {
        errors.add("SOURCE_NOT_VERIFIED");
      }
    }
    if (
      (classification === "MEALS_AND_HOSPITALITY" ||
        classification === "VEHICLE_RUNNING_COSTS") &&
      (sourceIds.length === 0 ||
        sourceIds.some(
          (sourceId) =>
            !allowedSourceIdsForCategory(classification).has(sourceId),
        ))
    ) {
      errors.add("SOURCE_NOT_RELEVANT_TO_CLASSIFICATION");
    }
  }

  const directTax = parseTaxProposal(
    value.directTax,
    "IRPF",
    input.totalAmountCents,
    errors,
  );
  const indirectTax = parseTaxProposal(
    value.indirectTax,
    "IVA",
    input.vatAmountCents,
    errors,
  );
  if (typeof value.sourcesSufficient !== "boolean") {
    errors.add("OUTPUT_INCOMPLETE");
  } else if (!value.sourcesSufficient) {
    if (confidenceBand !== "LOW") {
      errors.add("CONFIDENCE_BAND_INVALID");
    }
    if (
      directTax?.proposedPercentage !== null ||
      directTax?.proposedDeductibleAmountCents !== null ||
      indirectTax?.proposedPercentage !== null ||
      indirectTax?.proposedDeductibleAmountCents !== null
    ) {
      errors.add("INSUFFICIENT_SOURCES_WITH_AMOUNTS");
    }
    if (!missingInformation || missingInformation.length === 0) {
      errors.add("INSUFFICIENT_SOURCES_NOT_EXPLAINED");
    }
  } else if (suppliedContext.legalContextMode === "VERIFIED_SUMMARIES_REVIEW_ONLY") {
    errors.add("LEGAL_CONTEXT_REVIEW_ONLY");
  }

  if (
    errors.size > 0 ||
    !summary ||
    !sourceIds ||
    !missingInformation ||
    !evidenceRequired ||
    !directTax ||
    !indirectTax ||
    (classification !== "MEALS_AND_HOSPITALITY" &&
      classification !== "VEHICLE_RUNNING_COSTS" &&
      classification !== "UNCLASSIFIED") ||
    (confidenceBand !== "LOW" &&
      confidenceBand !== "MEDIUM" &&
      confidenceBand !== "HIGH") ||
    typeof value.sourcesSufficient !== "boolean"
  ) {
    return { ok: false, errorCodes: [...errors].sort() };
  }

  return {
    ok: true,
    proposal: {
      schemaVersion: FISCAL_AI_OUTPUT_SCHEMA_VERSION,
      classification,
      confidenceBand,
      sourcesSufficient: value.sourcesSufficient,
      summary,
      sourceIds,
      missingInformation,
      evidenceRequired,
      directTax,
      indirectTax,
    },
  };
}
