import {
  FISCAL_NOTIFICATION_INPUT_LIMITS,
  FiscalNotificationInputError,
  assertBoundedId,
} from "../input-contract";
import {
  assertBoundedLiteralV1,
  assertConfidenceV1,
  assertExactDataRecordV1,
  assertPageNumberV1,
} from "./shared.v1";

export const DOCUMENT_SEGMENT_TYPES_V1 = Object.freeze([
  "NOTIFICATION_COVER",
  "DELIVERY_EVIDENCE",
  "MAIN_ADMINISTRATIVE_ACT",
  "ANNEX",
  "DEBT_LIST",
  "PAYMENT_DOCUMENT",
  "RESPONSE_FORM",
  "APPEAL_INFORMATION",
  "GENERIC_INSTRUCTIONS",
  "UNKNOWN",
] as const);
export type DocumentSegmentTypeV1 = (typeof DOCUMENT_SEGMENT_TYPES_V1)[number];

export const DOCUMENT_SEGMENT_EXTRACTION_STATUSES_V1 = Object.freeze([
  "PENDING",
  "EXTRACTED_REVIEW_REQUIRED",
  "UNREADABLE",
  "UNSUPPORTED",
] as const);
export type DocumentSegmentExtractionStatusV1 =
  (typeof DOCUMENT_SEGMENT_EXTRACTION_STATUSES_V1)[number];

export type DetectedAuthorityV1 =
  | "AEAT"
  | "TEAR"
  | "DEHU"
  | "TGSS"
  | "OTHER_PUBLIC_AUTHORITY"
  | "UNKNOWN";

export interface DocumentSegmentV1 {
  readonly segmentId: string;
  readonly documentId: string;
  readonly segmentType: DocumentSegmentTypeV1;
  readonly pageFrom: number;
  readonly pageTo: number;
  readonly detectedTitle: string | null;
  readonly detectedAuthority: DetectedAuthorityV1;
  readonly classificationConfidence: number;
  readonly extractionStatus: DocumentSegmentExtractionStatusV1;
  readonly contentHash: `sha256:${string}`;
  readonly canGenerateAdministrativeFacts: boolean;
}

export function createDocumentSegmentV1(input: DocumentSegmentV1): DocumentSegmentV1 {
  assertExactDataRecordV1(input, "segment", [
    "segmentId", "documentId", "segmentType", "pageFrom", "pageTo", "detectedTitle",
    "detectedAuthority", "classificationConfidence", "extractionStatus", "contentHash",
    "canGenerateAdministrativeFacts",
  ]);
  assertBoundedId(input.segmentId, "segment.segmentId");
  assertBoundedId(input.documentId, "segment.documentId");
  if (!DOCUMENT_SEGMENT_TYPES_V1.includes(input.segmentType)) {
    throw new FiscalNotificationInputError("INVALID_INPUT", "segment.segmentType");
  }
  assertPageNumberV1(input.pageFrom, "segment.pageFrom");
  assertPageNumberV1(input.pageTo, "segment.pageTo");
  if (input.pageTo < input.pageFrom) {
    throw new FiscalNotificationInputError("INVALID_INPUT", "segment.pageTo");
  }
  assertBoundedLiteralV1(input.detectedTitle, "segment.detectedTitle", {
    maxChars: 300,
    nullable: true,
  });
  if (
    !["AEAT", "TEAR", "DEHU", "TGSS", "OTHER_PUBLIC_AUTHORITY", "UNKNOWN"].includes(
      input.detectedAuthority,
    )
  ) {
    throw new FiscalNotificationInputError("INVALID_INPUT", "segment.detectedAuthority");
  }
  assertConfidenceV1(input.classificationConfidence, "segment.classificationConfidence");
  if (!DOCUMENT_SEGMENT_EXTRACTION_STATUSES_V1.includes(input.extractionStatus)) {
    throw new FiscalNotificationInputError("INVALID_INPUT", "segment.extractionStatus");
  }
  if (!/^sha256:[a-f0-9]{64}$/u.test(input.contentHash)) {
    throw new FiscalNotificationInputError("INVALID_INPUT", "segment.contentHash");
  }
  const expectedFactPermission = input.segmentType === "MAIN_ADMINISTRATIVE_ACT" ||
    input.segmentType === "DEBT_LIST" || input.segmentType === "PAYMENT_DOCUMENT";
  if (input.canGenerateAdministrativeFacts !== expectedFactPermission) {
    throw new FiscalNotificationInputError("INVALID_INPUT", "segment.canGenerateAdministrativeFacts");
  }
  if (input.pageTo > FISCAL_NOTIFICATION_INPUT_LIMITS.maxPages) {
    throw new FiscalNotificationInputError("TOO_MANY_PAGES", "segment.pageTo");
  }
  return Object.freeze({ ...input });
}
