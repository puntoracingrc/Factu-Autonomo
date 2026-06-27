import { describe, expect, it } from "vitest";
import {
  runLocalDataBackupValidationPipeline,
  summarizeLocalDataBackupValidationPipeline,
} from "./backup-validation-pipeline";
import type { LocalDataSafetyAppData } from "./types";

// PHASE2D12_BACKUP_VALIDATION_PIPELINE_V1

function currentData(): LocalDataSafetyAppData {
  return {
    documents: [
      {
        id: "SYNTHETIC_ONLY_issued_1",
        status: "emitida",
        documentLifecycle: "issued",
        integrityLock: "locked",
        snapshotHash: "snapshot:current",
      },
    ],
    counters: { invoice: 5 },
  };
}

function incomingData(): LocalDataSafetyAppData {
  return {
    documents: [
      {
        id: "SYNTHETIC_ONLY_draft_1",
        status: "borrador",
        documentLifecycle: "draft",
        integrityLock: "unlocked",
      },
    ],
    counters: { invoice: 5 },
  };
}

describe("backup validation pipeline", () => {
  it("runs the full dry-run pipeline for a valid synthetic backup", () => {
    const result = runLocalDataBackupValidationPipeline(
      currentData(),
      {
        fileName: "backup.json",
        mimeType: "application/json",
        byteLength: 1000,
        parsedObject: incomingData(),
      },
      { validatedAt: "2026-06-27T00:00:00.000Z" },
    );

    expect(result.status).toBe("valid");
    expect(result.stoppedAt).toBe("completed");
    expect(result.manifest?.totals.documents).toBe(1);
    expect(result.integrityDigest?.algorithm).toBe("sha256");
    expect(result.importPlan?.dryRun).toBe(true);
    expect(result.recoverySnapshot?.integrityDigestPresent).toBe(true);
    expect(result.safeReport?.safe).toBe(true);
  });

  it("stops on invalid intake", () => {
    const result = runLocalDataBackupValidationPipeline(currentData(), {
      fileName: "backup.pdf",
      mimeType: "application/json",
      byteLength: 1000,
      parsedObject: incomingData(),
    });

    expect(result.status).toBe("invalid");
    expect(result.stoppedAt).toBe("intake");
    expect(result.riskFlags).toContain("backup_intake_rejected");
  });

  it("stops on malformed backup objects", () => {
    const result = runLocalDataBackupValidationPipeline(currentData(), {
      fileName: "backup.json",
      mimeType: "application/json",
      byteLength: 1000,
      parsedObject: JSON.parse('{"documents":[],"constructor":{"bad":true}}') as unknown,
    });

    expect(result.status).toBe("invalid");
    expect(result.stoppedAt).toBe("malformed_hardening");
    expect(result.riskFlags).toContain("backup_malformed");
  });

  it("marks protected overwrites as review risks and does not mutate inputs", () => {
    const current = currentData();
    const incoming: LocalDataSafetyAppData = {
      documents: [
        {
          id: "SYNTHETIC_ONLY_issued_1",
          status: "emitida",
          documentLifecycle: "issued",
          integrityLock: "locked",
          snapshotHash: "snapshot:incoming",
        },
      ],
      counters: { invoice: 9 },
    };
    const beforeCurrent = JSON.stringify(current);
    const beforeIncoming = JSON.stringify(incoming);

    const result = runLocalDataBackupValidationPipeline(current, {
      fileName: "backup.json",
      mimeType: "application/json",
      byteLength: 1000,
      parsedObject: incoming,
    });

    expect(result.status).toBe("valid");
    expect(result.importPlan?.totals.rejectedProtected).toBe(1);
    expect(result.riskFlags).toContain("incoming_would_overwrite_protected");
    expect(result.riskFlags).toContain("incoming_counter_change");
    expect(JSON.stringify(current)).toBe(beforeCurrent);
    expect(JSON.stringify(incoming)).toBe(beforeIncoming);
  });

  it("returns a safe summary without full content", () => {
    const result = runLocalDataBackupValidationPipeline(currentData(), {
      fileName: "backup.json",
      mimeType: "application/json",
      byteLength: 1000,
      parsedObject: incomingData(),
    });
    const summary = summarizeLocalDataBackupValidationPipeline(result);

    expect(summary.safeReportPresent).toBe(true);
    expect(JSON.stringify(summary)).not.toContain("SYNTHETIC_ONLY_draft_1");
  });
});
