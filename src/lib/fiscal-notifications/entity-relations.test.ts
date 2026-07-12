import { describe, expect, it } from "vitest";
import {
  evaluateEntityRelation,
  type EntityRelationSignal,
} from "./entity-relations";

const OWNER = "guest:synthetic";
const NOW = "2026-08-01T10:00:00.000Z";

function explicitSignal(): EntityRelationSignal {
  return {
    ownerScope: OWNER,
    source: { id: "document-a", ownerScope: OWNER, entityType: "DOCUMENT" },
    target: { id: "document-b", ownerScope: OWNER, entityType: "DOCUMENT" },
    relationType: "POSSIBLY_RELATED",
    basis: "EXPLICIT_REFERENCE",
    matchingKeys: ["EXPEDIENT_NUMBER"],
    provenanceEntityIds: ["reference-a", "reference-b"],
    algorithm: { id: "fiscal-relations", version: 1 },
    createdAt: NOW,
  };
}

function exactSignal(): EntityRelationSignal {
  return {
    ...explicitSignal(),
    source: { id: "file-a", ownerScope: OWNER, entityType: "FILE" },
    target: { id: "file-b", ownerScope: OWNER, entityType: "FILE" },
    relationType: "EXACT_FILE_DUPLICATE",
    basis: "EXACT_FILE_HASH",
    matchingKeys: ["FILE_SHA256"],
    provenanceEntityIds: ["file-a", "file-b"],
    exactIdentity: {
      sourceSha256: "a".repeat(64),
      targetSha256: "a".repeat(64),
      sourceImmutableOriginal: true,
      targetImmutableOriginal: true,
    },
  };
}

