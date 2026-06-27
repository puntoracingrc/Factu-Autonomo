import { describe, expect, it } from "vitest";
import { planLocalDataImportDryRun, summarizeLocalDataImportDryRun } from "./import-dry-run";
import type { LocalDataSafetyAppData } from "./types";

// PHASE2D4_IMPORT_DRY_RUN_PLANNER_V1

describe("local data import dry-run planner", () => {
  it("plans additions and draft updates without mutating inputs", () => {
    const current: LocalDataSafetyAppData = {
      documents: [
        {
          id: "SYNTHETIC_ONLY_draft_1",
          status: "borrador",
          documentLifecycle: "draft",
          integrityLock: "unlocked",
        },
      ],
    };
    const incoming: LocalDataSafetyAppData = {
      documents: [
        {
          id: "SYNTHETIC_ONLY_draft_1",
          status: "borrador",
          documentLifecycle: "draft",
          integrityLock: "unlocked",
          customerId: "SYNTHETIC_ONLY_customer_changed",
        },
        {
          id: "SYNTHETIC_ONLY_new_1",
          status: "borrador",
          documentLifecycle: "draft",
          integrityLock: "unlocked",
        },
      ],
    };
    const beforeCurrent = JSON.stringify(current);
    const beforeIncoming = JSON.stringify(incoming);

    const plan = planLocalDataImportDryRun(current, incoming, {
      plannedAt: "2026-06-27T00:00:00.000Z",
    });

    expect(plan.dryRun).toBe(true);
    expect(plan.totals.additions).toBe(1);
    expect(plan.totals.draftUpdates).toBe(1);
    expect(JSON.stringify(current)).toBe(beforeCurrent);
    expect(JSON.stringify(incoming)).toBe(beforeIncoming);

    const summary = summarizeLocalDataImportDryRun(plan);
    expect(summary.totals.incomingDocuments).toBe(2);
  });

  it("rejects protected overwrites and flags hash mismatches", () => {
    const current: LocalDataSafetyAppData = {
      documents: [
        {
          id: "SYNTHETIC_ONLY_issued_1",
          status: "emitida",
          documentLifecycle: "issued",
          integrityLock: "locked",
          snapshotHash: "snapshot:old",
        },
        {
          id: "SYNTHETIC_ONLY_draft_2",
          status: "borrador",
          documentLifecycle: "draft",
          integrityLock: "unlocked",
          snapshotHash: "snapshot:old",
        },
      ],
    };
    const incoming: LocalDataSafetyAppData = {
      documents: [
        {
          id: "SYNTHETIC_ONLY_issued_1",
          status: "emitida",
          documentLifecycle: "issued",
          integrityLock: "locked",
          snapshotHash: "snapshot:new",
        },
        {
          id: "SYNTHETIC_ONLY_draft_2",
          status: "borrador",
          documentLifecycle: "draft",
          integrityLock: "unlocked",
          snapshotHash: "snapshot:new",
        },
      ],
    };

    const plan = planLocalDataImportDryRun(current, incoming);

    expect(plan.totals.rejectedProtected).toBe(1);
    expect(plan.totals.manualReview).toBe(1);
    expect(plan.riskFlags).toContain("incoming_would_overwrite_protected");
    expect(plan.riskFlags).toContain("incoming_snapshot_hash_mismatch");
  });
});
