import {
  AEAT_DOCUMENT_CHAINS_V1,
  AEAT_DOCUMENT_KNOWLEDGE_RELEASE_ID_V1,
  AEAT_DOCUMENT_KNOWLEDGE_SCHEMA_VERSION_V1,
  AEAT_DOCUMENT_OFFICIAL_SOURCE_IDS_V1,
  AEAT_DOCUMENT_PROFILE_IDS_V1,
  AEAT_DOCUMENT_PROFILES_V1,
  AEAT_DOCUMENT_RELATION_TYPE_IDS_V1,
  type AeatDocumentOfficialSourceIdV1,
  type AeatDocumentRelationTypeIdV1,
} from "./aeat-document-knowledge.v1";
import type { FiscalNotificationDocumentFamilyIdV3 } from "./document-families.v3";
import {
  PROFILE_FIELD_ADAPTERS_V2,
  PROFILE_FIELD_ADAPTER_VERSION_V2,
  resolveProfileFieldAdapterV2,
} from "../extractor-core/profile-field-adapter.v2";
import {
  FISCAL_NOTIFICATION_FAMILY_EXTRACTOR_BINDINGS_V1,
  resolveFamilyExtractorBindingV1,
} from "../extractor-core/family-extractor-registry.v1";
import {
  FAMILY_RULE_CONTRACT_VERSION_V2,
} from "../extractor-core/family-rule-contract.v2";
import {
  FISCAL_NOTIFICATION_FAMILY_RULES_V2,
  resolveFamilyRuleV2,
} from "../extractor-core/family-rule-registry.v2";
import {
  PROFILE_DRIVEN_EXTRACTOR_IMPLEMENTATION_ID_V2,
  PROFILE_DRIVEN_EXTRACTOR_VERSION_V2,
} from "../extractor-core/profile-driven-extractor.v2";
import {
  FISCAL_NOTIFICATION_DOCUMENT_EXPLANATION_ENGINE_VERSION_V2,
  FISCAL_NOTIFICATION_EXPLANATION_SECTION_IDS_V2,
  explainFiscalNotificationDocumentV2,
} from "../structured-document-explanation.v2";

export const AEAT_DOCUMENT_COMPLETION_GATE_SCHEMA_VERSION_V2 = "2.0.0" as const;
export const AEAT_DOCUMENT_COMPLETION_GATE_ID_V2 =
  "aeat-document-intelligence-completion-gate.v2" as const;
export const AEAT_DOCUMENT_TEST_MATRIX_VERSION_V2 = "2.0.0" as const;
export const AEAT_DOCUMENT_EXECUTABLE_TEST_REGISTRY_ID_V2 =
  "aeat-document-executable-test-evidence.v2" as const;

export type RecognitionStatusV2 =
  | "SPECIALIZED_RECOGNITION_IMPLEMENTED_REVIEW_ONLY"
  | "MANUAL_EXACT_SELECTION_ONLY";
export type ExtractionStatusV2 =
  | "EXTRACTOR_IMPLEMENTED_REVIEW_ONLY"
  | "MANUAL_EXACT_SELECTION_ADAPTER_REVIEW_ONLY"
  | "MISSING";
export type ExplanationStatusV2 =
  "FAMILY_EXPLANATION_IMPLEMENTED" | "GENERIC_FALLBACK" | "MISSING";
export type SourcesStatusV2 =
  "OFFICIAL_SOURCES_COMPLETE" | "MISSING" | "INVALID";
export type RelationsStatusV2 =
  "RELATIONS_DECLARED" | "NO_AUTOMATIC_RELATION" | "MISSING" | "INVALID";
export type TestCaseCoverageStatusV2 = "COVERED" | "MISSING";

export interface ExecutableTestEvidenceV2 {
  readonly evidenceId: string;
  readonly evidenceVersion: typeof AEAT_DOCUMENT_TEST_MATRIX_VERSION_V2;
  readonly suitePath: string;
  readonly caseName: string;
  readonly scope:
    | "EVERY_PROFILE_ADAPTER"
    | "EVERY_FAMILY_EXPLANATION"
    | "EVERY_PROFILE_DRIVEN_EXTRACTOR"
    | "SPECIALIZED_FAMILY_EXTRACTOR";
}

const PROFILE_ADAPTER_POSITIVE_EVIDENCE_V2 = {
  evidenceId: "test.profile-field-adapter.v2.matrix.positive",
  evidenceVersion: AEAT_DOCUMENT_TEST_MATRIX_VERSION_V2,
  suitePath:
    "src/lib/fiscal-notifications/extractor-core/profile-field-adapter.v2.test.ts",
  caseName: "adapts every declared field positively without confirming effects",
  scope: "EVERY_PROFILE_ADAPTER",
} as const satisfies ExecutableTestEvidenceV2;

const PROFILE_ADAPTER_NEGATIVE_EVIDENCE_V2 = {
  evidenceId: "test.profile-field-adapter.v2.matrix.negative",
  evidenceVersion: AEAT_DOCUMENT_TEST_MATRIX_VERSION_V2,
  suitePath:
    "src/lib/fiscal-notifications/extractor-core/profile-field-adapter.v2.test.ts",
  caseName: "rejects a candidate outside the selected profile contract",
  scope: "EVERY_PROFILE_ADAPTER",
} as const satisfies ExecutableTestEvidenceV2;

const PROFILE_ADAPTER_AMBIGUOUS_EVIDENCE_V2 = {
  evidenceId: "test.profile-field-adapter.v2.matrix.ambiguous",
  evidenceVersion: AEAT_DOCUMENT_TEST_MATRIX_VERSION_V2,
  suitePath:
    "src/lib/fiscal-notifications/extractor-core/profile-field-adapter.v2.test.ts",
  caseName: "keeps an ambiguous candidate out of all fields",
  scope: "EVERY_PROFILE_ADAPTER",
} as const satisfies ExecutableTestEvidenceV2;

const PROFILE_ADAPTER_INCOMPLETE_EVIDENCE_V2 = {
  evidenceId: "test.profile-field-adapter.v2.matrix.incomplete",
  evidenceVersion: AEAT_DOCUMENT_TEST_MATRIX_VERSION_V2,
  suitePath:
    "src/lib/fiscal-notifications/extractor-core/profile-field-adapter.v2.test.ts",
  caseName: "reports an incomplete candidate set without materializing anything",
  scope: "EVERY_PROFILE_ADAPTER",
} as const satisfies ExecutableTestEvidenceV2;

const ALL_EXPLANATIONS_EVIDENCE_V2 = {
  evidenceId: "test.structured-document-explanation.v2.all-87-families",
  evidenceVersion: AEAT_DOCUMENT_TEST_MATRIX_VERSION_V2,
  suitePath:
    "src/lib/fiscal-notifications/structured-document-explanation.v2.test.ts",
  caseName:
    "explains exactly all 87 registered families through their own metadata and ten sections",
  scope: "EVERY_FAMILY_EXPLANATION",
} as const satisfies ExecutableTestEvidenceV2;

/**
 * Historical independent evidence for the first closed recognizers. It stays
 * registered for auditability, but current completion is proven by the V2
 * profile-driven matrix that exercises every family rule.
 */
