import { describe, expect, it } from "vitest";
import { createRelationshipV1, type RelationshipV1 } from "./domain.v1";

function relationship(overrides: Partial<RelationshipV1> = {}): RelationshipV1 {
  return {
    relationshipId: "relation-synthetic-1",
    sourceEntityId: "act-synthetic-1",
    targetEntityId: "debt-synthetic-1",
    relationType: "CREATES_EXPLICIT_DEBT",
    confidenceLevel: "EXACT",
    matchingEvidence: ["reference-synthetic-1"],
    contradictoryEvidence: [],
    ruleId: "relation.exact-reference.v1",
    createdAutomatically: true,
    userConfirmed: false,
    explanation: "La clave de liquidación impresa coincide exactamente.",
    ...overrides,
  };
}

describe("administrative domain relationship v1", () => {
  it("allows automatic relationships only for exact or explicit references", () => {
    expect(createRelationshipV1(relationship()).createdAutomatically).toBe(true);
    expect(createRelationshipV1(relationship({ confidenceLevel: "EXPLICIT_REFERENCE" })).createdAutomatically).toBe(true);
    expect(() => createRelationshipV1(relationship({ confidenceLevel: "HIGHLY_PROBABLE" }))).toThrowError(
      expect.objectContaining({ path: "relationship.createdAutomatically" }),
    );
    expect(createRelationshipV1(relationship({ confidenceLevel: "HIGHLY_PROBABLE", createdAutomatically: false })).userConfirmed).toBe(false);
  });

  it("does not accept amount-only automatic matches or self-relations", () => {
    expect(() => createRelationshipV1(relationship({ matchingEvidence: [] }))).toThrow();
    expect(() => createRelationshipV1(relationship({ targetEntityId: "act-synthetic-1" }))).toThrow();
  });

  it("defensively freezes evidence lists", () => {
    const input = relationship();
    const output = createRelationshipV1(input);
    (input.matchingEvidence as string[])[0] = "changed";
    expect(output.matchingEvidence).toEqual(["reference-synthetic-1"]);
    expect(Object.isFrozen(output.matchingEvidence)).toBe(true);
  });

  it("represents an exact documentary continuation without applying an effect", () => {
    expect(createRelationshipV1(relationship({
      relationType: "CONTINUES",
      ruleId: "seizure-follow-up.explicit-reiteration.v1",
      explanation: "La reiteración cita la diligencia anterior.",
    }))).toMatchObject({
      relationType: "CONTINUES",
      confidenceLevel: "EXACT",
      createdAutomatically: true,
      userConfirmed: false,
    });
  });
});
