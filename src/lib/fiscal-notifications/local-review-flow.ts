"use client";

import type { AeatEnforcementMoneyFactsResult } from "./aeat-enforcement-money-facts";
import type { AeatEnforcementExplicitFieldsV2 } from "./aeat-enforcement-explicit-fields.v2";
import type { AeatEnforcementPartyFactsV1 } from "./aeat-enforcement-party-facts.v1";
import type { AeatDeferralGrantFactsResultV1 } from "./aeat-deferral-grant-facts.v1";
import type { AeatOffsetAgreementFactsResultV1 } from "./aeat-offset-agreement-facts.v1";
import type {
  FiscalNotificationAnchorId,
  FiscalNotificationCandidateSignalStatus,
  FiscalNotificationExtractionReason,
  FiscalNotificationFamilyCandidate,
  FiscalNotificationSupportedFamilyId,
} from "./extraction-contract";
import { assertNotAborted } from "./input-contract";
import {
  parseFiscalNotificationLocalOcrResult,
  recognizeFiscalNotificationPdfLocally,
  type FiscalNotificationLocalOcrAnalysis,
} from "./local-pdf-ocr";
import {
  readFiscalNotificationPdfTextLayer,
  type FiscalNotificationPdfTextLayerResult,
} from "./pdf-text-layer-adapter";
import { FiscalNotificationPdfError } from "./pdf-text-layer-parser";
import type { AdministrativeDocumentType } from "./types";

export const FISCAL_NOTIFICATION_LOCAL_REVIEW_SCHEMA_VERSION = 1 as const;
export const FISCAL_NOTIFICATION_LOCAL_REVIEW_FLOW_VERSION = "1.0.0" as const;
export const FISCAL_NOTIFICATION_LOCAL_ANALYSIS_SCHEMA_VERSION = 6 as const;
export const FISCAL_NOTIFICATION_LOCAL_ANALYSIS_VERSION = "6.0.0" as const;

export type FiscalNotificationLocalReviewReason =
  | FiscalNotificationExtractionReason
  | "OCR_DISABLED";

export interface FiscalNotificationLocalReviewAnchor {
  readonly anchorId: FiscalNotificationAnchorId;
  readonly pageNumbers: readonly number[];
}

export interface FiscalNotificationLocalReviewCandidate {
  readonly familyId: FiscalNotificationSupportedFamilyId;
  readonly recognitionPolicyVersion?: "1.3.0";
  readonly segmentationVersion?: "1.0.0" | "1.1.0";
  readonly documentType: Extract<
    AdministrativeDocumentType,
    | "AEAT_ENFORCEMENT_ORDER"
    | "AEAT_INSTALLMENT_OR_DEFERRAL_GRANT"
    | "AEAT_OFFSET_AGREEMENT"
    | "AEAT_SEIZURE_ORDER"
    | "GENERIC_ADMINISTRATIVE_NOTICE"
  >;
  readonly authoritySignal: FiscalNotificationFamilyCandidate["authoritySignal"];
  readonly handlerId: FiscalNotificationFamilyCandidate["handlerId"];
  readonly handlerVersion: FiscalNotificationFamilyCandidate["handlerVersion"];
  readonly signalStatus: FiscalNotificationCandidateSignalStatus;
  readonly matchedAnchors: readonly FiscalNotificationLocalReviewAnchor[];
  readonly missingRequiredAnchorIds: readonly FiscalNotificationAnchorId[];
  readonly conflictingAnchorIds: readonly FiscalNotificationAnchorId[];
  readonly requiresHumanReview: true;
}

export interface FiscalNotificationLocalReviewResult {
  readonly schemaVersion: 1;
  readonly flowVersion: "1.0.0";
  readonly status: "REVIEW_REQUIRED" | "INFORMATION_PENDING";
  readonly reason: FiscalNotificationLocalReviewReason;
  readonly engineId:
    | "fiscal-notification-family-candidate-engine"
    | null;
  readonly engineVersion:
    | "1.0.0"
    | "1.1.0"
    | "1.2.0"
    | "1.3.0"
    | "1.4.0"
    | null;
  readonly pageCount: number;
  readonly byteLength: number;
  readonly sha256: string;
  readonly candidates: readonly FiscalNotificationLocalReviewCandidate[];
  readonly selectedFamilyId: null;
  readonly providerCalled: false;
  readonly requiresHumanReview: true;
  readonly materializationPolicy: "PROHIBITED_UNTIL_REVIEW";
  readonly retainedSourceContent: "NONE";
}

