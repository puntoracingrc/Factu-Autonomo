import { describe, expect, it } from "vitest";
import type { BoundedDocumentInput } from "../input-contract";
import type { FamilyRecognitionRuleV2 } from "./family-rule-contract.v2";
import { FISCAL_NOTIFICATION_FAMILY_RULES_V2 } from "./family-rule-registry.v2";
import {
  PROFILE_DRIVEN_DOCUMENT_SEGMENTS_LIMITS_V2,
  PROFILE_DRIVEN_DOCUMENT_SEGMENTS_VERSION_V2,
  segmentProfileDrivenDocumentV2,
} from "./profile-driven-document-segments.v2";

const OWNER_SCOPE = "user:synthetic-document-segments-v2";
const FIRST_RULE = FISCAL_NOTIFICATION_FAMILY_RULES_V2[0];
const SECOND_RULE = FISCAL_NOTIFICATION_FAMILY_RULES_V2[1];

function authorityLiteral(rule: FamilyRecognitionRuleV2): string {
  return rule.allowedAuthorities[0].anchors[0].literals[0];
}

function pageFor(
  rule: FamilyRecognitionRuleV2,
  ...extraLines: readonly string[]
): readonly string[] {
  return Object.freeze([
    authorityLiteral(rule),
    rule.canonicalTitle,
    ...rule.requiredAnchors.map((anchor) => anchor.literals[0]),
    ...extraLines,
  ]);
}

function document(
  pages: readonly (readonly string[])[],
  signal?: AbortSignal,
): BoundedDocumentInput {
  return Object.freeze({
    ownerScope: OWNER_SCOPE,
    documentId: "synthetic-multipage-segmentation-v2",
    pages: Object.freeze(
      pages.map((lines, index) =>
        Object.freeze({
          pageNumber: index + 1,
          text: lines.join("\n"),
          isBlank: lines.every((line) => line.length === 0),
        }),
      ),
    ),
    ...(signal ? { signal } : {}),
  });
}

