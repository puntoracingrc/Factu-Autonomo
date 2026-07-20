import { beforeEach, describe, expect, it, vi } from "vitest";
import type {
  AppDataDurabilityResult,
  AppDataTransition,
} from "../app-data-durability";
import { EMPTY_DATA, type AppData } from "../types";
import type { FiscalNotificationsWorkspace } from "./types";

const { deleteMock, transitionMock } = vi.hoisted(() => ({
  deleteMock: vi.fn(),
  transitionMock: vi.fn(),
}));

vi.mock("./document-deletion.v1", async (importOriginal) => ({
  ...(await importOriginal<typeof import("./document-deletion.v1")>()),
  deleteFiscalNotificationDocumentV1: deleteMock,
}));

vi.mock("./workspace-storage-envelope.v2", async (importOriginal) => ({
  ...(await importOriginal<typeof import("./workspace-storage-envelope.v2")>()),
  registerFiscalNotificationDocumentReductionTransitionV2: transitionMock,
}));

import { runDeleteFiscalNotificationDocumentCommandV1 } from "./document-deletion-command.v1";

const OWNER = "user:00000000-0000-4000-8000-000000000161";
const DELETED_AT = "2026-07-15T22:30:00.000Z";
type Commit = <T>(
  expected: AppData,
  build: (previous: AppData) => AppDataTransition<T>,
) => AppDataDurabilityResult<T>;