export interface FiscalNotificationLocalAnalysisResult {
  readonly schemaVersion: 6;
  readonly analysisVersion: "6.0.0";
  readonly technicalReview: FiscalNotificationLocalReviewResult;
  readonly ephemeralEnforcementMoneyFacts:
    | AeatEnforcementMoneyFactsResult
    | null;
  readonly ephemeralEnforcementExplicitFields:
    | AeatEnforcementExplicitFieldsV2
    | null;
  readonly ephemeralEnforcementPartyFacts: AeatEnforcementPartyFactsV1 | null;
  readonly ephemeralDeferralGrantFacts: AeatDeferralGrantFactsResultV1 | null;
  readonly ephemeralOffsetAgreementFacts:
    | AeatOffsetAgreementFactsResultV1
    | null;
  readonly textAcquisition?: Readonly<{
    readonly mode: "PDF_TEXT_LAYER" | "LOCAL_OCR";
    readonly averageConfidence: number | null;
  }>;
  readonly sourceContentPolicy: "EPHEMERAL_IN_MEMORY_DO_NOT_PERSIST";
  readonly requiresHumanReview: true;
  readonly materializationPolicy: "PROHIBITED_UNTIL_REVIEW";
}

/** @internal Test-only dependency contract. Production dependencies are fixed. */
export interface FiscalNotificationLocalReviewDependencies {
  readonly readPdf: (
    value: unknown,
  ) => Promise<FiscalNotificationPdfTextLayerResult>;
  readonly ocrPort: Readonly<{
    recognize(value: unknown): Promise<unknown>;
  }>;
}

const PRODUCTION_DEPENDENCIES: FiscalNotificationLocalReviewDependencies =
  Object.freeze({
    readPdf: readFiscalNotificationPdfTextLayer,
    ocrPort: Object.freeze({
      recognize: recognizeFiscalNotificationPdfLocally,
    }),
  });

export async function analyzeFiscalNotificationLocally(
  request: unknown,
): Promise<FiscalNotificationLocalReviewResult> {
  const analysis = await analyzeFiscalNotificationWithDependencies(
    request,
    PRODUCTION_DEPENDENCIES,
  );
  return analysis.technicalReview;
}

export async function analyzeFiscalNotificationLocallyWithEphemeralFacts(
  request: unknown,
): Promise<FiscalNotificationLocalAnalysisResult> {
  return analyzeFiscalNotificationWithDependencies(
    request,
    PRODUCTION_DEPENDENCIES,
  );
}

async function analyzeFiscalNotificationWithDependencies(
  request: unknown,
  dependencies: FiscalNotificationLocalReviewDependencies,
): Promise<FiscalNotificationLocalAnalysisResult> {
  const intake = await dependencies.readPdf(request);
  const signal = intake.reviewContext.signal;
  const pageCount = intake.analysis.pageCount;
  assertNotAborted(signal);

  if (intake.status === "NO_EXTRACTABLE_TEXT") {
    const file = readRequestFile(request);
    const ocr = parseFiscalNotificationLocalOcrResult(
      await dependencies.ocrPort.recognize({
        ownerScope: intake.reviewContext.ownerScope,
        documentId: intake.reviewContext.documentId,
        file,
        expectedByteLength: intake.fileIntegrity.byteLength,
        expectedSha256: intake.fileIntegrity.sha256,
        expectedPageCount: pageCount,
        ...(signal ? { signal } : {}),
      }),
    );
    assertNotAborted(signal);
    if (ocr.status === "OCR_TEXT_AVAILABLE" && ocr.analysis) {
      return projectAnalysis(
        ocr.analysis,
        intake.fileIntegrity.byteLength,
        intake.fileIntegrity.sha256,
        Object.freeze({
          mode: "LOCAL_OCR" as const,
          averageConfidence: ocr.averageConfidence,
        }),
      );
    }
    return freezeAnalysisResult(
      freezeResult({
        status: "INFORMATION_PENDING",
        reason: "NO_EXTRACTABLE_TEXT",
        engineId: null,
        engineVersion: null,
        pageCount,
        byteLength: intake.fileIntegrity.byteLength,
        sha256: intake.fileIntegrity.sha256,
        candidates: [],
      }),
      null,
      null,
      null,
      null,
      null,
      Object.freeze({
        mode: "LOCAL_OCR" as const,
        averageConfidence: null,
      }),
    );
  }

  return projectAnalysis(
    intake.analysis,
    intake.fileIntegrity.byteLength,
    intake.fileIntegrity.sha256,
    Object.freeze({
      mode: "PDF_TEXT_LAYER" as const,
      averageConfidence: null,
    }),
  );
}