const LEGACY_SPECIALIZED_EXTRACTOR_TEST_EVIDENCE_V2 =
  deepFreeze({
    "notification.delivery_attempt": {
      evidenceId: "test.notification-envelope.v1.delivery-attempt",
      evidenceVersion: AEAT_DOCUMENT_TEST_MATRIX_VERSION_V2,
      suitePath:
        "src/lib/fiscal-notifications/extractor-core/notification-envelope-extractor.v1.test.ts",
      caseName: "maps a literal notice of availability to the delivery-attempt family",
      scope: "SPECIALIZED_FAMILY_EXTRACTOR",
    },
    "notification.publication_or_appearance": {
      evidenceId: "test.notification-envelope.v1.publication-or-appearance",
      evidenceVersion: AEAT_DOCUMENT_TEST_MATRIX_VERSION_V2,
      suitePath:
        "src/lib/fiscal-notifications/extractor-core/notification-envelope-extractor.v1.test.ts",
      caseName: "maps an exact publication to publication or appearance",
      scope: "SPECIALIZED_FAMILY_EXTRACTOR",
    },
    "notification.dehu_envelope": {
      evidenceId: "test.notification-envelope.v1.dehu-envelope",
      evidenceVersion: AEAT_DOCUMENT_TEST_MATRIX_VERSION_V2,
      suitePath:
        "src/lib/fiscal-notifications/extractor-core/notification-envelope-extractor.v1.test.ts",
      caseName: "runs after the closed segmenter and extracts an accepted DEHú receipt",
      scope: "SPECIALIZED_FAMILY_EXTRACTOR",
    },
    "compliance.formal_filing_requirement": {
      evidenceId: "test.requirement.v1.formal-filing",
      evidenceVersion: AEAT_DOCUMENT_TEST_MATRIX_VERSION_V2,
      suitePath:
        "src/lib/fiscal-notifications/extractor-core/formal-filing-requirement-extractor.v1.test.ts",
      caseName: "extracts only the fields printed in a complete formal filing requirement",
      scope: "SPECIALIZED_FAMILY_EXTRACTOR",
    },
    "compliance.document_request": {
      evidenceId: "test.requirement.v1.document-request",
      evidenceVersion: AEAT_DOCUMENT_TEST_MATRIX_VERSION_V2,
      suitePath:
        "src/lib/fiscal-notifications/extractor-core/formal-filing-requirement-extractor.v1.test.ts",
      caseName: "extracts a closed documentation requirement as its own review-only family",
      scope: "SPECIALIZED_FAMILY_EXTRACTOR",
    },
    "assessment.allegations_and_proposal": {
      evidenceId: "test.assessment.v1.allegations-proposal",
      evidenceVersion: AEAT_DOCUMENT_TEST_MATRIX_VERSION_V2,
      suitePath:
        "src/lib/fiscal-notifications/extractor-core/assessment-extractor.v1.test.ts",
      caseName: "extracts a proposal as an allegations stage without creating a debt claim",
      scope: "SPECIALIZED_FAMILY_EXTRACTOR",
    },
    "assessment.final_provisional_assessment": {
      evidenceId: "test.assessment.v1.final-provisional",
      evidenceVersion: AEAT_DOCUMENT_TEST_MATRIX_VERSION_V2,
      suitePath:
        "src/lib/fiscal-notifications/extractor-core/assessment-extractor.v1.test.ts",
      caseName: "extracts a final provisional assessment and an explicit review-only debt claim",
      scope: "SPECIALIZED_FAMILY_EXTRACTOR",
    },
    "collection.enforcement_order": {
      evidenceId: "test.existing-adapters.v1.enforcement-order",
      evidenceVersion: AEAT_DOCUMENT_TEST_MATRIX_VERSION_V2,
      suitePath:
        "src/lib/fiscal-notifications/extractor-core/existing-extractor-adapters.v1.test.ts",
      caseName: "projects an exact enforcement order with its printed data, without enabling actions",
      scope: "SPECIALIZED_FAMILY_EXTRACTOR",
    },
    "collection.deferral_grant": {
      evidenceId: "test.existing-adapters.v1.deferral-grant",
      evidenceVersion: AEAT_DOCUMENT_TEST_MATRIX_VERSION_V2,
      suitePath:
        "src/lib/fiscal-notifications/extractor-core/existing-extractor-adapters.v1.test.ts",
      caseName: "adapts the explicit debt schedule printed in a deferral annex",
      scope: "SPECIALIZED_FAMILY_EXTRACTOR",
    },
    "collection.deferral_denial": {
      evidenceId: "test.deferral-denial.v1.denial",
      evidenceVersion: AEAT_DOCUMENT_TEST_MATRIX_VERSION_V2,
      suitePath:
        "src/lib/fiscal-notifications/extractor-core/deferral-denial-extractor.v1.test.ts",
      caseName: "extracts the denial, date, printed deadlines and affected debt without creating actions",
      scope: "SPECIALIZED_FAMILY_EXTRACTOR",
    },
    "collection.offset_requested": {
      evidenceId: "test.existing-adapters.v1.offset-requested",
      evidenceVersion: AEAT_DOCUMENT_TEST_MATRIX_VERSION_V2,
      suitePath:
        "src/lib/fiscal-notifications/extractor-core/existing-extractor-adapters.v1.test.ts",
      caseName: "keeps requested and ex-officio compensation as two exact catalog variants",
      scope: "SPECIALIZED_FAMILY_EXTRACTOR",
    },
    "collection.offset_ex_officio": {
      evidenceId: "test.existing-adapters.v1.offset-ex-officio",
      evidenceVersion: AEAT_DOCUMENT_TEST_MATRIX_VERSION_V2,
      suitePath:
        "src/lib/fiscal-notifications/extractor-core/existing-extractor-adapters.v1.test.ts",
      caseName: "keeps requested and ex-officio compensation as two exact catalog variants",
      scope: "SPECIALIZED_FAMILY_EXTRACTOR",
    },
    "payment.payment_form": {
      evidenceId: "test.payment-order.v1.payment-form",
      evidenceVersion: AEAT_DOCUMENT_TEST_MATRIX_VERSION_V2,
      suitePath:
        "src/lib/fiscal-notifications/extractor-core/payment-order-extractor.v1.test.ts",
      caseName: "extracts an exact payment form with visible facts and an ORDERED event",
      scope: "SPECIALIZED_FAMILY_EXTRACTOR",
    },
    "payment.receipt": {
      evidenceId: "test.payment-evidence.v1.receipt",
      evidenceVersion: AEAT_DOCUMENT_TEST_MATRIX_VERSION_V2,
      suitePath:
        "src/lib/fiscal-notifications/extractor-core/payment-evidence-extractor.v1.test.ts",
      caseName: "extracts a complete receipt and exposes a review-only confirmed payment",
      scope: "SPECIALIZED_FAMILY_EXTRACTOR",
    },
    "payment.failed_or_reversed": {
      evidenceId: "test.payment-evidence.v1.failed-or-reversed",
      evidenceVersion: AEAT_DOCUMENT_TEST_MATRIX_VERSION_V2,
      suitePath:
        "src/lib/fiscal-notifications/extractor-core/payment-evidence-extractor.v1.test.ts",
      caseName: "classifies an explicit rejection and keeps its reason without representing money as paid",
      scope: "SPECIALIZED_FAMILY_EXTRACTOR",
    },
    "seizure.bank_account": {
      evidenceId: "test.seizure.v1.bank-account",
      evidenceVersion: AEAT_DOCUMENT_TEST_MATRIX_VERSION_V2,
      suitePath:
        "src/lib/fiscal-notifications/extractor-core/seizure-extractor.v1.test.ts",
      caseName: "recognizes the exact %s subtype and catalog family",
      scope: "SPECIALIZED_FAMILY_EXTRACTOR",
    },
    "seizure.commercial_credits": {
      evidenceId: "test.seizure.v1.commercial-credits",
      evidenceVersion: AEAT_DOCUMENT_TEST_MATRIX_VERSION_V2,
      suitePath:
        "src/lib/fiscal-notifications/extractor-core/seizure-extractor.v1.test.ts",
      caseName: "recognizes the exact %s subtype and catalog family",
      scope: "SPECIALIZED_FAMILY_EXTRACTOR",
    },
    "seizure.wages_or_pensions": {
      evidenceId: "test.seizure.v1.wages-or-pensions",
      evidenceVersion: AEAT_DOCUMENT_TEST_MATRIX_VERSION_V2,
      suitePath:
        "src/lib/fiscal-notifications/extractor-core/seizure-extractor.v1.test.ts",
      caseName: "recognizes the exact %s subtype and catalog family",
      scope: "SPECIALIZED_FAMILY_EXTRACTOR",
    },
    "seizure.tpv_receipts": {
      evidenceId: "test.seizure.v1.tpv-receipts",
      evidenceVersion: AEAT_DOCUMENT_TEST_MATRIX_VERSION_V2,
      suitePath:
        "src/lib/fiscal-notifications/extractor-core/seizure-extractor.v1.test.ts",
      caseName: "recognizes the exact %s subtype and catalog family",
      scope: "SPECIALIZED_FAMILY_EXTRACTOR",
    },
    "seizure.cash_or_refund": {
      evidenceId: "test.seizure.v1.cash-or-refund",
      evidenceVersion: AEAT_DOCUMENT_TEST_MATRIX_VERSION_V2,
      suitePath:
        "src/lib/fiscal-notifications/extractor-core/seizure-extractor.v1.test.ts",
      caseName: "recognizes the exact %s subtype and catalog family",
      scope: "SPECIALIZED_FAMILY_EXTRACTOR",
    },
    "seizure.real_estate": {
      evidenceId: "test.seizure.v1.real-estate",
      evidenceVersion: AEAT_DOCUMENT_TEST_MATRIX_VERSION_V2,
      suitePath:
        "src/lib/fiscal-notifications/extractor-core/seizure-extractor.v1.test.ts",
      caseName: "recognizes the exact %s subtype and catalog family",
      scope: "SPECIALIZED_FAMILY_EXTRACTOR",
    },
    "seizure.release": {
      evidenceId: "test.seizure.v1.release",
      evidenceVersion: AEAT_DOCUMENT_TEST_MATRIX_VERSION_V2,
      suitePath:
        "src/lib/fiscal-notifications/extractor-core/seizure-extractor.v1.test.ts",
      caseName: "recognizes the exact %s subtype and catalog family",
      scope: "SPECIALIZED_FAMILY_EXTRACTOR",
    },
    "seizure.third_party_response": {
      evidenceId: "test.seizure.v1.third-party-response",
      evidenceVersion: AEAT_DOCUMENT_TEST_MATRIX_VERSION_V2,
      suitePath:
        "src/lib/fiscal-notifications/extractor-core/seizure-extractor.v1.test.ts",
      caseName: "recognizes the exact %s subtype and catalog family",
      scope: "SPECIALIZED_FAMILY_EXTRACTOR",
    },
    "seizure.third_party_payment": {
      evidenceId: "test.seizure.v1.third-party-payment",
      evidenceVersion: AEAT_DOCUMENT_TEST_MATRIX_VERSION_V2,
      suitePath:
        "src/lib/fiscal-notifications/extractor-core/seizure-extractor.v1.test.ts",
      caseName: "recognizes the exact %s subtype and catalog family",
      scope: "SPECIALIZED_FAMILY_EXTRACTOR",
    },
  } as const satisfies Partial<
    Record<FiscalNotificationDocumentFamilyIdV3, ExecutableTestEvidenceV2>
  >);

