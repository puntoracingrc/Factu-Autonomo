import { describe, expect, it } from "vitest";
import {
  APP_ERROR_RECOVERY_CODES,
  normalizeAppErrorRecoveryKind,
} from "./recovery-events";

describe("app error recovery signals", () => {
  it("keeps transient sync recovery separate from fiscal repair", () => {
    expect(APP_ERROR_RECOVERY_CODES.sync_push_verified).toEqual([
      "push_failed",
      "push_preflight_failed",
    ]);
    expect(APP_ERROR_RECOVERY_CODES.sync_cycle_verified).not.toContain(
      "fiscal_workspace_diverged",
    );
    expect(APP_ERROR_RECOVERY_CODES.cloud_repair_verified).toContain(
      "fiscal_workspace_diverged",
    );
    expect(APP_ERROR_RECOVERY_CODES.cloud_repair_verified).not.toContain(
      "legacy_repair_migration_failed",
    );
  });

  it("accepts only the closed one-key envelope", () => {
    expect(
      normalizeAppErrorRecoveryKind({ kind: "sync_cycle_verified" }),
    ).toBe("sync_cycle_verified");
    expect(normalizeAppErrorRecoveryKind({ kind: "unknown" })).toBeNull();
    expect(
      normalizeAppErrorRecoveryKind({
        kind: "sync_cycle_verified",
        userId: "not-accepted",
      }),
    ).toBeNull();
    expect(normalizeAppErrorRecoveryKind("sync_cycle_verified")).toBeNull();
  });
});
