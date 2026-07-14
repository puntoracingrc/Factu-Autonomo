import {
  assertBoundedDocumentInput,
  assertNotAborted,
  type BoundedDocumentInput,
} from "../input-contract";
import {
  extractAssessmentV1,
  type AssessmentExtractorOutputV1,
} from "./assessment-extractor.v1";
import {
  segmentFiscalNotificationDocumentV1,
  type DocumentSegmentationResultV1,
} from "./document-segmenter.v1";
import {
  extractFormalFilingRequirementV1,
  type FormalFilingRequirementExtractorOutputV1,
} from "./formal-filing-requirement-extractor.v1";
import {
  extractNotificationEnvelopeV1,
  type NotificationEnvelopeExtractorOutputV1,
} from "./notification-envelope-extractor.v1";
import {
  extractPaymentEvidenceV1,
  type PaymentEvidenceExtractorOutputV1,
} from "./payment-evidence-extractor.v1";
import {
  extractPaymentOrderV1,
  type PaymentOrderExtractorOutputV1,
} from "./payment-order-extractor.v1";
import {
  extractSeizureV1,
  type SeizureExtractorOutputV1,
} from "./seizure-extractor.v1";
import {
  FISCAL_NOTIFICATION_EXTRACTOR_CORE_RELEASE_V1,
  FISCAL_NOTIFICATION_EXTRACTOR_CORE_VERSION_V1,
} from "./shared.v1";

export const FISCAL_NOTIFICATION_VERTICAL_SLICE_ORCHESTRATOR_VERSION_V1 =
  "1.2.0" as const;

export const FISCAL_NOTIFICATION_VERTICAL_SLICE_EXTRACTOR_ORDER_V1 =
  Object.freeze([
    "notification-envelope",
    "requirement",
    "assessment",
    "payment-order",
    "payment-evidence",
    "seizure",
  ] as const);

export type FiscalNotificationVerticalSliceExtractorIdV1 =
  (typeof FISCAL_NOTIFICATION_VERTICAL_SLICE_EXTRACTOR_ORDER_V1)[number];

export interface FiscalNotificationVerticalSliceExtractionsV1 {
  readonly notificationEnvelope: NotificationEnvelopeExtractorOutputV1 | null;
  readonly formalFilingRequirement: FormalFilingRequirementExtractorOutputV1 | null;
  readonly assessment: AssessmentExtractorOutputV1 | null;
  readonly paymentOrder: PaymentOrderExtractorOutputV1 | null;
  readonly paymentEvidence: PaymentEvidenceExtractorOutputV1 | null;
  readonly seizure: SeizureExtractorOutputV1 | null;
}

export interface FiscalNotificationVerticalSliceAnalysisV1 {
  readonly schemaVersion: 1;
  readonly orchestratorVersion: typeof FISCAL_NOTIFICATION_VERTICAL_SLICE_ORCHESTRATOR_VERSION_V1;
  readonly coreContractVersion: typeof FISCAL_NOTIFICATION_EXTRACTOR_CORE_VERSION_V1;
  readonly releaseId: typeof FISCAL_NOTIFICATION_EXTRACTOR_CORE_RELEASE_V1;
  readonly status:
    | "REVIEW_REQUIRED"
    | "INFORMATION_PENDING"
    | "BLOCKED";
  readonly documentId: string;
  readonly segmentation: DocumentSegmentationResultV1;
  readonly extractionOrder: readonly FiscalNotificationVerticalSliceExtractorIdV1[];
  readonly extractions: FiscalNotificationVerticalSliceExtractionsV1;
  readonly recognizedExtractorIds: readonly FiscalNotificationVerticalSliceExtractorIdV1[];
  readonly blockedExtractorIds: readonly FiscalNotificationVerticalSliceExtractorIdV1[];
  readonly warnings: readonly string[];
  readonly sourceContentPolicy: "EPHEMERAL_IN_MEMORY_DO_NOT_PERSIST";
  readonly retainedSourceContent: "NONE";
  readonly requiresHumanReview: true;
  readonly materializationPolicy: "PROHIBITED_UNTIL_HUMAN_REVIEW";
  readonly permitsDebtCreation: false;
  readonly permitsDeadlineCreation: false;
  readonly permitsPaymentAction: false;
  readonly permitsAccountingAction: false;
}

/**
 * Runs the implemented first vertical slice over one bounded, ephemeral
 * document. The caller keeps ownership of raw page text; this result only
 * contains the structured values emitted by the review-only extractors.
 */