const PROFILE_DRIVEN_EXTRACTOR_SUITE_PATH_V2 =
  "src/lib/fiscal-notifications/extractor-core/profile-driven-extractor.v2.test.ts" as const;
const PROFILE_DRIVEN_INDEPENDENT_CORPUS_SUITE_PATH_V2 =
  "src/lib/fiscal-notifications/extractor-core/profile-driven-extractor.v2.independent-corpus.test.ts" as const;

const PROFILE_DRIVEN_POSITIVE_EVIDENCE_V2 = {
  evidenceId: "test.profile-driven-extractor.v2.matrix.87-positive",
  evidenceVersion: AEAT_DOCUMENT_TEST_MATRIX_VERSION_V2,
  suitePath: PROFILE_DRIVEN_INDEPENDENT_CORPUS_SUITE_PATH_V2,
  caseName:
    "recognizes the 87 profile titles copied from the external knowledge pack",
  scope: "EVERY_PROFILE_DRIVEN_EXTRACTOR",
} as const satisfies ExecutableTestEvidenceV2;

const PROFILE_DRIVEN_NEGATIVE_EVIDENCE_V2 = {
  evidenceId: "test.profile-driven-extractor.v2.matrix.87-near-miss",
  evidenceVersion: AEAT_DOCUMENT_TEST_MATRIX_VERSION_V2,
  suitePath: PROFILE_DRIVEN_INDEPENDENT_CORPUS_SUITE_PATH_V2,
  caseName:
    "does not accept prefixed draft headings as exact family titles",
  scope: "EVERY_PROFILE_DRIVEN_EXTRACTOR",
} as const satisfies ExecutableTestEvidenceV2;

const PROFILE_DRIVEN_AMBIGUOUS_EVIDENCE_V2 = {
  evidenceId: "test.profile-driven-extractor.v2.matrix.ambiguous",
  evidenceVersion: AEAT_DOCUMENT_TEST_MATRIX_VERSION_V2,
  suitePath: PROFILE_DRIVEN_EXTRACTOR_SUITE_PATH_V2,
  caseName: "keeps conflicting or multiple family matches ambiguous and empty",
  scope: "EVERY_PROFILE_DRIVEN_EXTRACTOR",
} as const satisfies ExecutableTestEvidenceV2;

const PROFILE_DRIVEN_INCOMPLETE_EVIDENCE_V2 = {
  evidenceId: "test.profile-driven-extractor.v2.matrix.incomplete",
  evidenceVersion: AEAT_DOCUMENT_TEST_MATRIX_VERSION_V2,
  suitePath: PROFILE_DRIVEN_EXTRACTOR_SUITE_PATH_V2,
  caseName: "keeps incomplete inputs unknown and empty",
  scope: "EVERY_PROFILE_DRIVEN_EXTRACTOR",
} as const satisfies ExecutableTestEvidenceV2;

export const AEAT_DOCUMENT_SPECIALIZED_EXTRACTOR_TEST_EVIDENCE_V2 =
  deepFreeze(
    Object.fromEntries(
      FISCAL_NOTIFICATION_FAMILY_RULES_V2.map((rule) => [
        rule.familyId,
        PROFILE_DRIVEN_POSITIVE_EVIDENCE_V2,
      ]),
    ),
  ) as Readonly<
    Record<FiscalNotificationDocumentFamilyIdV3, ExecutableTestEvidenceV2>
  >;

export const AEAT_DOCUMENT_EXECUTABLE_TEST_EVIDENCE_V2 = deepFreeze([
  PROFILE_ADAPTER_POSITIVE_EVIDENCE_V2,
  PROFILE_ADAPTER_NEGATIVE_EVIDENCE_V2,
  PROFILE_ADAPTER_AMBIGUOUS_EVIDENCE_V2,
  PROFILE_ADAPTER_INCOMPLETE_EVIDENCE_V2,
  ALL_EXPLANATIONS_EVIDENCE_V2,
  PROFILE_DRIVEN_POSITIVE_EVIDENCE_V2,
  PROFILE_DRIVEN_NEGATIVE_EVIDENCE_V2,
  PROFILE_DRIVEN_AMBIGUOUS_EVIDENCE_V2,
  PROFILE_DRIVEN_INCOMPLETE_EVIDENCE_V2,
  ...Object.values(LEGACY_SPECIALIZED_EXTRACTOR_TEST_EVIDENCE_V2),
]) satisfies readonly ExecutableTestEvidenceV2[];

