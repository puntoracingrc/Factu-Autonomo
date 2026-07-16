import { createHash } from "node:crypto";

export const TAX_DIAGNOSTIC_PROBLEM_CLASSIFICATIONS = [
  "COPY_PROBLEM",
  "QUESTION_STRUCTURE_PROBLEM",
  "RULE_RECOMMENDATION_PROBLEM",
  "DOCUMENT_CLASSIFICATION_PROBLEM",
  "FIELD_EXTRACTION_PROBLEM",
  "TEMPORAL_SCOPE_PROBLEM",
  "ENTITY_SEPARATION_PROBLEM",
  "UNKNOWN_HANDLING_PROBLEM",
  "CONTRADICTION_HANDLING_PROBLEM",
] as const;

export const TAX_DIAGNOSTIC_REGRESSION_ORIGINS = [
  "SYNTHETIC_REGRESSION",
  "REAL_ANONYMIZED_REGRESSION",
] as const;

export const TAX_DIAGNOSTIC_REGRESSION_FLOW = Object.freeze([
  "AGGREGATED_SIGNAL",
  "PII_FREE_REPRODUCTION",
  "PROBLEM_CLASSIFICATION",
  "FAILING_REGRESSION_TEST",
  "MINIMAL_CORRECTION",
  "FULL_SUITE",
  "DEPLOYMENT",
  "POST_DEPLOYMENT_COMPARISON",
] as const);

export interface TaxDiagnosticRegressionManifest {
  regressionId: string;
  classification: (typeof TAX_DIAGNOSTIC_PROBLEM_CLASSIFICATIONS)[number];
  origin: (typeof TAX_DIAGNOSTIC_REGRESSION_ORIGINS)[number];
  family?: string;
  fiscalYear: number;
  layout?: string;
  affectedField?: string;
  affectedQuestionId?: string;
  expectedOutput: Record<string, boolean | number | string | null>;
  mustNotInfer: readonly string[];
  associatedTest: string;
  fixtureSha256: string;
}

const ID = /^[A-Z0-9][A-Z0-9_.:-]{2,119}$/i;
const SHA256 = /^[a-f0-9]{64}$/;
const PROHIBITED = /(?:nif|nie|cif|email|nombre|apellido|domicilio|filename|raw|ocrText|importe|iban|nrc|csv)/i;

export function validateTaxDiagnosticRegressionManifest(
  manifest: TaxDiagnosticRegressionManifest,
): string[] {
  const errors: string[] = [];
  if (!ID.test(manifest.regressionId)) errors.push("INVALID_REGRESSION_ID");
  if (!TAX_DIAGNOSTIC_PROBLEM_CLASSIFICATIONS.includes(manifest.classification)) errors.push("INVALID_CLASSIFICATION");
  if (!TAX_DIAGNOSTIC_REGRESSION_ORIGINS.includes(manifest.origin)) errors.push("INVALID_ORIGIN");
  if (!Number.isInteger(manifest.fiscalYear) || manifest.fiscalYear < 2020 || manifest.fiscalYear > 2100) errors.push("INVALID_FISCAL_YEAR");
  if (!SHA256.test(manifest.fixtureSha256)) errors.push("INVALID_FIXTURE_HASH");
  if (!ID.test(manifest.associatedTest)) errors.push("INVALID_ASSOCIATED_TEST");
  if (!Array.isArray(manifest.mustNotInfer) || manifest.mustNotInfer.length === 0) errors.push("MISSING_MUST_NOT_INFER");
  const serialized = JSON.stringify(manifest);
  if (PROHIBITED.test(serialized)) errors.push("POSSIBLE_PERSONAL_OR_RAW_DATA");
  if (manifest.origin === "REAL_ANONYMIZED_REGRESSION" && !manifest.family) errors.push("REAL_VARIANT_REQUIRES_FAMILY");
  return [...new Set(errors)];
}

export function sha256RegressionFixture(content: Uint8Array | string): string {
  return createHash("sha256").update(content).digest("hex");
}
