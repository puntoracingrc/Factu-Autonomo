import { describe, expect, it } from "vitest";
import {
  buildStorageCorruptionRecoveryPlan,
  classifyStoredAppDataParseResult,
  summarizeStorageCorruptionRecoveryPlan,
} from "./storage-corruption-recovery";

// PHASE2E7_CORRUPTION_PARSE_RECOVERY_CLASSIFIER_V1

describe("storage corruption recovery classifier", () => {
  it("blocks invalid JSON without applying repairs", () => {
    const classification = classifyStoredAppDataParseResult({ raw: "{" });

    expect(classification.case).toBe("invalid_json");
    expect(classification.decision).toBe("blocked_corrupted");
    expect(classification.applyAllowed).toBe(false);
  });

  it("routes legacy and partial shapes to review or preview only", () => {
    expect(classifyStoredAppDataParseResult({ value: { invoices: [] } }).decision).toBe("manual_review_required");
    expect(
      classifyStoredAppDataParseResult({ value: { documents: [], customers: [], products: [] } }).decision,
    ).toBe("recoverable_preview_only");
  });

  it("builds a safe recovery plan", () => {
    const plan = buildStorageCorruptionRecoveryPlan(
      classifyStoredAppDataParseResult({ value: { manifestVersion: "1" } }),
    );

    expect(plan.applyAllowed).toBe(false);
    expect(summarizeStorageCorruptionRecoveryPlan(plan).safe).toBe(true);
  });
});