export interface FamilyCompletionManifestV2 {
  readonly familyId: FiscalNotificationDocumentFamilyIdV3;
  readonly recognition: {
    readonly claimedStatus: RecognitionStatusV2;
    readonly registryEvidenceId: string;
    readonly registryVersion: string;
  };
  readonly extraction: {
    readonly status: ExtractionStatusV2;
    readonly implementationId: string | null;
    readonly implementationVersion: string | null;
  };
  readonly explanation: {
    readonly status: ExplanationStatusV2;
    readonly implementationId: string | null;
    readonly implementationVersion: string | null;
  };
  readonly sources: {
    readonly registryId: string;
    readonly registryVersion: string;
    readonly sourceIds: readonly AeatDocumentOfficialSourceIdV1[];
  };
  readonly relations: {
    readonly registryId: string;
    readonly registryVersion: string;
    readonly policy: "DECLARED_RELATIONS" | "NO_AUTOMATIC_RELATION";
    readonly relationTypeIds: readonly AeatDocumentRelationTypeIdV1[];
  };
  readonly testCoverage: {
    readonly matrixId: string;
    readonly matrixVersion: string;
    readonly positiveTestIds: readonly string[];
    readonly negativeTestIds: readonly string[];
    readonly ambiguousTestIds: readonly string[];
    readonly incompleteTestIds: readonly string[];
  };
}

export interface AeatDocumentCompletionManifestV2 {
  readonly schemaVersion: 2;
  readonly manifestId: string;
  readonly manifestVersion: string;
  readonly knowledgeReleaseId: typeof AEAT_DOCUMENT_KNOWLEDGE_RELEASE_ID_V1;
  readonly knowledgeSchemaVersion: typeof AEAT_DOCUMENT_KNOWLEDGE_SCHEMA_VERSION_V1;
  readonly expectedCounts: {
    readonly profiles: 87;
    readonly officialSources: 50;
    readonly relationTypes: 48;
    readonly documentChains: 15;
  };
  readonly profiles: readonly FamilyCompletionManifestV2[];
}

export interface FamilyCompletionResultV2 {
  readonly familyId: FiscalNotificationDocumentFamilyIdV3;
  readonly recognitionStatus: RecognitionStatusV2;
  readonly extractionStatus: ExtractionStatusV2;
  readonly explanationStatus: ExplanationStatusV2;
  readonly sourcesStatus: SourcesStatusV2;
  readonly relationsStatus: RelationsStatusV2;
  readonly testCoverage: {
    readonly positive: TestCaseCoverageStatusV2;
    readonly negative: TestCaseCoverageStatusV2;
    readonly ambiguous: TestCaseCoverageStatusV2;
    readonly incomplete: TestCaseCoverageStatusV2;
  };
  readonly guideStatus: "EXPLAINED" | "PREPARATION";
  readonly manifestEvidence: {
    readonly recognitionRegistryId: string;
    readonly extractionImplementationId: string | null;
    readonly explanationImplementationId: string | null;
    readonly sourceRegistryId: string;
    readonly relationRegistryId: string;
    readonly testMatrixId: string;
  };
}

export type CompletionGateIssueCodeV2 =
  | "INVALID_MANIFEST"
  | "INVALID_REGISTRY_COUNTS"
  | "DUPLICATE_FAMILY"
  | "UNKNOWN_FAMILY"
  | "MISSING_FAMILY"
  | "RECOGNITION_CLAIM_NOT_SUPPORTED"
  | "RECOGNITION_REGISTRY_INVALID"
  | "EXTRACTION_MISSING"
  | "EXPLANATION_GENERIC_OR_MISSING"
  | "SOURCES_MISSING_OR_INVALID"
  | "RELATIONS_MISSING_OR_INVALID"
  | "TEST_CASE_MISSING";

export interface AeatDocumentCompletionGateResultV2 {
  readonly schemaVersion: 2;
  readonly gateId: typeof AEAT_DOCUMENT_COMPLETION_GATE_ID_V2;
  readonly gateVersion: typeof AEAT_DOCUMENT_COMPLETION_GATE_SCHEMA_VERSION_V2;
  readonly knowledgeReleaseId: typeof AEAT_DOCUMENT_KNOWLEDGE_RELEASE_ID_V1;
  readonly status: "GUIDES_EXPLAINED" | "INCOMPLETE";
  readonly recognitionComplete: boolean;
  readonly guidesComplete: boolean;
  readonly implementationCounts: {
    readonly automaticRecognition: number;
    readonly manualExactSelection: number;
  };
  readonly counts: {
    readonly profiles: number;
    readonly officialSources: number;
    readonly relationTypes: number;
    readonly documentChains: number;
  };
  readonly profiles: readonly FamilyCompletionResultV2[];
  readonly issues: readonly {
    readonly code: CompletionGateIssueCodeV2;
    readonly path: string;
  }[];
}

type UnknownRecord = Record<string, unknown>;
const CONTROL_CHARACTERS = /[\u0000-\u001f\u007f-\u009f]/u;
const TECHNICAL_ID = /^[A-Za-z0-9][A-Za-z0-9_.:\-/]{0,159}$/u;
const VERSION = /^[0-9]+(?:\.[0-9]+){1,3}(?:-[A-Za-z0-9.-]+)?$/u;
const INVALID = Symbol("invalid-completion-manifest-v2");

function fail(): never {
  throw INVALID;
}

function exactRecord(value: unknown, keys: readonly string[]): UnknownRecord {
  if (!value || typeof value !== "object" || Array.isArray(value)) fail();
  const prototype = Object.getPrototypeOf(value);
  if (prototype !== Object.prototype && prototype !== null) fail();
  if (Object.getOwnPropertySymbols(value).length > 0) fail();
  const descriptors = Object.getOwnPropertyDescriptors(value);
  if (
    Object.keys(descriptors).some((key) => !keys.includes(key)) ||
    Object.values(descriptors).some(
      (descriptor) => !("value" in descriptor) || !descriptor.enumerable,
    )
  ) {
    fail();
  }
  return Object.fromEntries(
    Object.entries(descriptors).map(([key, descriptor]) => [
      key,
      "value" in descriptor ? descriptor.value : undefined,
    ]),
  );
}

function required(source: UnknownRecord, key: string): unknown {
  if (!Object.prototype.hasOwnProperty.call(source, key)) fail();
  return source[key];
}

function exactString(value: unknown, pattern = TECHNICAL_ID): string {
  if (
    typeof value !== "string" ||
    value.length === 0 ||
    value.length > 160 ||
    value.trim() !== value ||
    CONTROL_CHARACTERS.test(value) ||
    !pattern.test(value)
  ) {
    fail();
  }
  return value;
}

function enumValue<T extends string>(value: unknown, values: readonly T[]): T {
  if (typeof value !== "string" || !values.includes(value as T)) fail();
  return value as T;
}

function nullableTechnical(value: unknown): string | null {
  return value === null ? null : exactString(value);
}

function nullableVersion(value: unknown): string | null {
  if (value === null) return null;
  const parsed = exactString(value);
  if (
    !/\d/u.test(parsed) ||
    /^(?:latest|current|unknown|pending)$/iu.test(parsed)
  ) {
    fail();
  }
  return parsed;
}

