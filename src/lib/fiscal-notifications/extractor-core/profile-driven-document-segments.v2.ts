import {
  assertBoundedDocumentInput,
  assertNotAborted,
  type BoundedAdministrativePage,
  type BoundedDocumentInput,
} from "../input-contract";
import type { FiscalNotificationDocumentFamilyIdV3 } from "../knowledge/document-families.v3";
import type { FamilyRecognitionRuleV2 } from "./family-rule-contract.v2";
import {
  extractProfileDrivenFamilyV2,
  type ProfileDrivenExtractorOutcomeV2,
} from "./profile-driven-extractor.v2";

export const PROFILE_DRIVEN_DOCUMENT_SEGMENTS_SCHEMA_VERSION_V2 = 2 as const;
export const PROFILE_DRIVEN_DOCUMENT_SEGMENTS_VERSION_V2 =
  "profile-driven-document-segments.2026-07-16.v2" as const;

export const PROFILE_DRIVEN_DOCUMENT_SEGMENTS_LIMITS_V2 = Object.freeze({
  maxSegments: 16,
} as const);

export type ProfileDrivenDocumentSegmentsStatusV2 =
  | "SEGMENTED_REVIEW_REQUIRED"
  | "UNKNOWN_REVIEW_REQUIRED"
  | "BLOCKED_REVIEW_REQUIRED";

export type ProfileDrivenDocumentSegmentsIssueV2 =
  | "NO_EXACT_OR_COMPATIBLE_START"
  | "UNSEGMENTED_LEADING_PAGES"
  | "UNRESOLVED_TITLE_PAGE"
  | "AMBIGUOUS_OR_CONFLICTING_START"
  | "SEGMENT_LIMIT_EXCEEDED"
  | "SEGMENT_REANALYSIS_NOT_REVIEW_REQUIRED";

export interface ProfileDrivenDocumentSegmentV2 {
  readonly segmentId: string;
  readonly pageFrom: number;
  readonly pageTo: number;
  readonly familyId: FiscalNotificationDocumentFamilyIdV3;
  readonly outcome: ProfileDrivenExtractorOutcomeV2 & {
    readonly status: "REVIEW_REQUIRED";
    readonly familyId: FiscalNotificationDocumentFamilyIdV3;
  };
  readonly retainedSourceContent: "NONE";
  readonly requiresHumanReview: true;
  readonly materializationPolicy: "PROHIBITED";
}

export interface SegmentProfileDrivenDocumentInputV2 {
  readonly document: BoundedDocumentInput;
  /** Tests and future versioned registries may inject an immutable rule set. */
  readonly rules?: readonly FamilyRecognitionRuleV2[];
}

export interface ProfileDrivenDocumentSegmentsOutcomeV2 {
  readonly schemaVersion: typeof PROFILE_DRIVEN_DOCUMENT_SEGMENTS_SCHEMA_VERSION_V2;
  readonly segmenterVersion: typeof PROFILE_DRIVEN_DOCUMENT_SEGMENTS_VERSION_V2;
  readonly status: ProfileDrivenDocumentSegmentsStatusV2;
  readonly documentId: string;
  readonly segments: readonly ProfileDrivenDocumentSegmentV2[];
  readonly issues: readonly ProfileDrivenDocumentSegmentsIssueV2[];
  readonly retainedSourceContent: "NONE";
  readonly requiresHumanReview: true;
  readonly materializationPolicy: "PROHIBITED";
  readonly confirmsFamily: false;
  readonly confirmsObligation: false;
  readonly confirmsDebt: false;
  readonly confirmsPayment: false;
  readonly confirmsDeadline: false;
  readonly confirmsSeizure: false;
  readonly permitsAccountingAction: false;
}

interface DetectedSegmentStartV2 {
  readonly pageNumber: number;
  readonly familyId: FiscalNotificationDocumentFamilyIdV3;
}

function buildOutcome(input: {
  readonly documentId: string;
  readonly status: ProfileDrivenDocumentSegmentsStatusV2;
  readonly segments?: readonly ProfileDrivenDocumentSegmentV2[];
  readonly issues?: readonly ProfileDrivenDocumentSegmentsIssueV2[];
}): ProfileDrivenDocumentSegmentsOutcomeV2 {
  return Object.freeze({
    schemaVersion: PROFILE_DRIVEN_DOCUMENT_SEGMENTS_SCHEMA_VERSION_V2,
    segmenterVersion: PROFILE_DRIVEN_DOCUMENT_SEGMENTS_VERSION_V2,
    status: input.status,
    documentId: input.documentId,
    segments: Object.freeze([...(input.segments ?? [])]),
    issues: Object.freeze([...(input.issues ?? [])]),
    retainedSourceContent: "NONE" as const,
    requiresHumanReview: true as const,
    materializationPolicy: "PROHIBITED" as const,
    confirmsFamily: false as const,
    confirmsObligation: false as const,
    confirmsDebt: false as const,
    confirmsPayment: false as const,
    confirmsDeadline: false as const,
    confirmsSeizure: false as const,
    permitsAccountingAction: false as const,
  });
}

function pageProbe(
  document: BoundedDocumentInput,
  page: BoundedAdministrativePage,
): BoundedDocumentInput {
  return Object.freeze({
    ownerScope: document.ownerScope,
    documentId: document.documentId,
    pages: Object.freeze([
      Object.freeze({
        pageNumber: 1,
        text: page.text,
        isBlank: page.isBlank,
      }),
    ]),
    ...(document.signal ? { signal: document.signal } : {}),
  });
}

