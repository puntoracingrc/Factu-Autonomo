import { describe, expect, it } from "vitest";
import { createDocumentSegmentV1, type DocumentSegmentV1 } from "./document-segment.v1";

const HASH = `sha256:${"a".repeat(64)}` as const;

function segment(overrides: Partial<DocumentSegmentV1> = {}): DocumentSegmentV1 {
  return {
    segmentId: "segment-synthetic-1",
    documentId: "document-synthetic-1",
    segmentType: "MAIN_ADMINISTRATIVE_ACT",
    pageFrom: 2,
    pageTo: 4,
    detectedTitle: "REQUERIMIENTO SINTÉTICO",
    detectedAuthority: "AEAT",
    classificationConfidence: 0.98,
    extractionStatus: "EXTRACTED_REVIEW_REQUIRED",
    contentHash: HASH,
    canGenerateAdministrativeFacts: true,
    ...overrides,
  };
}

describe("document segment v1", () => {
  it("creates an immutable main-act segment without mutating input", () => {
    const input = segment();
    const before = structuredClone(input);
    const output = createDocumentSegmentV1(input);
    expect(input).toEqual(before);
    expect(output).toEqual(before);
    expect(Object.isFrozen(output)).toBe(true);
  });

  it.each(["NOTIFICATION_COVER", "DELIVERY_EVIDENCE", "ANNEX", "RESPONSE_FORM", "APPEAL_INFORMATION", "GENERIC_INSTRUCTIONS", "UNKNOWN"] as const)(
    "prevents %s from generating administrative facts",
    (segmentType) => {
      expect(() => createDocumentSegmentV1(segment({ segmentType, canGenerateAdministrativeFacts: true }))).toThrowError(
        expect.objectContaining({ path: "segment.canGenerateAdministrativeFacts" }),
      );
      expect(createDocumentSegmentV1(segment({ segmentType, canGenerateAdministrativeFacts: false })).canGenerateAdministrativeFacts).toBe(false);
    },
  );

  it("rejects inverted pages, unbounded confidence and non-SHA256 hashes", () => {
    expect(() => createDocumentSegmentV1(segment({ pageFrom: 4, pageTo: 2 }))).toThrow();
    expect(() => createDocumentSegmentV1(segment({ classificationConfidence: 2 }))).toThrow();
    expect(() => createDocumentSegmentV1(segment({ contentHash: "sha256:unsafe" as DocumentSegmentV1["contentHash"] }))).toThrow();
  });
});