function snapshotArray(value: unknown, max: number): unknown[] {
  if (
    !Array.isArray(value) ||
    Object.getPrototypeOf(value) !== Array.prototype
  ) {
    fail();
  }
  const lengthDescriptor = Object.getOwnPropertyDescriptor(value, "length");
  const length = lengthDescriptor?.value;
  if (!Number.isSafeInteger(length) || length < 0 || length > max) fail();
  const result: unknown[] = [];
  for (let index = 0; index < length; index += 1) {
    const descriptor = Object.getOwnPropertyDescriptor(value, String(index));
    if (
      !descriptor ||
      !("value" in descriptor) ||
      descriptor.enumerable !== true
    ) {
      fail();
    }
    result.push(descriptor.value);
  }
  if (Reflect.ownKeys(value).length !== length + 1) fail();
  return result;
}

function stringArray<T extends string>(
  value: unknown,
  allowed?: readonly T[],
  max = 128,
): T[] {
  const result = snapshotArray(value, max).map(
    (entry) => exactString(entry) as T,
  );
  if (new Set(result).size !== result.length) fail();
  if (allowed && result.some((entry) => !allowed.includes(entry))) fail();
  return result;
}

function parseFamilyManifest(value: unknown): FamilyCompletionManifestV2 {
  const source = exactRecord(value, [
    "familyId",
    "recognition",
    "extraction",
    "explanation",
    "sources",
    "relations",
    "testCoverage",
  ]);
  const recognition = exactRecord(required(source, "recognition"), [
    "claimedStatus",
    "registryEvidenceId",
    "registryVersion",
  ]);
  const extraction = exactRecord(required(source, "extraction"), [
    "status",
    "implementationId",
    "implementationVersion",
  ]);
  const explanation = exactRecord(required(source, "explanation"), [
    "status",
    "implementationId",
    "implementationVersion",
  ]);
  const sources = exactRecord(required(source, "sources"), [
    "registryId",
    "registryVersion",
    "sourceIds",
  ]);
  const relations = exactRecord(required(source, "relations"), [
    "registryId",
    "registryVersion",
    "policy",
    "relationTypeIds",
  ]);
  const tests = exactRecord(required(source, "testCoverage"), [
    "matrixId",
    "matrixVersion",
    "positiveTestIds",
    "negativeTestIds",
    "ambiguousTestIds",
    "incompleteTestIds",
  ]);
  const extractionStatus = enumValue(required(extraction, "status"), [
    "EXTRACTOR_IMPLEMENTED_REVIEW_ONLY",
    "MANUAL_EXACT_SELECTION_ADAPTER_REVIEW_ONLY",
    "MISSING",
  ] as const);
  const explanationStatus = enumValue(required(explanation, "status"), [
    "FAMILY_EXPLANATION_IMPLEMENTED",
    "GENERIC_FALLBACK",
    "MISSING",
  ] as const);
  const extractionId = nullableTechnical(
    required(extraction, "implementationId"),
  );
  const extractionVersion = nullableVersion(
    required(extraction, "implementationVersion"),
  );
  const explanationId = nullableTechnical(
    required(explanation, "implementationId"),
  );
  const explanationVersion = nullableVersion(
    required(explanation, "implementationVersion"),
  );
  if (
    (extractionStatus === "MISSING") !==
      (extractionId === null && extractionVersion === null) ||
    (explanationStatus === "MISSING") !==
      (explanationId === null && explanationVersion === null)
  ) {
    fail();
  }
  return {
    familyId: exactString(
      required(source, "familyId"),
    ) as FiscalNotificationDocumentFamilyIdV3,
    recognition: {
      claimedStatus: enumValue(required(recognition, "claimedStatus"), [
        "SPECIALIZED_RECOGNITION_IMPLEMENTED_REVIEW_ONLY",
        "MANUAL_EXACT_SELECTION_ONLY",
      ] as const),
      registryEvidenceId: exactString(
        required(recognition, "registryEvidenceId"),
      ),
      registryVersion: exactString(
        required(recognition, "registryVersion"),
        VERSION,
      ),
    },
    extraction: {
      status: extractionStatus,
      implementationId: extractionId,
      implementationVersion: extractionVersion,
    },
    explanation: {
      status: explanationStatus,
      implementationId: explanationId,
      implementationVersion: explanationVersion,
    },
    sources: {
      registryId: exactString(required(sources, "registryId")),
      registryVersion: exactString(
        required(sources, "registryVersion"),
        VERSION,
      ),
      sourceIds: stringArray(
        required(sources, "sourceIds"),
        AEAT_DOCUMENT_OFFICIAL_SOURCE_IDS_V1,
      ),
    },
    relations: {
      registryId: exactString(required(relations, "registryId")),
      registryVersion: exactString(
        required(relations, "registryVersion"),
        VERSION,
      ),
      policy: enumValue(required(relations, "policy"), [
        "DECLARED_RELATIONS",
        "NO_AUTOMATIC_RELATION",
      ] as const),
      relationTypeIds: stringArray(
        required(relations, "relationTypeIds"),
        AEAT_DOCUMENT_RELATION_TYPE_IDS_V1,
      ),
    },
    testCoverage: {
      matrixId: exactString(required(tests, "matrixId")),
      matrixVersion: exactString(required(tests, "matrixVersion"), VERSION),
      positiveTestIds: stringArray(required(tests, "positiveTestIds")),
      negativeTestIds: stringArray(required(tests, "negativeTestIds")),
      ambiguousTestIds: stringArray(required(tests, "ambiguousTestIds")),
      incompleteTestIds: stringArray(required(tests, "incompleteTestIds")),
    },
  };
}

function parseManifest(value: unknown): AeatDocumentCompletionManifestV2 {
  const source = exactRecord(value, [
    "schemaVersion",
    "manifestId",
    "manifestVersion",
    "knowledgeReleaseId",
    "knowledgeSchemaVersion",
    "expectedCounts",
    "profiles",
  ]);
  const counts = exactRecord(required(source, "expectedCounts"), [
    "profiles",
    "officialSources",
    "relationTypes",
    "documentChains",
  ]);
  if (
    required(source, "schemaVersion") !== 2 ||
    required(source, "knowledgeReleaseId") !==
      AEAT_DOCUMENT_KNOWLEDGE_RELEASE_ID_V1 ||
    required(source, "knowledgeSchemaVersion") !==
      AEAT_DOCUMENT_KNOWLEDGE_SCHEMA_VERSION_V1 ||
    required(counts, "profiles") !== 87 ||
    required(counts, "officialSources") !== 50 ||
    required(counts, "relationTypes") !== 48 ||
    required(counts, "documentChains") !== 15
  ) {
    fail();
  }
  const rawProfiles = snapshotArray(required(source, "profiles"), 87);
  return {
    schemaVersion: 2,
    manifestId: exactString(required(source, "manifestId")),
    manifestVersion: exactString(required(source, "manifestVersion"), VERSION),
    knowledgeReleaseId: AEAT_DOCUMENT_KNOWLEDGE_RELEASE_ID_V1,
    knowledgeSchemaVersion: AEAT_DOCUMENT_KNOWLEDGE_SCHEMA_VERSION_V1,
    expectedCounts: {
      profiles: 87,
      officialSources: 50,
      relationTypes: 48,
      documentChains: 15,
    },
    profiles: rawProfiles.map(parseFamilyManifest),
  };
}

function sameSet<T>(left: readonly T[], right: readonly T[]): boolean {
  return (
    left.length === right.length && left.every((entry) => right.includes(entry))
  );
}

function expectedRelations(
  chainRole: readonly string[],
): AeatDocumentRelationTypeIdV1[] {
  return chainRole
    .filter((role) => role.startsWith("RELATION:"))
    .map(
      (role) => role.slice("RELATION:".length) as AeatDocumentRelationTypeIdV1,
    );
}