function projectAnalysis(
  analysis:
    | FiscalNotificationLocalOcrAnalysis
    | FiscalNotificationPdfTextLayerResult["analysis"],
  byteLength: number,
  sha256: string,
  textAcquisition: NonNullable<
    FiscalNotificationLocalAnalysisResult["textAcquisition"]
  >,
): FiscalNotificationLocalAnalysisResult {
  const extraction = analysis.familyAnalysis;
  if (!extraction) {
    throw new FiscalNotificationPdfError("INVALID_WORKER_RESPONSE");
  }
  return freezeAnalysisResult(
    freezeResult({
      status: extraction.status,
      reason: extraction.reason,
      engineId: extraction.engineId,
      engineVersion: extraction.engineVersion,
      pageCount: analysis.pageCount,
      byteLength,
      sha256,
      candidates: extraction.candidates.map((candidate) => ({
        familyId: candidate.familyId,
        ...(candidate.recognitionPolicyVersion === undefined
          ? {}
          : { recognitionPolicyVersion: candidate.recognitionPolicyVersion }),
        ...(candidate.segmentationVersion === undefined
          ? {}
          : { segmentationVersion: candidate.segmentationVersion }),
        documentType: candidate.documentType,
        authoritySignal: candidate.authoritySignal,
        handlerId: candidate.handlerId,
        handlerVersion: candidate.handlerVersion,
        signalStatus: candidate.signalStatus,
        matchedAnchors: candidate.matchedAnchors.map((anchor) => ({
          anchorId: anchor.anchorId,
          pageNumbers: [...anchor.pageNumbers],
        })),
        missingRequiredAnchorIds: [...candidate.missingRequiredAnchorIds],
        conflictingAnchorIds: [...candidate.conflictingAnchorIds],
        requiresHumanReview: true,
      })),
    }),
    analysis.enforcementMoneyFacts ?? null,
    analysis.enforcementExplicitFields ?? null,
    analysis.enforcementPartyFacts ?? null,
    analysis.deferralGrantFacts ?? null,
    analysis.offsetAgreementFacts ?? null,
    textAcquisition,
  );
}

export const FISCAL_NOTIFICATION_LOCAL_REVIEW_TEST_SEAM =
  process.env.NODE_ENV === "test"
    ? Object.freeze({
        analyzeWithDependencies: async (
          request: unknown,
          dependencies: FiscalNotificationLocalReviewDependencies,
        ) =>
          (
            await analyzeFiscalNotificationWithDependencies(
              request,
              dependencies,
            )
          ).technicalReview,
        analyzeEphemeralWithDependencies:
          analyzeFiscalNotificationWithDependencies,
      })
    : null;

function freezeAnalysisResult(
  technicalReview: FiscalNotificationLocalReviewResult,
  ephemeralEnforcementMoneyFacts: AeatEnforcementMoneyFactsResult | null,
  ephemeralEnforcementExplicitFields: AeatEnforcementExplicitFieldsV2 | null,
  ephemeralEnforcementPartyFacts: AeatEnforcementPartyFactsV1 | null,
  ephemeralDeferralGrantFacts: AeatDeferralGrantFactsResultV1 | null,
  ephemeralOffsetAgreementFacts: AeatOffsetAgreementFactsResultV1 | null,
  textAcquisition?: NonNullable<
    FiscalNotificationLocalAnalysisResult["textAcquisition"]
  >,
): FiscalNotificationLocalAnalysisResult {
  return Object.freeze({
    schemaVersion: FISCAL_NOTIFICATION_LOCAL_ANALYSIS_SCHEMA_VERSION,
    analysisVersion: FISCAL_NOTIFICATION_LOCAL_ANALYSIS_VERSION,
    technicalReview,
    ephemeralEnforcementMoneyFacts,
    ephemeralEnforcementExplicitFields,
    ephemeralEnforcementPartyFacts,
    ephemeralDeferralGrantFacts,
    ephemeralOffsetAgreementFacts,
    ...(textAcquisition
      ? { textAcquisition: Object.freeze({ ...textAcquisition }) }
      : {}),
    sourceContentPolicy: "EPHEMERAL_IN_MEMORY_DO_NOT_PERSIST" as const,
    requiresHumanReview: true as const,
    materializationPolicy: "PROHIBITED_UNTIL_REVIEW" as const,
  });
}

