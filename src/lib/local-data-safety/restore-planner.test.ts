import { describe, expect, it } from "vitest";
import { buildPreImportRecoverySnapshot } from "./recovery-snapshot";
import { planLocalDataRestore, summarizeLocalDataRestorePlan } from "./restore-planner";
import type { LocalDataSafetyAppData } from "./types";

// PHASE2D6_RESTORE_PLANNER_DOCUMENT_PROTECTION_V1

describe("local data restore planner", () => {
  it("plans draft restores from snapshot", () => {
    const snapshotData: LocalDataSafetyAppData = {
      documents: [
        {
          id: "SYNTHETIC_ONLY_draft_1",
          status: "borrador",
          documentLifecycle: "draft",
          integrityLock: "unlocked",
          customerId: "before",
        },
      ],
    };
    const snapshot = buildPreImportRecoverySnapshot(snapshotData, {
      createdAt: "2026-06-27T00:00:00.000Z",
      reason: "test_fixture",
    });
    const currentData: LocalDataSafetyAppData = {
      documents: [
        {
          id: "SYNTHETIC_ONLY_draft_1",
          status: "borrador",
          documentLifecycle: "draft",
          integrityLock: "unlocked",
          customerId: "after",
        },
      ],
    };

    const plan = planLocalDataRestore(currentData, snapshot, {
      plannedAt: "2026-06-27T00:00:01.000Z",
    });

    expect(plan.dryRun).toBe(true);
    expect(plan.totals.draftRestores).toBe(1);
    expect(summarizeLocalDataRestorePlan(plan).totals.draftRestores).toBe(1);
  });

  it("blocks protected current document changes", () => {
    const snapshot = buildPreImportRecoverySnapshot(
      {
        documents: [
          {
            id: "SYNTHETIC_ONLY_issued_1",
            status: "emitida",
            documentLifecycle: "issued",
            integrityLock: "locked",
            snapshotHash: "snapshot:old",
          },
        ],
      },
      { createdAt: "2026-06-27T00:00:00.000Z", reason: "test_fixture" },
    );
    const current: LocalDataSafetyAppData = {
      documents: [
        {
          id: "SYNTHETIC_ONLY_issued_1",
          status: "emitida",
          documentLifecycle: "issued",
          integrityLock: "locked",
          snapshotHash: "snapshot:new",
        },
      ],
    };

    const plan = planLocalDataRestore(current, snapshot);

    expect(plan.totals.blockedProtected).toBe(1);
    expect(plan.riskFlags).toContain("restore_would_change_protected");
  });
});