describe("fiscal notification entity relation evaluation", () => {
  it("confirms only exact file identity and does not expose the hash", () => {
    const input = exactSignal();
    const before = structuredClone(input);
    const result = evaluateEntityRelation(input);

    expect(input).toEqual(before);
    expect(result).toMatchObject({
      relationType: "EXACT_FILE_DUPLICATE",
      status: "SYSTEM_CONFIRMED_EXACT",
      confidenceBand: "EXACT",
      requiresHumanReview: false,
    });
    expect(JSON.stringify(result)).not.toContain("a".repeat(64));
    expect(result.provenance).toMatchObject({
      basis: "EXACT_FILE_HASH",
      matchingKeys: ["FILE_SHA256"],
      entityIds: ["file-a", "file-b"],
      algorithmId: "fiscal-relations",
      algorithmVersion: 1,
      createdAt: NOW,
    });
  });

  it("keeps explicit identifiers suggested even with exact matching values", () => {
    expect(evaluateEntityRelation(explicitSignal())).toMatchObject({
      relationType: "POSSIBLY_RELATED",
      status: "SUGGESTED",
      confidenceBand: "HIGH",
      requiresHumanReview: true,
    });
  });

  it("fails closed for cross-owner, self, inactive and human-only relations", () => {
    expect(() =>
      evaluateEntityRelation({
        ...explicitSignal(),
        target: {
          ...explicitSignal().target,
          ownerScope: "guest:foreign",
        },
      }),
    ).toThrow(
      "FISCAL_NOTIFICATIONS_OWNER_SCOPE_MISMATCH",
    );

    expect(() =>
      evaluateEntityRelation({
        ...explicitSignal(),
        target: { ...explicitSignal().source },
      }),
    ).toThrow(
      "FISCAL_NOTIFICATIONS_RELATION_SELF_REFERENCE",
    );

    expect(() =>
      evaluateEntityRelation({
        ...explicitSignal(),
        relationType: "SEIZURE_FOR_DEBT",
      }),
    ).toThrow("FISCAL_NOTIFICATIONS_RELATION_NOT_ACTIVE");
    expect(() =>
      evaluateEntityRelation({
        ...explicitSignal(),
        relationType: "USER_CONFIRMED_RELATION",
      }),
    ).toThrow("FISCAL_NOTIFICATIONS_RELATION_REQUIRES_HUMAN_ACTION");
  });

  it("rejects unequal hashes, missing provenance and non-canonical time", () => {
    expect(() =>
      evaluateEntityRelation({
        ...exactSignal(),
        exactIdentity: {
          sourceSha256: "a".repeat(64),
          targetSha256: "b".repeat(64),
          sourceImmutableOriginal: true,
          targetImmutableOriginal: true,
        },
      }),
    ).toThrow(
      "FISCAL_NOTIFICATIONS_EXACT_RELATION_BASIS_REQUIRED",
    );
    expect(() =>
      evaluateEntityRelation({
        ...exactSignal(),
        source: { id: "document-a", ownerScope: OWNER, entityType: "DOCUMENT" },
        target: { id: "document-b", ownerScope: OWNER, entityType: "DOCUMENT" },
        provenanceEntityIds: ["document-a", "document-b"],
      }),
    ).toThrow("FISCAL_NOTIFICATIONS_EXACT_RELATION_BASIS_REQUIRED");
    expect(() =>
      evaluateEntityRelation({
        ...exactSignal(),
        provenanceEntityIds: ["file-a", "unrelated-file"],
      }),
    ).toThrow("FISCAL_NOTIFICATIONS_EXACT_RELATION_BASIS_REQUIRED");
    expect(() =>
      evaluateEntityRelation({
        ...explicitSignal(),
        provenanceEntityIds: ["reference-a"],
      }),
    ).toThrow("FISCAL_NOTIFICATIONS_RELATION_PROVENANCE_REQUIRED");
    expect(() =>
      evaluateEntityRelation({
        ...explicitSignal(),
        createdAt: "2026-08-01T10:00:00Z",
      }),
    ).toThrow("FISCAL_NOTIFICATIONS_INVALID_RELATION_SIGNAL");
  });

  it("rejects unknown keys and accessors without evaluating them", () => {
    expect(() =>
      evaluateEntityRelation({
        ...explicitSignal(),
        taxId: "synthetic-marker",
      } as EntityRelationSignal),
    ).toThrow("FISCAL_NOTIFICATIONS_INVALID_RELATION_SIGNAL");

    let getterCalls = 0;
    const hostile = explicitSignal() as unknown as Record<string, unknown>;
    Object.defineProperty(hostile, "matchingKeys", {
      enumerable: true,
      get() {
        getterCalls += 1;
        return ["EXPEDIENT_NUMBER"];
      },
    });
    expect(() =>
      evaluateEntityRelation(hostile as unknown as EntityRelationSignal),
    ).toThrow("FISCAL_NOTIFICATIONS_INVALID_RELATION_SIGNAL");
    expect(getterCalls).toBe(0);
  });

  it("keeps explicit parent and reference provenance keys coherent", () => {
    expect(() =>
      evaluateEntityRelation({
        ...explicitSignal(),
        basis: "EXPLICIT_PARENT_ID",
      }),
    ).toThrow("FISCAL_NOTIFICATIONS_INVALID_RELATION_BASIS");
    expect(() =>
      evaluateEntityRelation({
        ...explicitSignal(),
        matchingKeys: ["PARENT_ID"],
      }),
    ).toThrow("FISCAL_NOTIFICATIONS_INVALID_RELATION_BASIS");
    expect(
      evaluateEntityRelation({
        ...explicitSignal(),
        basis: "EXPLICIT_PARENT_ID",
        matchingKeys: ["PARENT_ID"],
      }),
    ).toMatchObject({ status: "SUGGESTED", requiresHumanReview: true });
  });

  it("returns isolated immutable outputs", () => {
    const input = explicitSignal();
    const first = evaluateEntityRelation(input);
    expect(Object.isFrozen(first)).toBe(true);
    expect(Object.isFrozen(first.source)).toBe(true);
    expect(Object.isFrozen(first.provenance)).toBe(true);
    expect(Object.isFrozen(first.provenance.matchingKeys)).toBe(true);

    const second = evaluateEntityRelation(explicitSignal());
    expect(second.provenance.matchingKeys).toEqual(["EXPEDIENT_NUMBER"]);
    expect(second.provenance.entityIds).toEqual(["reference-a", "reference-b"]);
  });
});