function readRequestFile(value: unknown): File {
  try {
    if (value === null || typeof value !== "object" || Array.isArray(value)) {
      throw new FiscalNotificationPdfError("INVALID_PDF");
    }
    const descriptor = Object.getOwnPropertyDescriptor(value, "file");
    const file = descriptor && "value" in descriptor ? descriptor.value : null;
    if (typeof File === "undefined" || !(file instanceof File)) {
      throw new FiscalNotificationPdfError("UNSUPPORTED_FILE");
    }
    return file;
  } catch (error) {
    if (error instanceof FiscalNotificationPdfError) throw error;
    throw new FiscalNotificationPdfError("INVALID_PDF");
  }
}

function freezeResult(input: {
  status: "REVIEW_REQUIRED" | "INFORMATION_PENDING";
  reason: FiscalNotificationLocalReviewReason;
  engineId: "fiscal-notification-family-candidate-engine" | null;
  engineVersion:
    | "1.0.0"
    | "1.1.0"
    | "1.2.0"
    | "1.3.0"
    | "1.4.0"
    | null;
  pageCount: number;
  byteLength: number;
  sha256: string;
  candidates: readonly {
    familyId: FiscalNotificationSupportedFamilyId;
    recognitionPolicyVersion?: "1.3.0";
    segmentationVersion?: "1.0.0" | "1.1.0";
    documentType: Extract<
      AdministrativeDocumentType,
      | "AEAT_ENFORCEMENT_ORDER"
      | "AEAT_INSTALLMENT_OR_DEFERRAL_GRANT"
      | "AEAT_OFFSET_AGREEMENT"
      | "AEAT_SEIZURE_ORDER"
      | "GENERIC_ADMINISTRATIVE_NOTICE"
    >;
    authoritySignal: FiscalNotificationFamilyCandidate["authoritySignal"];
    handlerId: FiscalNotificationFamilyCandidate["handlerId"];
    handlerVersion: FiscalNotificationFamilyCandidate["handlerVersion"];
    signalStatus: FiscalNotificationCandidateSignalStatus;
    matchedAnchors: readonly {
      anchorId: FiscalNotificationAnchorId;
      pageNumbers: readonly number[];
    }[];
    missingRequiredAnchorIds: readonly FiscalNotificationAnchorId[];
    conflictingAnchorIds: readonly FiscalNotificationAnchorId[];
    requiresHumanReview: true;
  }[];
}): FiscalNotificationLocalReviewResult {
  const candidates = input.candidates.map((candidate) =>
    Object.freeze({
      ...candidate,
      matchedAnchors: Object.freeze(
        candidate.matchedAnchors.map((anchor) =>
          Object.freeze({
            ...anchor,
            pageNumbers: Object.freeze([...anchor.pageNumbers]),
          }),
        ),
      ),
      missingRequiredAnchorIds: Object.freeze([
        ...candidate.missingRequiredAnchorIds,
      ]),
      conflictingAnchorIds: Object.freeze([
        ...candidate.conflictingAnchorIds,
      ]),
    }),
  );
  return Object.freeze({
    schemaVersion: FISCAL_NOTIFICATION_LOCAL_REVIEW_SCHEMA_VERSION,
    flowVersion: FISCAL_NOTIFICATION_LOCAL_REVIEW_FLOW_VERSION,
    status: input.status,
    reason: input.reason,
    engineId: input.engineId,
    engineVersion: input.engineVersion,
    pageCount: input.pageCount,
    byteLength: input.byteLength,
    sha256: input.sha256,
    candidates: Object.freeze(candidates),
    selectedFamilyId: null,
    providerCalled: false,
    requiresHumanReview: true,
    materializationPolicy: "PROHIBITED_UNTIL_REVIEW",
    retainedSourceContent: "NONE",
  });
}