/**
 * Builds an ephemeral bounded view whose page numbers still match the source
 * PDF. Pages before the segment are blank placeholders and pages after it are
 * omitted. Neither placeholders nor source text are retained in the outcome.
 */
function segmentDocument(
  document: BoundedDocumentInput,
  pageFrom: number,
  pageTo: number,
): BoundedDocumentInput {
  const pages = document.pages.slice(0, pageTo).map((page) =>
    page.pageNumber < pageFrom
      ? Object.freeze({
          pageNumber: page.pageNumber,
          text: "",
          isBlank: true,
        })
      : page,
  );
  return Object.freeze({
    ownerScope: document.ownerScope,
    documentId: document.documentId,
    pages: Object.freeze(pages),
    ...(document.signal ? { signal: document.signal } : {}),
  });
}

function blocked(
  documentId: string,
  issue: Exclude<
    ProfileDrivenDocumentSegmentsIssueV2,
    "NO_EXACT_OR_COMPATIBLE_START" | "UNSEGMENTED_LEADING_PAGES"
  >,
): ProfileDrivenDocumentSegmentsOutcomeV2 {
  return buildOutcome({
    documentId,
    status: "BLOCKED_REVIEW_REQUIRED",
    issues: [issue],
  });
}

/**
 * Splits a bounded multipage input at V2-recognized act titles. Detection and
 * reanalysis are deterministic, local, review-only and discard all source text
 * from the returned value. An ambiguous, conflicting or unresolved titled page
 * blocks the complete result so that no partial interpretation can escape.
 */
export async function segmentProfileDrivenDocumentV2(
  input: SegmentProfileDrivenDocumentInputV2,
): Promise<ProfileDrivenDocumentSegmentsOutcomeV2> {
  assertBoundedDocumentInput(input.document);
  assertNotAborted(input.document.signal);

  const starts: DetectedSegmentStartV2[] = [];
  for (const page of input.document.pages) {
    assertNotAborted(input.document.signal);
    const probeOutcome = await extractProfileDrivenFamilyV2({
      document: pageProbe(input.document, page),
      ...(input.rules ? { rules: input.rules } : {}),
    });
    assertNotAborted(input.document.signal);

    if (
      probeOutcome.status === "AMBIGUOUS" ||
      probeOutcome.status === "BLOCKED"
    ) {
      return blocked(
        input.document.documentId,
        "AMBIGUOUS_OR_CONFLICTING_START",
      );
    }
    if (
      probeOutcome.status === "UNKNOWN" &&
      probeOutcome.familyCandidates.length > 0
    ) {
      return blocked(input.document.documentId, "UNRESOLVED_TITLE_PAGE");
    }
    if (
      probeOutcome.status !== "REVIEW_REQUIRED" ||
      probeOutcome.familyId === null
    ) {
      continue;
    }
    starts.push(
      Object.freeze({
        pageNumber: page.pageNumber,
        familyId: probeOutcome.familyId,
      }),
    );
    if (starts.length > PROFILE_DRIVEN_DOCUMENT_SEGMENTS_LIMITS_V2.maxSegments) {
      return blocked(input.document.documentId, "SEGMENT_LIMIT_EXCEEDED");
    }
  }

  if (starts.length === 0) {
    return buildOutcome({
      documentId: input.document.documentId,
      status: "UNKNOWN_REVIEW_REQUIRED",
      issues: ["NO_EXACT_OR_COMPATIBLE_START"],
    });
  }

  const segments: ProfileDrivenDocumentSegmentV2[] = [];
  for (let index = 0; index < starts.length; index += 1) {
    assertNotAborted(input.document.signal);
    const start = starts[index];
    const next = starts[index + 1];
    const pageTo = next
      ? next.pageNumber - 1
      : input.document.pages.length;
    const outcome = await extractProfileDrivenFamilyV2({
      document: segmentDocument(input.document, start.pageNumber, pageTo),
      ...(input.rules ? { rules: input.rules } : {}),
    });
    assertNotAborted(input.document.signal);
    if (
      outcome.status !== "REVIEW_REQUIRED" ||
      outcome.familyId === null ||
      outcome.familyId !== start.familyId
    ) {
      return blocked(
        input.document.documentId,
        "SEGMENT_REANALYSIS_NOT_REVIEW_REQUIRED",
      );
    }
    const reviewedOutcome = outcome as ProfileDrivenDocumentSegmentV2["outcome"];
    segments.push(
      Object.freeze({
        segmentId: `segment-v2-${index + 1}:pages-${start.pageNumber}-${pageTo}`,
        pageFrom: start.pageNumber,
        pageTo,
        familyId: start.familyId,
        outcome: reviewedOutcome,
        retainedSourceContent: "NONE" as const,
        requiresHumanReview: true as const,
        materializationPolicy: "PROHIBITED" as const,
      }),
    );
  }

  return buildOutcome({
    documentId: input.document.documentId,
    status: "SEGMENTED_REVIEW_REQUIRED",
    segments,
    issues:
      starts[0].pageNumber > 1 ? ["UNSEGMENTED_LEADING_PAGES"] : [],
  });
}
