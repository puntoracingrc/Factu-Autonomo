import { describe, expect, it } from "vitest";
import { buildLocalDataBackupIntegrityDigest } from "./backup-integrity";
import { buildLocalDataBackupManifest } from "./backup-manifest";
import { buildLocalDataSafetyReport, redactLocalDataSafetyReport } from "./local-data-safety-report";
import { createInMemoryLocalDataSafetyAuditSink } from "./local-data-safety-audit";
import type { LocalDataSafetyAppData } from "./types";

// PHASE2D7_LOCAL_DATA_SAFETY_REPORT_V1

describe("local data safety report", () => {
  it("builds a safe aggregated report", () => {
    const appData: LocalDataSafetyAppData = {
      documents: [
        {
          id: "SYNTHETIC_ONLY_issued_1",
          status: "emitida",
          documentLifecycle: "issued",
          integrityLock: "locked",
          documentSnapshot: { lines: ["must not leak"] },
        },
      ],
    };
    const manifest = buildLocalDataBackupManifest(appData, {
      generatedAt: "2026-06-27T00:00:00.000Z",
      source: "test_fixture",
    });
    const digest = buildLocalDataBackupIntegrityDigest(
      appData,
      "2026-06-27T00:00:00.000Z",
    );
    const audit = createInMemoryLocalDataSafetyAuditSink();
    audit.record({
      eventType: "backup_manifest_built",
      riskFlags: manifest.riskFlags,
      details: { documentSnapshot: { lines: ["must not leak"] } },
    });

    const report = buildLocalDataSafetyReport({
      manifest,
      integrityDigest: digest,
      auditEvents: audit.list(),
      generatedAt: "2026-06-27T00:00:00.000Z",
    });

    expect(report.marker).toBe("PHASE2D7_LOCAL_DATA_SAFETY_REPORT_V1");
    expect(report.safe).toBe(true);
    expect(report.audit.totalEvents).toBe(1);
    expect(JSON.stringify(report)).not.toContain("must not leak");
  });

  it("redacts unsafe injected report fields", () => {
    const report = redactLocalDataSafetyReport({
      marker: "PHASE2D7_LOCAL_DATA_SAFETY_REPORT_V1",
      generatedAt: "2026-06-27T00:00:00.000Z",
      integrityDigestPresent: false,
      audit: {
        totalEvents: 0,
        eventTypes: {
          backup_manifest_built: 0,
          backup_integrity_verified: 0,
          import_dry_run_planned: 0,
          import_risk_detected: 0,
          recovery_snapshot_built: 0,
          restore_plan_built: 0,
          restore_blocked: 0,
        },
      },
      riskFlags: [],
      safe: true,
      documentSnapshot: "must redact",
    } as never);

    expect(JSON.stringify(report)).not.toContain("documentSnapshot");
    expect(JSON.stringify(report)).toContain("[redacted]");
  });
});