function specializedEvidenceForFamily(
  familyId: FiscalNotificationDocumentFamilyIdV3,
): ExecutableTestEvidenceV2 | null {
  return (
    (
      AEAT_DOCUMENT_SPECIALIZED_EXTRACTOR_TEST_EVIDENCE_V2 as Partial<
        Record<FiscalNotificationDocumentFamilyIdV3, ExecutableTestEvidenceV2>
      >
    )[familyId] ?? null
  );
}

function expectedTestEvidenceIds(
  familyId: FiscalNotificationDocumentFamilyIdV3,
  kind: "positive" | "negative" | "ambiguous" | "incomplete",
): string[] {
  switch (kind) {
    case "positive": {
      const specialized = specializedEvidenceForFamily(familyId);
      return [
        PROFILE_ADAPTER_POSITIVE_EVIDENCE_V2.evidenceId,
        PROFILE_DRIVEN_POSITIVE_EVIDENCE_V2.evidenceId,
        ALL_EXPLANATIONS_EVIDENCE_V2.evidenceId,
        ...(specialized &&
        specialized.evidenceId !== PROFILE_DRIVEN_POSITIVE_EVIDENCE_V2.evidenceId
          ? [specialized.evidenceId]
          : []),
      ];
    }
    case "negative":
      return [
        PROFILE_ADAPTER_NEGATIVE_EVIDENCE_V2.evidenceId,
        PROFILE_DRIVEN_NEGATIVE_EVIDENCE_V2.evidenceId,
      ];
    case "ambiguous":
      return [
        PROFILE_ADAPTER_AMBIGUOUS_EVIDENCE_V2.evidenceId,
        PROFILE_DRIVEN_AMBIGUOUS_EVIDENCE_V2.evidenceId,
      ];
    case "incomplete":
      return [
        PROFILE_ADAPTER_INCOMPLETE_EVIDENCE_V2.evidenceId,
        PROFILE_DRIVEN_INCOMPLETE_EVIDENCE_V2.evidenceId,
      ];
  }
}

function deepFreeze<T>(value: T): T {
  if (value && typeof value === "object" && !Object.isFrozen(value)) {
    for (const child of Object.values(value as Record<string, unknown>)) {
      deepFreeze(child);
    }
    Object.freeze(value);
  }
  return value;
}

function invalidResult(): Readonly<AeatDocumentCompletionGateResultV2> {
  return deepFreeze({
    schemaVersion: 2,
    gateId: AEAT_DOCUMENT_COMPLETION_GATE_ID_V2,
    gateVersion: AEAT_DOCUMENT_COMPLETION_GATE_SCHEMA_VERSION_V2,
    knowledgeReleaseId: AEAT_DOCUMENT_KNOWLEDGE_RELEASE_ID_V1,
    status: "INCOMPLETE",
    recognitionComplete: false,
    guidesComplete: false,
    implementationCounts: {
      automaticRecognition: Object.keys(
        AEAT_DOCUMENT_SPECIALIZED_EXTRACTOR_TEST_EVIDENCE_V2,
      ).length,
      manualExactSelection:
        AEAT_DOCUMENT_PROFILES_V1.length -
        Object.keys(AEAT_DOCUMENT_SPECIALIZED_EXTRACTOR_TEST_EVIDENCE_V2)
          .length,
    },
    counts: {
      profiles: AEAT_DOCUMENT_PROFILES_V1.length,
      officialSources: AEAT_DOCUMENT_OFFICIAL_SOURCE_IDS_V1.length,
      relationTypes: AEAT_DOCUMENT_RELATION_TYPE_IDS_V1.length,
      documentChains: AEAT_DOCUMENT_CHAINS_V1.length,
    },
    profiles: [],
    issues: [{ code: "INVALID_MANIFEST", path: "manifest" }],
  });
}

/**
 * Evaluates explicit implementation evidence. Plain-language presence alone
 * never marks a family complete, and an adapter never upgrades recognition.
 */