export async function analyzeFiscalNotificationVerticalSliceV1(
  document: BoundedDocumentInput,
): Promise<FiscalNotificationVerticalSliceAnalysisV1> {
  assertBoundedDocumentInput(document);
  assertNotAborted(document.signal);

  const segmentation = await segmentFiscalNotificationDocumentV1({
    ownerScope: document.ownerScope,
    documentId: document.documentId,
    pages: Object.freeze(
      document.pages.map((page) => {
        assertNotAborted(document.signal);
        const normalizedLines = normalizePageLines(page.text);
        return Object.freeze({
          pageNumber: page.pageNumber,
          normalizedLines,
          isBlank: normalizedLines.every((line) => line.length === 0),
        });
      }),
    ),
    ...(document.signal ? { signal: document.signal } : {}),
  });
  assertNotAborted(document.signal);

  const notificationEnvelope = extractNotificationEnvelopeV1({
    document,
    segments: segmentation.segments,
  });
  assertNotAborted(document.signal);
  const requirement = extractFormalFilingRequirementV1({
    document,
    segments: segmentation.segments,
  });
  assertNotAborted(document.signal);
  const assessment = extractAssessmentV1({
    document,
    segments: segmentation.segments,
  });
  assertNotAborted(document.signal);
  const paymentOrder = extractPaymentOrderV1({
    document,
    segments: segmentation.segments,
  });
  assertNotAborted(document.signal);
  const paymentEvidence = extractPaymentEvidenceV1({
    document,
    segments: segmentation.segments,
  });
  assertNotAborted(document.signal);
  const seizure = extractSeizureV1({
    document,
    segments: segmentation.segments,
  });
  assertNotAborted(document.signal);

  const outputs = Object.freeze([
    Object.freeze({ id: "notification-envelope" as const, output: notificationEnvelope }),
    Object.freeze({ id: "requirement" as const, output: requirement }),
    Object.freeze({ id: "assessment" as const, output: assessment }),
    Object.freeze({ id: "payment-order" as const, output: paymentOrder }),
    Object.freeze({ id: "payment-evidence" as const, output: paymentEvidence }),
    Object.freeze({ id: "seizure" as const, output: seizure }),
  ]);
  const recognizedExtractorIds = Object.freeze(
    outputs
      .filter(({ output }) => output.status === "REVIEW_REQUIRED")
      .map(({ id }) => id),
  );
  const blockedExtractorIds = Object.freeze(
    outputs
      .filter(({ id, output }) =>
        output.status === "BLOCKED" &&
        !isSupersededCompetingExtractorBlock(id, recognizedExtractorIds)
      )
      .map(({ id }) => id),
  );
  const warnings = Object.freeze([
    ...segmentation.warnings.map((warning) => `segmentation.${warning}`),
    ...outputs.flatMap(({ id, output }) =>
      isSupersededCompetingExtractorBlock(id, recognizedExtractorIds)
        ? []
        : output.warnings.map((warning) => `${id}.${warning}`),
    ),
  ]);

  return Object.freeze({
    schemaVersion: 1,
    orchestratorVersion:
      FISCAL_NOTIFICATION_VERTICAL_SLICE_ORCHESTRATOR_VERSION_V1,
    coreContractVersion: FISCAL_NOTIFICATION_EXTRACTOR_CORE_VERSION_V1,
    releaseId: FISCAL_NOTIFICATION_EXTRACTOR_CORE_RELEASE_V1,
    status:
      recognizedExtractorIds.length > 0
        ? "REVIEW_REQUIRED"
        : blockedExtractorIds.length > 0
          ? "BLOCKED"
          : "INFORMATION_PENDING",
    documentId: document.documentId,
    segmentation,
    extractionOrder: FISCAL_NOTIFICATION_VERTICAL_SLICE_EXTRACTOR_ORDER_V1,
    extractions: Object.freeze({
      notificationEnvelope:
        notificationEnvelope.status === "REVIEW_REQUIRED" ? notificationEnvelope : null,
      formalFilingRequirement:
        requirement.status === "REVIEW_REQUIRED" ? requirement : null,
      assessment:
        assessment.status === "REVIEW_REQUIRED" ? assessment : null,
      paymentOrder:
        paymentOrder.status === "REVIEW_REQUIRED" ? paymentOrder : null,
      paymentEvidence:
        paymentEvidence.status === "REVIEW_REQUIRED" ? paymentEvidence : null,
      seizure:
        seizure.status === "REVIEW_REQUIRED" ? seizure : null,
    }),
    recognizedExtractorIds,
    blockedExtractorIds,
    warnings,
    sourceContentPolicy: "EPHEMERAL_IN_MEMORY_DO_NOT_PERSIST",
    retainedSourceContent: "NONE",
    requiresHumanReview: true,
    materializationPolicy: "PROHIBITED_UNTIL_HUMAN_REVIEW",
    permitsDebtCreation: false,
    permitsDeadlineCreation: false,
    permitsPaymentAction: false,
    permitsAccountingAction: false,
  });
}

function isSupersededCompetingExtractorBlock(
  extractorId: FiscalNotificationVerticalSliceExtractorIdV1,
  recognizedExtractorIds: readonly FiscalNotificationVerticalSliceExtractorIdV1[],
): boolean {
  return (
    extractorId === "payment-evidence" &&
    recognizedExtractorIds.includes("payment-order")
  ) || (
    extractorId === "payment-order" &&
    recognizedExtractorIds.includes("payment-evidence")
  );
}

function normalizePageLines(text: string): readonly string[] {
  return Object.freeze(
    text.split(/\r\n|\n|\r/u).map((line) =>
      line
        .normalize("NFKD")
        .replace(/\p{M}/gu, "")
        .replace(/[‐‑‒–—−]/gu, "-")
        .toLowerCase()
        .replace(/\s+/gu, " ")
        .trim(),
    ),
  );
}