describe("durable fiscal notification document deletion command v1", () => {
  beforeEach(() => {
    deleteMock.mockReset();
    transitionMock.mockReset();
    transitionMock.mockImplementation((workspace) => workspace);
  });

  it("no intenta persistir cuando el dominio bloquea la eliminación", () => {
    deleteMock.mockReturnValue({
      status: "BLOCKED",
      reason: "OPERATIONAL_DEPENDENCIES",
    });
    const commit = vi.fn();

    expect(
      runDeleteFiscalNotificationDocumentCommandV1(
        input(commit as unknown as Commit),
      ),
    ).toEqual({ status: "BLOCKED", reason: "OPERATIONAL_DEPENDENCIES" });
    expect(commit).not.toHaveBeenCalled();
  });

  it("permite borrar localmente aunque la cabeza fiscal siga pendiente de sincronizar", () => {
    const expected: AppData = {
      ...structuredClone(EMPTY_DATA),
      meta: {
        lastModified: DELETED_AT,
        pendingChanges: [
          {
            entityType: "fiscal_notifications_workspace",
            entityId: "fiscal-notifications-workspace-v1",
            deleted: false,
            payload: {},
            updatedAt: DELETED_AT,
          },
          {
            entityType: "fiscal_notifications_workspace",
            entityId: "fiscal-notifications-workspace-v2",
            deleted: false,
            payload: {},
            updatedAt: DELETED_AT,
          },
          {
            entityType: "fiscal_notifications_workspace",
            entityId: "fiscal-notifications-workspace-unrelated",
            deleted: false,
            payload: { marker: "retained" },
            updatedAt: DELETED_AT,
          },
          {
            entityType: "expense",
            entityId: "expense:retained",
            deleted: false,
            payload: { id: "expense:retained" },
            updatedAt: DELETED_AT,
          },
        ],
      },
    };
    deleteMock.mockReturnValue({
      status: "APPLIED",
      workspace: emptyWorkspace(),
      removedDocumentId: "document:161",
      removedRelationCount: 0,
      driveFileIdsPreserved: [],
      drivePolicy: "PRESERVE_USER_DRIVE_ORIGINAL",
    });
    const commit = applyingCommit();

    const result = runDeleteFiscalNotificationDocumentCommandV1(
      input(commit, expected),
    );

    expect(result.status).toBe("applied");
    expect(deleteMock).toHaveBeenCalledTimes(1);
    if (result.status !== "applied") return;
    expect(result.data.meta?.pendingChanges).toEqual([
      expect.objectContaining({
        entityType: "fiscal_notifications_workspace",
        entityId: "fiscal-notifications-workspace-unrelated",
      }),
      expect.objectContaining({
        entityType: "expense",
        entityId: "expense:retained",
      }),
    ]);
  });

  it("bloquea antes del commit si no puede registrar la reducción", () => {
    deleteMock.mockReturnValue({
      status: "APPLIED",
      workspace: emptyWorkspace(),
      removedDocumentId: "document:161",
      removedRelationCount: 0,
      driveFileIdsPreserved: [],
      drivePolicy: "PRESERVE_USER_DRIVE_ORIGINAL",
    });
    transitionMock.mockReturnValue(null);
    const commit = vi.fn();

    expect(
      runDeleteFiscalNotificationDocumentCommandV1(
        input(commit as unknown as Commit),
      ),
    ).toEqual({ status: "BLOCKED", reason: "RESULT_INVALID" });
    expect(commit).not.toHaveBeenCalled();
  });

  it("entrega una única transición completa al commit durable", () => {
    const expected: AppData = {
      ...structuredClone(EMPTY_DATA),
      workspaceIntegrityQuarantine: [
        {
          collection: "fiscalNotificationsWorkspace",
          reason: "malformed_record",
          rawValue: { stale: true },
        },
        {
          collection: "customers",
          reason: "malformed_record",
          rawValue: { retained: true },
        },
      ],
    };
    const before = structuredClone(expected);
    const workspace = emptyWorkspace();
    deleteMock.mockReturnValue({
      status: "APPLIED",
      workspace,
      removedDocumentId: "document:161",
      removedRelationCount: 2,
      driveFileIdsPreserved: ["drive_file_preserved_161"],
      drivePolicy: "PRESERVE_USER_DRIVE_ORIGINAL",
    });
    const commitSpy = vi.fn();
    const commit: Commit = <T>(
      baseline: AppData,
      build: (previous: AppData) => AppDataTransition<T>,
    ) => {
      commitSpy();
      const transition = build(baseline);
      return {
        status: "applied" as const,
        data: transition.data,
        value: transition.value,
        replayed: false,
      };
    };

    const result = runDeleteFiscalNotificationDocumentCommandV1(
      input(commit, expected),
    );

    expect(commitSpy).toHaveBeenCalledTimes(1);
    expect(result.status).toBe("applied");
    if (result.status !== "applied") return;
    expect(result.data.fiscalNotificationsWorkspace).toBe(workspace);
    expect(result.data.workspaceIntegrityQuarantine).toEqual([
      expect.objectContaining({ collection: "customers" }),
    ]);
    expect(result.value).toEqual(
      expect.objectContaining({
        drivePolicy: "PRESERVE_USER_DRIVE_ORIGINAL",
        driveFileIdsPreserved: ["drive_file_preserved_161"],
      }),
    );
    expect(expected).toEqual(before);
  });

  it("conserva toda la cuarentena cuando todavía quedan documentos", () => {
    const expected: AppData = {
      ...structuredClone(EMPTY_DATA),
      workspaceIntegrityQuarantine: [
        {
          collection: "fiscalNotificationsWorkspace",
          reason: "malformed_record",
          rawValue: { retainedWhileNonEmpty: true },
        },
      ],
    };
    const workspace = {
      ...emptyWorkspace(),
      documents: [
        {
          id: "document:remaining",
        } as FiscalNotificationsWorkspace["documents"][number],
      ],
    };
    deleteMock.mockReturnValue({
      status: "APPLIED",
      workspace,
      removedDocumentId: "document:161",
      removedRelationCount: 0,
      driveFileIdsPreserved: [],
      drivePolicy: "PRESERVE_USER_DRIVE_ORIGINAL",
    });
    const commit = applyingCommit();

    const result = runDeleteFiscalNotificationDocumentCommandV1(
      input(commit, expected),
    );

    expect(result.status).toBe("applied");
    if (result.status !== "applied") return;
    expect(result.data.workspaceIntegrityQuarantine).toEqual(
      expected.workspaceIntegrityQuarantine,
    );
  });

  it("no limpia ni muta la cuarentena cuando falla el commit durable", () => {
    const expected: AppData = {
      ...structuredClone(EMPTY_DATA),
      workspaceIntegrityQuarantine: [
        {
          collection: "fiscalNotificationsWorkspace",
          reason: "malformed_record",
          rawValue: { stillPresent: true },
        },
      ],
    };
    const before = structuredClone(expected);
    deleteMock.mockReturnValue({
      status: "APPLIED",
      workspace: emptyWorkspace(),
      removedDocumentId: "document:161",
      removedRelationCount: 0,
      driveFileIdsPreserved: [],
      drivePolicy: "PRESERVE_USER_DRIVE_ORIGINAL",
    });
    const commit = vi.fn(() => ({
      status: "blocked" as const,
      reason: "write_failed" as const,
    })) as unknown as Commit;

    expect(
      runDeleteFiscalNotificationDocumentCommandV1(input(commit, expected)),
    ).toEqual({ status: "blocked", reason: "write_failed" });
    expect(expected).toEqual(before);
  });
});

function applyingCommit(): Commit {
  return <T>(
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
  };
}

function input(commit: Commit, expected = structuredClone(EMPTY_DATA)) {
  return {
    expected,
    ownerScope: OWNER,
    documentId: "document:161",
    deletedAt: DELETED_AT,
    commit,
  };
}

function emptyWorkspace(): FiscalNotificationsWorkspace {
  return {
    schemaVersion: 1,
    workspaceId: "fiscal-notifications-workspace-v1",
    ownerScope: OWNER,
    revision: 1,
    createdAt: DELETED_AT,
    updatedAt: DELETED_AT,
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