export function evaluateAeatDocumentCompletionGateV2(
  value: unknown,
): Readonly<AeatDocumentCompletionGateResultV2> {
  let manifest: AeatDocumentCompletionManifestV2;
  try {
    manifest = parseManifest(value);
  } catch {
    return invalidResult();
  }

  const counts = {
    profiles: AEAT_DOCUMENT_PROFILES_V1.length,
    officialSources: AEAT_DOCUMENT_OFFICIAL_SOURCE_IDS_V1.length,
    relationTypes: AEAT_DOCUMENT_RELATION_TYPE_IDS_V1.length,
    documentChains: AEAT_DOCUMENT_CHAINS_V1.length,
  };
  const issues: Array<{
    code: CompletionGateIssueCodeV2;
    path: string;
  }> = [];
  if (
    counts.profiles !== 87 ||
    counts.officialSources !== 50 ||
    counts.relationTypes !== 48 ||
    counts.documentChains !== 15
  ) {
    issues.push({ code: "INVALID_REGISTRY_COUNTS", path: "registry.counts" });
  }
  const manifestByFamily = new Map<
    FiscalNotificationDocumentFamilyIdV3,
    FamilyCompletionManifestV2
  >();
  for (const [index, entry] of manifest.profiles.entries()) {
    if (!AEAT_DOCUMENT_PROFILE_IDS_V1.includes(entry.familyId)) {
      issues.push({
        code: "UNKNOWN_FAMILY",
        path: `manifest.profiles[${index}].familyId`,
      });
      continue;
    }
    if (manifestByFamily.has(entry.familyId)) {
      issues.push({
        code: "DUPLICATE_FAMILY",
        path: `manifest.profiles[${index}].familyId`,
      });
      continue;
    }
    manifestByFamily.set(entry.familyId, entry);
  }

  const profiles: FamilyCompletionResultV2[] = [];
  for (const [index, registryProfile] of AEAT_DOCUMENT_PROFILES_V1.entries()) {
    const entry = manifestByFamily.get(registryProfile.id);
    if (!entry) {
      issues.push({
        code: "MISSING_FAMILY",
        path: `registry.profiles[${index}]`,
      });
      continue;
    }
    const binding = resolveFamilyExtractorBindingV1(registryProfile.id);
    const familyRule = resolveFamilyRuleV2(registryProfile.id);
    const specializedEvidence = specializedEvidenceForFamily(
      registryProfile.id,
    );
    const independentlyProvenSpecializedRecognition =
      binding?.implementationStatus ===
        "EXTRACTOR_IMPLEMENTED_REVIEW_ONLY" &&
      familyRule?.ruleVersion === FAMILY_RULE_CONTRACT_VERSION_V2 &&
      familyRule.canonicalTitle === registryProfile.nameEs &&
      sameSet(familyRule.sourceIds, registryProfile.officialSourceIds) &&
      familyRule.permitsAutomaticFamilyConfirmation === false &&
      specializedEvidence !== null;
    const recognitionStatus: RecognitionStatusV2 =
      independentlyProvenSpecializedRecognition
        ? "SPECIALIZED_RECOGNITION_IMPLEMENTED_REVIEW_ONLY"
        : "MANUAL_EXACT_SELECTION_ONLY";
    if (entry.recognition.claimedStatus !== recognitionStatus) {
      issues.push({
        code: "RECOGNITION_CLAIM_NOT_SUPPORTED",
        path: `manifest.profiles[${index}].recognition`,
      });
    }
    if (
      binding === null ||
      entry.recognition.registryEvidenceId !==
        specializedEvidence?.evidenceId ||
      entry.recognition.registryVersion !==
        specializedEvidence?.evidenceVersion
    ) {
      issues.push({
        code: "RECOGNITION_REGISTRY_INVALID",
        path: `manifest.profiles[${index}].recognition`,
      });
    }

    const adapter = resolveProfileFieldAdapterV2(registryProfile.id);
    const expectedAdapterId = `profile-field-adapter:${registryProfile.id}`;
    const adapterIsConcrete =
      adapter !== null &&
      PROFILE_FIELD_ADAPTERS_V2.length === 87 &&
      adapter.adapterVersion === PROFILE_FIELD_ADAPTER_VERSION_V2 &&
      adapter.recognitionPolicy === "PRESELECTED_FAMILY_ONLY" &&
      adapter.reviewPolicy === "ALWAYS_REVIEW_REQUIRED" &&
      adapter.materializationPolicy === "PROHIBITED" &&
      sameSet(
        adapter.fieldContract.references,
        registryProfile.mustExtract.references,
      ) &&
      sameSet(adapter.fieldContract.dates, registryProfile.mustExtract.dates) &&
      sameSet(adapter.fieldContract.money, registryProfile.mustExtract.money) &&
      sameSet(adapter.fieldContract.facts, registryProfile.mustExtract.facts) &&
      sameSet(
        adapter.fieldContract.participantRoles,
        registryProfile.mustExtract.participantRoles,
      ) &&
      entry.extraction.status ===
        "MANUAL_EXACT_SELECTION_ADAPTER_REVIEW_ONLY" &&
      entry.extraction.implementationId === expectedAdapterId &&
      entry.extraction.implementationVersion ===
        PROFILE_FIELD_ADAPTER_VERSION_V2;
    const extractorIsConcrete =
      binding !== null &&
      familyRule !== null &&
      specializedEvidence !== null &&
      FISCAL_NOTIFICATION_FAMILY_EXTRACTOR_BINDINGS_V1.length === 87 &&
      FISCAL_NOTIFICATION_FAMILY_RULES_V2.length === 87 &&
      binding.implementationStatus === "EXTRACTOR_IMPLEMENTED_REVIEW_ONLY" &&
      familyRule.familyId === registryProfile.id &&
      familyRule.extractorId === binding.extractorId &&
      familyRule.canonicalTitle === registryProfile.nameEs &&
      sameSet(familyRule.sourceIds, registryProfile.officialSourceIds) &&
      familyRule.classificationPolicy === "REVIEW_REQUIRED_ONLY" &&
      familyRule.permitsAutomaticFamilyConfirmation === false &&
      entry.extraction.status === "EXTRACTOR_IMPLEMENTED_REVIEW_ONLY" &&
      entry.extraction.implementationId ===
        PROFILE_DRIVEN_EXTRACTOR_IMPLEMENTATION_ID_V2 &&
      entry.extraction.implementationVersion ===
        PROFILE_DRIVEN_EXTRACTOR_VERSION_V2;
    const extractionStatus: ExtractionStatusV2 = extractorIsConcrete
      ? "EXTRACTOR_IMPLEMENTED_REVIEW_ONLY"
      : binding?.implementationStatus !== "EXTRACTOR_IMPLEMENTED_REVIEW_ONLY" &&
          adapterIsConcrete
        ? "MANUAL_EXACT_SELECTION_ADAPTER_REVIEW_ONLY"
        : "MISSING";
    if (extractionStatus === "MISSING") {
      issues.push({
        code: "EXTRACTION_MISSING",
        path: `manifest.profiles[${index}].extraction`,
      });
    }
    let concreteExplanation = false;
    try {
      const explanation = explainFiscalNotificationDocumentV2({
        familyId: registryProfile.id,
      });
      concreteExplanation =
        explanation.familyId === registryProfile.id &&
        explanation.fallbackUsed === false &&
        explanation.engineVersion ===
          FISCAL_NOTIFICATION_DOCUMENT_EXPLANATION_ENGINE_VERSION_V2 &&
        entry.explanation.status === "FAMILY_EXPLANATION_IMPLEMENTED" &&
        entry.explanation.implementationId === explanation.specializationId &&
        entry.explanation.implementationVersion ===
          FISCAL_NOTIFICATION_DOCUMENT_EXPLANATION_ENGINE_VERSION_V2 &&
        sameSet(
          explanation.sections.map((section) => section.id),
          FISCAL_NOTIFICATION_EXPLANATION_SECTION_IDS_V2,
        ) &&
        sameSet(
          explanation.officialSources.map((source) => source.id),
          registryProfile.officialSourceIds,
        ) &&
        explanation.networkPolicy === "NO_NETWORK" &&
        explanation.requiresHumanReview === true &&
        explanation.materializationPolicy === "PROHIBITED_UNTIL_REVIEW";
    } catch {
      concreteExplanation = false;
    }
    const explanationStatus: ExplanationStatusV2 = concreteExplanation
      ? "FAMILY_EXPLANATION_IMPLEMENTED"
      : entry.explanation.status === "GENERIC_FALLBACK"
        ? "GENERIC_FALLBACK"
        : "MISSING";
    if (explanationStatus !== "FAMILY_EXPLANATION_IMPLEMENTED") {
      issues.push({
        code: "EXPLANATION_GENERIC_OR_MISSING",
        path: `manifest.profiles[${index}].explanation`,
      });
    }

    const sourcesStatus: SourcesStatusV2 =
      registryProfile.officialSourceIds.length === 0
        ? "MISSING"
        : entry.sources.registryId === AEAT_DOCUMENT_KNOWLEDGE_RELEASE_ID_V1 &&
            entry.sources.registryVersion ===
              AEAT_DOCUMENT_KNOWLEDGE_SCHEMA_VERSION_V1 &&
            sameSet(entry.sources.sourceIds, registryProfile.officialSourceIds)
          ? "OFFICIAL_SOURCES_COMPLETE"
          : "INVALID";
    if (sourcesStatus !== "OFFICIAL_SOURCES_COMPLETE") {
      issues.push({
        code: "SOURCES_MISSING_OR_INVALID",
        path: `manifest.profiles[${index}].sources`,
      });
    }

    const relationIds = expectedRelations(registryProfile.chainRole);
    let relationsStatus: RelationsStatusV2;
    const relationRegistryMatches =
      entry.relations.registryId === AEAT_DOCUMENT_KNOWLEDGE_RELEASE_ID_V1 &&
      entry.relations.registryVersion ===
        AEAT_DOCUMENT_KNOWLEDGE_SCHEMA_VERSION_V1;
    if (registryProfile.relationPolicy === "NO_AUTOMATIC_RELATION") {
      relationsStatus =
        relationRegistryMatches &&
        entry.relations.policy === "NO_AUTOMATIC_RELATION" &&
        entry.relations.relationTypeIds.length === 0
          ? "NO_AUTOMATIC_RELATION"
          : "INVALID";
    } else if (entry.relations.relationTypeIds.length === 0) {
      relationsStatus = "MISSING";
    } else {
      relationsStatus =
        relationRegistryMatches &&
        entry.relations.policy === "DECLARED_RELATIONS" &&
        sameSet(entry.relations.relationTypeIds, relationIds)
          ? "RELATIONS_DECLARED"
          : "INVALID";
    }
    if (
      relationsStatus !== "RELATIONS_DECLARED" &&
      relationsStatus !== "NO_AUTOMATIC_RELATION"
    ) {
      issues.push({
        code: "RELATIONS_MISSING_OR_INVALID",
        path: `manifest.profiles[${index}].relations`,
      });
    }

    const testMatrixMatches =
      entry.testCoverage.matrixId ===
        AEAT_DOCUMENT_EXECUTABLE_TEST_REGISTRY_ID_V2 &&
      entry.testCoverage.matrixVersion === AEAT_DOCUMENT_TEST_MATRIX_VERSION_V2;
    const testCoverage = {
      positive:
        testMatrixMatches &&
        sameSet(
          entry.testCoverage.positiveTestIds,
          expectedTestEvidenceIds(registryProfile.id, "positive"),
        )
          ? ("COVERED" as const)
          : ("MISSING" as const),
      negative:
        testMatrixMatches &&
        sameSet(
          entry.testCoverage.negativeTestIds,
          expectedTestEvidenceIds(registryProfile.id, "negative"),
        )
          ? ("COVERED" as const)
          : ("MISSING" as const),
      ambiguous:
        testMatrixMatches &&
        sameSet(
          entry.testCoverage.ambiguousTestIds,
          expectedTestEvidenceIds(registryProfile.id, "ambiguous"),
        )
          ? ("COVERED" as const)
          : ("MISSING" as const),
      incomplete:
        testMatrixMatches &&
        sameSet(
          entry.testCoverage.incompleteTestIds,
          expectedTestEvidenceIds(registryProfile.id, "incomplete"),
        )
          ? ("COVERED" as const)
          : ("MISSING" as const),
    } as const;
    if (Object.values(testCoverage).some((status) => status === "MISSING")) {
      issues.push({
        code: "TEST_CASE_MISSING",
        path: `manifest.profiles[${index}].testCoverage`,
      });
    }
    const guideStatus =
      extractionStatus !== "MISSING" &&
      explanationStatus === "FAMILY_EXPLANATION_IMPLEMENTED" &&
      sourcesStatus === "OFFICIAL_SOURCES_COMPLETE" &&
      (relationsStatus === "RELATIONS_DECLARED" ||
        relationsStatus === "NO_AUTOMATIC_RELATION") &&
      Object.values(testCoverage).every((status) => status === "COVERED")
        ? ("EXPLAINED" as const)
        : ("PREPARATION" as const);

    profiles.push({
      familyId: registryProfile.id,
      recognitionStatus,
      extractionStatus,
      explanationStatus,
      sourcesStatus,
      relationsStatus,
      testCoverage,
      guideStatus,
      manifestEvidence: {
        recognitionRegistryId: entry.recognition.registryEvidenceId,
        extractionImplementationId: entry.extraction.implementationId,
        explanationImplementationId: entry.explanation.implementationId,
        sourceRegistryId: entry.sources.registryId,
        relationRegistryId: entry.relations.registryId,
        testMatrixId: entry.testCoverage.matrixId,
      },
    });
  }

  const guidesComplete =
    profiles.length === 87 &&
    profiles.every((profile) => profile.guideStatus === "EXPLAINED") &&
    issues.length === 0;
  const recognitionComplete =
    profiles.length === 87 &&
    profiles.every(
      (profile) =>
        profile.recognitionStatus ===
        "SPECIALIZED_RECOGNITION_IMPLEMENTED_REVIEW_ONLY",
    );
  const implementationCounts = {
    automaticRecognition: profiles.filter(
      (profile) =>
        profile.recognitionStatus ===
        "SPECIALIZED_RECOGNITION_IMPLEMENTED_REVIEW_ONLY",
    ).length,
    manualExactSelection: profiles.filter(
      (profile) =>
        profile.recognitionStatus === "MANUAL_EXACT_SELECTION_ONLY",
    ).length,
  };
  return deepFreeze({
    schemaVersion: 2,
    gateId: AEAT_DOCUMENT_COMPLETION_GATE_ID_V2,
    gateVersion: AEAT_DOCUMENT_COMPLETION_GATE_SCHEMA_VERSION_V2,
    knowledgeReleaseId: AEAT_DOCUMENT_KNOWLEDGE_RELEASE_ID_V1,
    status:
      guidesComplete && recognitionComplete
        ? "GUIDES_EXPLAINED"
        : "INCOMPLETE",
    recognitionComplete,
    guidesComplete,
    implementationCounts,
    counts,
    profiles,
    issues,
  });
}

