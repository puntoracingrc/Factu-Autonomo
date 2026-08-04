import { describe, expect, it } from "vitest";
import {
  buildBackupBeforeWriteRequirements,
  evaluateBackupBeforeWritePolicy,
  summarizeBackupBeforeWritePolicy,
} from "./backup-before-write-policy";

// PHASE2E6_BACKUP_BEFORE_WRITE_POLICY_V1

describe("backup-before-write policy", () => {
  it("defaults every confirmation to false and blocks writes", () => {
    const result = evaluateBackupBeforeWritePolicy();

    expect(result.confirmations.humanConfirmation).toBe(false);
    expect(result.missingRequirements).toEqual([...buildBackupBeforeWriteRequirements()].sort());
    expect(result.writeAllowed).toBe(false);
    expect(result.dataMutationAllowed).toBe(false);
  });

  it("can be ready for review while still not authorizing writes", () => {
    const result = evaluateBackupBeforeWritePolicy({
      hasCurrentDataManifest: true,
      hasCurrentDataDigest: true,
      hasRecoverySnapshot: true,
      hasHumanConfirmation: true,
      hasDryRunReport: true,
    });

    expect(result.ready).toBe(true);
    expect(result.writeAllowed).toBe(false);
    expect(summarizeBackupBeforeWritePolicy(result).safe).toBe(true);
  });
});
