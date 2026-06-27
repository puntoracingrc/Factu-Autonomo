import { describe, expect, it } from "vitest";
import {
  buildLocalDataBackupIntegrityDigest,
  buildLocalDataBackupManifest,
  buildLocalDataSafetyReport,
  buildPreImportRecoverySnapshot,
  createInMemoryLocalDataSafetyAuditSink,
  planLocalDataImportDryRun,
  planLocalDataRestore,
  verifyLocalDataBackupIntegrity,
} from "../src/lib/local-data-safety";
import type { LocalDataSafetyAppData } from "../src/lib/local-data-safety";

// PHASE2D9_LOCAL_DATA_BACKUP_RESTORE_SAFETY_ACCEPTANCE_V1

function baselineData(): LocalDataSafetyAppData {
  return {
    documents: [
      {
        id: "SYNTHETIC_ONLY_draft_1",
        kind: "invoice",
        status: "borrador",
        documentLifecycle: "draft",
        integrityLock: "unlocked",
        customerId: "SYNTHETIC_ONLY_customer_1",
      },
      {
        id: "SYNTHETIC_ONLY_issued_1",
        kind: "invoice",
        status: "emitida",
        documentLifecycle: "issued",
        integrityLock: "locked",
        number: "2026-1",
        year: 2026,
        snapshotHash: "snapshot:issued",
        pdfSnapshotHash: "pdf:issued",
      },
    ],
    customers: [{ id: "SYNTHETIC_ONLY_customer_1", name: "Synthetic Customer" }],
    counters: { invoice: 1 },
  };
}

describe("phase 2D.9 local data backup restore safety acceptance", () => {
  it("keeps the whole safety flow as pure planning", () => {
    const current = baselineData();
    const incoming: LocalDataSafetyAppData = {
      documents: [
        {
          id: "SYNTHETIC_ONLY_draft_1",
          kind: "invoice",
          status: "borrador",
          documentLifecycle: "draft",
          integrityLock: "unlocked",
          customerId: "SYNTHETIC_ONLY_customer_2",
        },
        {
          id: "SYNTHETIC_ONLY_issued_1",
          kind: "invoice",
          status: "emitida",
          documentLifecycle: "issued",
          integrityLock: "locked",
          snapshotHash: "snapshot:changed",
        },
      ],
      counters: { invoice: 2 },
    };
    const beforeCurrent = JSON.stringify(current);
    const beforeIncoming = JSON.stringify(incoming);

    const digest = buildLocalDataBackupIntegrityDigest(
      current,
      "2026-06-27T00:00:00.000Z",
    );
    const manifest = buildLocalDataBackupManifest(current, {
      generatedAt: "2026-06-27T00:00:00.000Z",
      source: "test_fixture",
      integrityDigest: digest.value,
    });
    const dryRun = planLocalDataImportDryRun(current, incoming, {
      plannedAt: "2026-06-27T00:00:01.000Z",
    });
    const snapshot = buildPreImportRecoverySnapshot(current, {
      createdAt: "2026-06-27T00:00:02.000Z",
      reason: "test_fixture",
    });
    const restorePlan = planLocalDataRestore(incoming, snapshot, {
      plannedAt: "2026-06-27T00:00:03.000Z",
    });
    const audit = createInMemoryLocalDataSafetyAuditSink();
    audit.record({ eventType: "backup_manifest_built", riskFlags: manifest.riskFlags });
    audit.record({ eventType: "backup_integrity_verified" });
    audit.record({ eventType: "import_dry_run_planned", riskFlags: dryRun.riskFlags });
    audit.record({ eventType: "restore_plan_built", riskFlags: restorePlan.riskFlags });
    const report = buildLocalDataSafetyReport({
      manifest,
      integrityDigest: digest,
      importPlan: dryRun,
      recoverySnapshot: snapshot,
      restorePlan,
      auditEvents: audit.list(),
      generatedAt: "2026-06-27T00:00:04.000Z",
    });

    expect(manifest.totals.protectedDocuments).toBe(1);
    expect(verifyLocalDataBackupIntegrity(current, digest)).toBe(true);
    expect(dryRun.totals.rejectedProtected).toBe(1);
    expect(restorePlan.totals.blockedProtected).toBeGreaterThanOrEqual(1);
    expect(report.safe).toBe(true);
    expect(report.audit.totalEvents).toBe(4);
    expect(JSON.stringify(current)).toBe(beforeCurrent);
    expect(JSON.stringify(incoming)).toBe(beforeIncoming);
  });
});