function buildCompletionManifestV2(): AeatDocumentCompletionManifestV2 {
  return {
    schemaVersion: 2,
    manifestId: "aeat-document-intelligence.87-families.v2",
    manifestVersion: AEAT_DOCUMENT_COMPLETION_GATE_SCHEMA_VERSION_V2,
    knowledgeReleaseId: AEAT_DOCUMENT_KNOWLEDGE_RELEASE_ID_V1,
    knowledgeSchemaVersion: AEAT_DOCUMENT_KNOWLEDGE_SCHEMA_VERSION_V1,
    expectedCounts: {
      profiles: 87,
      officialSources: 50,
      relationTypes: 48,
      documentChains: 15,
    },
    profiles: AEAT_DOCUMENT_PROFILES_V1.map((profile) => {
      const binding = resolveFamilyExtractorBindingV1(profile.id);
      if (!binding) throw new Error("MISSING_FAMILY_EXTRACTOR_BINDING_V1");
      const familyRule = resolveFamilyRuleV2(profile.id);
      if (!familyRule) throw new Error("MISSING_FAMILY_RULE_V2");
      const specializedEvidence = specializedEvidenceForFamily(profile.id);
      if (!specializedEvidence) {
        throw new Error("MISSING_PROFILE_DRIVEN_EXTRACTOR_EVIDENCE_V2");
      }
      const explanation = explainFiscalNotificationDocumentV2({
        familyId: profile.id,
      });
      return {
        familyId: profile.id,
        recognition: {
          claimedStatus:
            "SPECIALIZED_RECOGNITION_IMPLEMENTED_REVIEW_ONLY" as const,
          registryEvidenceId: specializedEvidence.evidenceId,
          registryVersion: specializedEvidence.evidenceVersion,
        },
        extraction: {
          status: "EXTRACTOR_IMPLEMENTED_REVIEW_ONLY" as const,
          implementationId: PROFILE_DRIVEN_EXTRACTOR_IMPLEMENTATION_ID_V2,
          implementationVersion: PROFILE_DRIVEN_EXTRACTOR_VERSION_V2,
        },
        explanation: {
          status: "FAMILY_EXPLANATION_IMPLEMENTED",
          implementationId: explanation.specializationId,
          implementationVersion:
            FISCAL_NOTIFICATION_DOCUMENT_EXPLANATION_ENGINE_VERSION_V2,
        },
        sources: {
          registryId: AEAT_DOCUMENT_KNOWLEDGE_RELEASE_ID_V1,
          registryVersion: AEAT_DOCUMENT_KNOWLEDGE_SCHEMA_VERSION_V1,
          sourceIds: profile.officialSourceIds,
        },
        relations: {
          registryId: AEAT_DOCUMENT_KNOWLEDGE_RELEASE_ID_V1,
          registryVersion: AEAT_DOCUMENT_KNOWLEDGE_SCHEMA_VERSION_V1,
          policy:
            profile.relationPolicy === "NO_AUTOMATIC_RELATION"
              ? "NO_AUTOMATIC_RELATION"
              : "DECLARED_RELATIONS",
          relationTypeIds: expectedRelations(profile.chainRole),
        },
        testCoverage: {
          matrixId: AEAT_DOCUMENT_EXECUTABLE_TEST_REGISTRY_ID_V2,
          matrixVersion: AEAT_DOCUMENT_TEST_MATRIX_VERSION_V2,
          positiveTestIds: expectedTestEvidenceIds(profile.id, "positive"),
          negativeTestIds: expectedTestEvidenceIds(profile.id, "negative"),
          ambiguousTestIds: expectedTestEvidenceIds(
            profile.id,
            "ambiguous",
          ),
          incompleteTestIds: expectedTestEvidenceIds(
            profile.id,
            "incomplete",
          ),
        },
      };
    }),
  };
}

export const AEAT_DOCUMENT_COMPLETION_MANIFEST_V2 = deepFreeze(
  buildCompletionManifestV2(),
);

export const AEAT_DOCUMENT_COMPLETION_GATE_V2 =
  evaluateAeatDocumentCompletionGateV2(AEAT_DOCUMENT_COMPLETION_MANIFEST_V2);
