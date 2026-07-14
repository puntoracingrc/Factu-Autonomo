import { describe, expect, it } from "vitest";
import { BASE_EXTRACTOR_IDS_V1, createEmptyExtractorOutputV1 } from "./extractor-contract.v1";

describe("base extractor contract v1", () => {
  it("defines the sixteen reusable engines requested by the architecture", () => {
    expect(BASE_EXTRACTOR_IDS_V1).toHaveLength(16);
    expect(new Set(BASE_EXTRACTOR_IDS_V1).size).toBe(16);
  });

  it("creates an empty output that cannot look confirmed or materialize actions", () => {
    const first = createEmptyExtractorOutputV1("requirement");
    const second = createEmptyExtractorOutputV1("requirement");
    expect(first).toMatchObject({
      status: "UNKNOWN",
      requiresHumanReview: true,
      materializationPolicy: "PROHIBITED_UNTIL_HUMAN_REVIEW",
      permitsDebtCreation: false,
      permitsDeadlineCreation: false,
      permitsPaymentAction: false,
      permitsAccountingAction: false,
      permitsAutomaticFamilyConfirmation: false,
    });
    expect(first.entities).toEqual([]);
    expect(Object.isFrozen(first)).toBe(true);
    expect(first.entities).not.toBe(second.entities);
  });
});
