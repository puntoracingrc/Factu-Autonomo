import { describe, expect, it } from "vitest";
import { evaluateBackupBeforeWritePolicy } from "./backup-before-write-policy";
import { createDisabledLocalStorageResilienceAdapter } from "./storage-adapter-contract";
import {
  assertLocalStorageResilienceSafeReportSafe,
  buildLocalStorageResilienceSafeReport,
  redactLocalStorageResilienceSafeReport,
} from "./storage-safe-report";
import { planLocalStorageResilienceOperation } from "./storage-operation-dry-run";

// PHASE2E8_STORAGE_RESILIENCE_SAFE_REPORT_V1

describe("storage safe report", () => {
  it("builds a payload-free report", () => {
    const report = buildLocalStorageResilienceSafeReport({
      adapterSummary: createDisabledLocalStorageResilienceAdapter().summary(),
      operationPlans: [planLocalStorageResilienceOperation({ operation: "write", mode: "in_memory" })],
      backupPolicy: evaluateBackupBeforeWritePolicy(),
    });

    expect(report.containsPayload).toBe(false);
    expect(report.dataMutationAllowed).toBe(false);
    expect(assertLocalStorageResilienceSafeReportSafe(report)).toBe(true);
    expect(JSON.stringify(report)).not.toContain("secret");
  });

  it("redacts and preserves safety invariants", () => {
    const report = buildLocalStorageResilienceSafeReport({
      adapterSummary: createDisabledLocalStorageResilienceAdapter().summary(),
    });

    expect(redactLocalStorageResilienceSafeReport(report).safe).toBe(true);
  });
});
