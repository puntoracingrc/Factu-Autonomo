import { describe, expect, it, vi } from "vitest";
import type {
  AppDataDurabilityResult,
  AppDataTransition,
} from "../app-data-durability";
import { EMPTY_DATA, type AppData } from "../types";
import {
  runRepairFiscalNotificationEmptyHistoryCommandV1,
  type DurableFiscalNotificationEmptyHistoryRepairResultV1,
} from "./empty-history-repair.v1";
import { encodeFiscalNotificationsWorkspaceForStorageV2 } from "./workspace-storage-envelope.v2";

const OWNER = "user:00000000-0000-4000-8000-000000000619";
const REPAIRED_AT = "2026-07-16T17:45:00.000Z";

type Commit = <T>(
  expected: AppData,
  build: (previous: AppData) => AppDataTransition<T>,
) => AppDataDurabilityResult<T>;

describe("fiscal notification empty history durable repair v1", () => {
  it("crea un workspace vacío neutral y elimina solo la cuarentena fiscal exacta", () => {
    const expected = dataWithQuarantine();
    const before = structuredClone(expected);
    const commit = applyingCommit();

    const result = runRepairFiscalNotificationEmptyHistoryCommandV1({
      expected,
      ownerScope: OWNER,
      confirmedAt: REPAIRED_AT,
      commit,
    });

    expect(result.status).toBe("applied");
    if (result.status !== "applied") return;
    expect(result.value).toMatchObject({
      status: "APPLIED",
      removedQuarantineCount: 2,
      historyState: "EMPTY_REVIEW_NEUTRAL",
      materializationPolicy: "PROHIBITED_UNTIL_REVIEW",
    });
    expect(result.value.workspace).toEqual({
      schemaVersion: 1,
      workspaceId: "fiscal-notifications-workspace-v1",
      ownerScope: OWNER,
      revision: 0,
      createdAt: REPAIRED_AT,
      updatedAt: REPAIRED_AT,
      packages: [],
      files: [],
      documents: [],
      parts: [],
      authorities: [],
      references: [],
      evidence: [],
      debts: [],
      debtObservations: [],
      cases: [],
      relations: [],
      analysisSnapshots: [],
      paymentOptions: [],
      paymentPlans: [],
      installments: [],
      interestCalculations: [],
      deadlineRules: [],
      obligations: [],
      timeline: [],
      accountingDrafts: [],
      auditEvents: [],
      driveArchives: [],
    });
    expect(result.data.fiscalNotificationsWorkspace).toEqual(
      result.value.workspace,
    );
    expect(
      encodeFiscalNotificationsWorkspaceForStorageV2(result.value.workspace)
        ?.transition,
    ).toEqual({
      kind: "AUTO_REPAIRED_EMPTY_HISTORY_V1",
      ownerScope: OWNER,
      repairedAt: REPAIRED_AT,
    });
    expect(result.data.workspaceIntegrityQuarantine).toEqual([
      expect.objectContaining({ collection: "customers" }),
      expect.objectContaining({
        collection: "meta.pendingChanges.fiscal_notifications_workspace",
      }),
    ]);
    expect(expected).toEqual(before);
    expect(commit).toHaveBeenCalledTimes(1);
  });

  it("bloquea workspace presente, ausencia de cuarentena e inputs inválidos", () => {
    const commit = vi.fn() as unknown as Commit;
    const withWorkspace = dataWithQuarantine();
    withWorkspace.fiscalNotificationsWorkspace = canonicalWorkspace();

    expect(run(withWorkspace, commit)).toEqual({
      status: "blocked",
      reason: "workspace_present",
    });
    expect(run(structuredClone(EMPTY_DATA), commit)).toEqual({
      status: "blocked",
      reason: "fiscal_quarantine_not_found",
    });
    const withPending = dataWithQuarantine();
    withPending.meta = {
      lastModified: REPAIRED_AT,
      pendingChanges: [
        {
          entityType: "fiscal_notifications_workspace",
          entityId: "fiscal-notifications-workspace-v2",
          deleted: false,
          payload: {},
          updatedAt: REPAIRED_AT,
        },
      ],
    };
    expect(run(withPending, commit)).toEqual({
      status: "blocked",
      reason: "unsynced_workspace",
    });
    expect(
      runRepairFiscalNotificationEmptyHistoryCommandV1({
        expected: dataWithQuarantine(),
        ownerScope: " user:invalid",
        confirmedAt: REPAIRED_AT,
        commit,
      }),
    ).toEqual({ status: "blocked", reason: "invalid_input" });
    expect(
      runRepairFiscalNotificationEmptyHistoryCommandV1({
        expected: dataWithQuarantine(),
        ownerScope: OWNER,
        confirmedAt: "2026-07-16",
        commit,
      }),
    ).toEqual({ status: "blocked", reason: "invalid_input" });
    expect(commit).not.toHaveBeenCalled();
  });

  it("propaga el fallo durable sin mutar ni limpiar el estado esperado", () => {
    const expected = dataWithQuarantine();
    const before = structuredClone(expected);
    const commit = vi.fn(() => ({
      status: "blocked" as const,
      reason: "write_failed" as const,
    })) as unknown as Commit;

    const result = run(expected, commit);

    expect(result).toEqual({ status: "blocked", reason: "write_failed" });
    expect(expected).toEqual(before);
    expect(commit).toHaveBeenCalledTimes(1);
  });

  it("no reinicia una cuarentena fiscal ajena al marcador privado conocido", () => {
    const commit = vi.fn() as unknown as Commit;
    const malformed = dataWithQuarantine();
    malformed.workspaceIntegrityQuarantine = [
      {
        collection: "fiscalNotificationsWorkspace",
        reason: "malformed_record",
        rawValue: { documents: ["contenido-no-inspeccionable"] },
      },
    ];

    expect(run(malformed, commit)).toEqual({
      status: "blocked",
      reason: "fiscal_quarantine_not_auto_repairable",
    });
    expect(commit).not.toHaveBeenCalled();
  });
});