describe("profile-driven document segments v2", () => {
  it("splits separate acts chronologically and keeps untitled copies and annexes with the preceding act", async () => {
    const source = document([
      pageFor(FIRST_RULE),
      ["Copia sintética para archivo", "Detalle adicional sin título"],
      [""],
      pageFor(SECOND_RULE),
      ["Anexo sintético", "Contenido administrativo acotado"],
    ]);

    const result = await segmentProfileDrivenDocumentV2({ document: source });

    expect(result).toMatchObject({
      segmenterVersion: PROFILE_DRIVEN_DOCUMENT_SEGMENTS_VERSION_V2,
      status: "SEGMENTED_REVIEW_REQUIRED",
      issues: [],
      retainedSourceContent: "NONE",
      requiresHumanReview: true,
      materializationPolicy: "PROHIBITED",
      confirmsFamily: false,
      permitsAccountingAction: false,
    });
    expect(
      result.segments.map(({ pageFrom, pageTo, familyId }) => ({
        pageFrom,
        pageTo,
        familyId,
      })),
    ).toEqual([
      { pageFrom: 1, pageTo: 3, familyId: FIRST_RULE.familyId },
      { pageFrom: 4, pageTo: 5, familyId: SECOND_RULE.familyId },
    ]);
    expect(result.segments.every(({ outcome }) => outcome.status === "REVIEW_REQUIRED"))
      .toBe(true);
    expect(result.segments[0].outcome.familyCandidates[0].matchedPageNumbers)
      .toContain(1);
    expect(result.segments[1].outcome.familyCandidates[0].matchedPageNumbers)
      .toContain(4);
  });

  it("recognizes a closed compatible prefix as a start page", async () => {
    const compatibleTitle = `${FIRST_RULE.canonicalTitle} · copia sintética`;
    const source = document([
      [authorityLiteral(FIRST_RULE), compatibleTitle],
      ["Anexo sin título propio"],
    ]);

    const result = await segmentProfileDrivenDocumentV2({ document: source });

    expect(result.status).toBe("SEGMENTED_REVIEW_REQUIRED");
    expect(result.segments).toHaveLength(1);
    expect(result.segments[0]).toMatchObject({
      pageFrom: 1,
      pageTo: 2,
      familyId: FIRST_RULE.familyId,
    });
    expect(result.segments[0].outcome.familyCandidates[0].titleMatch).toBe(
      "CLOSED_PREFIX",
    );
  });

  it("keeps original page numbers after an unsegmented leading cover", async () => {
    const source = document([
      ["Cubierta sintética sin título administrativo"],
      ["Índice sintético"],
      pageFor(FIRST_RULE),
      ["Anexo sin título propio"],
    ]);

    const result = await segmentProfileDrivenDocumentV2({ document: source });

    expect(result.status).toBe("SEGMENTED_REVIEW_REQUIRED");
    expect(result.issues).toEqual(["UNSEGMENTED_LEADING_PAGES"]);
    expect(result.segments[0]).toMatchObject({ pageFrom: 3, pageTo: 4 });
    expect(result.segments[0].outcome.familyCandidates[0].matchedPageNumbers)
      .toContain(3);
  });

  it("returns unknown without retaining text when no compatible title exists", async () => {
    const secretMarker = "MARCADOR-SINTETICO-NO-RETENER-7421";
    const result = await segmentProfileDrivenDocumentV2({
      document: document([[secretMarker], ["Anexo sintético"]]),
    });

    expect(result).toMatchObject({
      status: "UNKNOWN_REVIEW_REQUIRED",
      segments: [],
      issues: ["NO_EXACT_OR_COMPATIBLE_START"],
      retainedSourceContent: "NONE",
    });
    expect(JSON.stringify(result)).not.toContain(secretMarker);
  });

  it("fails closed for ambiguous, conflicting and unresolved titled pages", async () => {
    const ambiguous = await segmentProfileDrivenDocumentV2({
      document: document([
        [
          authorityLiteral(FIRST_RULE),
          FIRST_RULE.canonicalTitle,
          SECOND_RULE.canonicalTitle,
        ],
      ]),
    });
    expect(ambiguous).toMatchObject({
      status: "BLOCKED_REVIEW_REQUIRED",
      segments: [],
      issues: ["AMBIGUOUS_OR_CONFLICTING_START"],
    });

    const conflicting = await segmentProfileDrivenDocumentV2({
      document: document([
        [
          authorityLiteral(FIRST_RULE),
          "Tesorería General de la Seguridad Social",
          FIRST_RULE.canonicalTitle,
        ],
      ]),
    });
    expect(conflicting).toMatchObject({
      status: "BLOCKED_REVIEW_REQUIRED",
      segments: [],
      issues: ["AMBIGUOUS_OR_CONFLICTING_START"],
    });

    const unresolved = await segmentProfileDrivenDocumentV2({
      document: document([[FIRST_RULE.canonicalTitle]]),
    });
    expect(unresolved).toMatchObject({
      status: "BLOCKED_REVIEW_REQUIRED",
      segments: [],
      issues: ["UNRESOLVED_TITLE_PAGE"],
    });
  });

  it("blocks the complete result before producing more than sixteen acts", async () => {
    const source = document(
      Array.from(
        { length: PROFILE_DRIVEN_DOCUMENT_SEGMENTS_LIMITS_V2.maxSegments + 1 },
        () => pageFor(FIRST_RULE),
      ),
    );

    const result = await segmentProfileDrivenDocumentV2({ document: source });

    expect(result).toMatchObject({
      status: "BLOCKED_REVIEW_REQUIRED",
      segments: [],
      issues: ["SEGMENT_LIMIT_EXCEEDED"],
    });
  });

  it("is cancelable, immutable and does not mutate the bounded input", async () => {
    const controller = new AbortController();
    controller.abort();
    await expect(
      segmentProfileDrivenDocumentV2({
        document: document([pageFor(FIRST_RULE)], controller.signal),
      }),
    ).rejects.toEqual(
      expect.objectContaining({ code: "ABORTED", path: "signal" }),
    );

    const source = document([pageFor(FIRST_RULE), ["Anexo sintético"]]);
    const before = JSON.stringify(source);
    const result = await segmentProfileDrivenDocumentV2({ document: source });
    expect(JSON.stringify(source)).toBe(before);
    expect(Object.isFrozen(result)).toBe(true);
    expect(Object.isFrozen(result.segments)).toBe(true);
    expect(Object.isFrozen(result.segments[0])).toBe(true);
    expect(Object.isFrozen(result.segments[0].outcome)).toBe(true);
    expect(() => {
      (result.segments as unknown as unknown[]).push("alterado");
    }).toThrow();
  });
});
