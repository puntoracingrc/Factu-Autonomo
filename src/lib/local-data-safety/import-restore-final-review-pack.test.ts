import { describe, expect, it } from "vitest";
import {
  assertImportRestoreFinalReviewPackSafe,
  buildImportRestoreFinalReviewPack,
  redactImportRestoreFinalReviewPack,
  summarizeImportRestoreFinalReviewPack,
} from "./import-restore-final-review-pack";
import { evaluateImportRestoreNoGoConditions } from "./import-restore-no-go-conditions";

// PHASE2D96_IMPORT_RESTORE_UX_LEGAL_DATA_LOSS_FINAL_REVIEW_PACK_V1

describe("PHASE2D96 final review pack", () => {
  it("builds a safe UX/legal/data-loss review pack", () => {
    const pack = buildImportRestoreFinalReviewPack({ generatedAt: "2026-06-27T00:00:00.000Z" });

    expect(pack.rawPayloadIncluded).toBe(false);
    expect(pack.realDataIncluded).toBe(false);
    expect(pack.disabledActions).toContain("apply_restore");
    expect(pack.recommendedHumanDecision).toBe("owner_decision_required");
  });

  it("carries no-go blockers as unresolved review items", () => {
    const noGoRegistry = evaluateImportRestoreNoGoConditions({ routeExists: true });
    const pack = buildImportRestoreFinalReviewPack({ noGoRegistry });

    expect(pack.unresolvedBlockers).toEqual(["route_exists"]);
    expect(summarizeImportRestoreFinalReviewPack(pack).unresolvedBlockers).toBe(1);
  });

  it("redacts and asserts safe material", () => {
    const pack = buildImportRestoreFinalReviewPack();

    expect(redactImportRestoreFinalReviewPack(pack).safe).toBe(true);
    const unsafePack = { ...pack, realDataIncluded: true } as unknown as Parameters<
      typeof assertImportRestoreFinalReviewPackSafe
    >[0];
    expect(() => assertImportRestoreFinalReviewPackSafe(unsafePack)).toThrow();
  });
});
