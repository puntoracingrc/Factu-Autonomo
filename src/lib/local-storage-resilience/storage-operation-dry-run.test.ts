import { describe, expect, it } from "vitest";
import {
  planLocalStorageResilienceOperation,
  summarizeLocalStorageResilienceOperationPlan,
} from "./storage-operation-dry-run";

// PHASE2E5_STORAGE_OPERATION_DRY_RUN_PLANNER_V1

describe("storage operation dry-run planner", () => {
  it("blocks future writes and requires backup-before-write", () => {
    const plan = planLocalStorageResilienceOperation({
      operation: "write",
      mode: "in_memory",
      key: "SYNTHETIC_ONLY_APP_DATA",
    });

    expect(plan.decision).toBe("blocked");
    expect(plan.backupBeforeWriteRequired).toBe(true);
    expect(plan.blockers).toContain("BACKUP_BEFORE_WRITE_REQUIRED");
    expect(plan.applyAllowed).toBe(false);
  });

  it("allows fake reads only in in-memory mode with synthetic keys", () => {
    expect(
      planLocalStorageResilienceOperation({
        operation: "read",
        mode: "in_memory",
        key: "SYNTHETIC_ONLY_APP_DATA",
      }).decision,
    ).toBe("allowed_in_memory");
    expect(
      planLocalStorageResilienceOperation({
        operation: "read",
        mode: "in_memory",
        key: "real-key",
      }).decision,
    ).toBe("blocked");
  });

  it("summarizes without values", () => {
    const summary = summarizeLocalStorageResilienceOperationPlan(
      planLocalStorageResilienceOperation({ operation: "delete", mode: "disabled" }),
    );

    expect(summary.realStorageTouched).toBe(false);
    expect(summary.dataMutationAllowed).toBe(false);
    expect(JSON.stringify(summary)).not.toContain("value");
  });
});
