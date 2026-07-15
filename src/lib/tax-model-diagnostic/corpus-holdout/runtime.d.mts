import type { FiscalDocumentType } from "../extractors/contracts";
import type {
  TaxCorpusAdmissionDecision,
  TaxCorpusAdmissionInspection,
  TaxCorpusDocumentManifest,
  TaxCorpusManifestRecord,
  TaxCorpusMetricGroupReport,
  TaxCorpusMetricReport,
  TaxCorpusMetricSample,
  TaxCorpusStorageScope,
  TaxCorpusValidationReport,
} from "./contracts";

export type TaxCorpusManifestValidationResult =
  | { ok: true; value: TaxCorpusDocumentManifest }
  | { ok: false; errors: readonly string[] };

export function validateTaxCorpusManifest(
  input: unknown,
  storageScope: TaxCorpusStorageScope,
): TaxCorpusManifestValidationResult;

export function evaluateTaxCorpusAdmission(
  manifest: TaxCorpusDocumentManifest,
  inspection: TaxCorpusAdmissionInspection,
  knownHashes?: readonly string[],
): TaxCorpusAdmissionDecision;

export function summarizeTaxCorpusValidation(
  records: readonly TaxCorpusManifestRecord[],
  requiredFamilies: readonly FiscalDocumentType[],
  options?: { independentHoldoutEvaluated?: boolean },
): TaxCorpusValidationReport;

export function summarizeTaxCorpusMetrics(
  samples: readonly TaxCorpusMetricSample[],
): TaxCorpusMetricReport;

export function summarizeTaxCorpusMetricsByDimension(
  samples: readonly TaxCorpusMetricSample[],
): readonly TaxCorpusMetricGroupReport[];

export function assertIndependentHoldoutExecutionPolicy(input: {
  requested: boolean;
  aggregateOnly: boolean;
  jobEnabled: string | undefined;
  accessToken: string | undefined;
  repositoryRoot: string;
  holdoutRoot: string | undefined;
}): Readonly<{
  allowed: boolean;
  code: "NOT_REQUESTED" | "AUTHORIZED_AGGREGATE_INDEPENDENT_HOLDOUT_JOB";
}>;

export const assertHoldoutExecutionPolicy: typeof assertIndependentHoldoutExecutionPolicy;

export const TAX_CORPUS_RUNTIME_CONSTANTS: Readonly<{
  manifestVersion: "tax-corpus-document.2026-07.v2";
  reportVersion: "tax-corpus-validation-report.2026-07.v2";
  sourceClasses: readonly [
    "SYNTHETIC",
    "OFFICIAL_GENERATED",
    "REAL_ANONYMIZED",
    "ENGINEERING_HOLDOUT",
    "INDEPENDENT_HOLDOUT",
  ];
}>;

export const TAX_CORPUS_FAMILIES: readonly FiscalDocumentType[];