function run(
  expected: AppData,
  commit: Commit,
): DurableFiscalNotificationEmptyHistoryRepairResultV1 {
  return runRepairFiscalNotificationEmptyHistoryCommandV1({
    expected,
    ownerScope: OWNER,
    confirmedAt: REPAIRED_AT,
    commit,
  });
}

function applyingCommit(): Commit & ReturnType<typeof vi.fn> {
  return vi.fn(<T>(
    expected: AppData,
    build: (previous: AppData) => AppDataTransition<T>,
  ) => {
    const transition = build(expected);
    return {
      status: "applied" as const,
      data: transition.data,
      value: transition.value,
      replayed: false,
    };
  }) as Commit & ReturnType<typeof vi.fn>;
}

function dataWithQuarantine(): AppData {
  return {
    ...structuredClone(EMPTY_DATA),
    workspaceIntegrityQuarantine: [
      {
        collection: "customers",
        reason: "malformed_record",
        rawValue: { retained: true },
      },
      {
        collection: "fiscalNotificationsWorkspace",
        reason: "malformed_record",
        rawValue: rejectedFiscalPayload(),
      },
      {
        collection: "meta.pendingChanges.fiscal_notifications_workspace",
        reason: "malformed_record",
        rawValue: { retained: "pending" },
      },
      {
        collection: "fiscalNotificationsWorkspace",
        reason: "malformed_collection",
        rawValue: rejectedFiscalPayload(),
      },
    ],
  };
}

function rejectedFiscalPayload() {
  return {
    status: "rejected",
    schema: "fiscal-notifications-privacy-workspace-v2",
  };
}

function canonicalWorkspace() {
  return {
    schemaVersion: 1 as const,
    workspaceId: "fiscal-notifications-workspace-v1",
    ownerScope: OWNER,
    revision: 0,
    createdAt: REPAIRED_AT,
    updatedAt: REPAIRED_AT,
    packages: [],
    files: [],
    documents: [],
    parts: [],
    authorities: [],
    references: [],
    evidence: [],
    debts: [],
    debtObservations: [],
    cases: [],
    relations: [],
    analysisSnapshots: [],
    paymentOptions: [],
    paymentPlans: [],
    installments: [],
    interestCalculations: [],
    deadlineRules: [],
    obligations: [],
    timeline: [],
    accountingDrafts: [],
    auditEvents: [],
    driveArchives: [],
  };
}
