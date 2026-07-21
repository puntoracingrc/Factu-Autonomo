import { beforeEach, describe, expect, it, vi } from "vitest";
import type {
  AppDataDurabilityResult,
  AppDataTransition,
} from "../app-data-durability";
import { EMPTY_DATA, type AppData } from "../types";
import type { FiscalNotificationsWorkspace } from "./types";

const { deleteAllMock, transitionMock } = vi.hoisted(() => ({
  deleteAllMock: vi.fn(),
  transitionMock: vi.fn(),
}));

vi.mock("./delete-all-documents.v1", async (importOriginal) => ({
  ...(await importOriginal<typeof import("./delete-all-documents.v1")>()),
  deleteAllFiscalNotificationDocumentsV1: deleteAllMock,
}));
vi.mock("./workspace-storage-envelope.v2", async (importOriginal) => ({
  ...(await importOriginal<typeof import("./workspace-storage-envelope.v2")>()),
  registerFiscalNotificationDocumentReductionTransitionV2: transitionMock,
}));

import { runDeleteAllFiscalNotificationDocumentsCommandV1 } from "./delete-all-documents-command.v1";

const OWNER = "user:00000000-0000-4000-8000-000000000203";
const DELETED_AT = "2026-07-21T00:10:00.000Z";
type Commit = <T>(
  expected: AppData,
  build: (previous: AppData) => AppDataTransition<T>,
) => AppDataDurabilityResult<T>;

function emptyWorkspace(): FiscalNotificationsWorkspace {
  return {
    schemaVersion: 1,
    workspaceId: "fiscal-notifications-workspace-v1",
    ownerScope: OWNER,
    revision: 8,
    createdAt: "2026-07-21T00:00:00.000Z",
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

function appliedDomain(workspace = emptyWorkspace()) {
  return {
    status: "APPLIED",
    workspace,
    removedDocumentIds: ["document:one", "document:two"],
    removedRelationCount: 1,
    driveFileIdsPreserved: ["drive_file_preserved_203"],
    drivePolicy: "PRESERVE_USER_DRIVE_ORIGINALS",
  };
}

function input(expected: AppData, commit: Commit) {
  return { expected, ownerScope: OWNER, deletedAt: DELETED_AT, commit };
}

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

describe("delete all fiscal notification documents command v1", () => {
  beforeEach(() => {
    deleteAllMock.mockReset();
    transitionMock.mockReset();
    transitionMock.mockImplementation((workspace) => workspace);
  });

  it("hace un único commit y conserva estado no fiscal, ownerScope y originales Drive", () => {
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
            entityType: "expense",
            entityId: "expense:retained",
            deleted: false,
            payload: { id: "expense:retained" },
            updatedAt: DELETED_AT,
          },
        ],
      },
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
    deleteAllMock.mockReturnValue(appliedDomain(workspace));
    const baseCommit = applyingCommit();
    const commit = vi.fn(baseCommit) as unknown as Commit;

    const result = runDeleteAllFiscalNotificationDocumentsCommandV1(
      input(expected, commit),
    );

    expect(commit).toHaveBeenCalledTimes(1);
    expect(result.status).toBe("applied");
    if (result.status !== "applied") return;
    expect(result.data.fiscalNotificationsWorkspace).toBe(workspace);
    expect(result.data.meta?.pendingChanges).toEqual([
      expect.objectContaining({ entityId: "expense:retained" }),
    ]);
    expect(result.data.workspaceIntegrityQuarantine).toEqual([
      expect.objectContaining({ collection: "customers" }),
    ]);
    expect(result.value).toMatchObject({
      removedDocumentIds: ["document:one", "document:two"],
      driveFileIdsPreserved: ["drive_file_preserved_203"],
      drivePolicy: "PRESERVE_USER_DRIVE_ORIGINALS",
    });
    expect(expected).toEqual(before);
  });

  it("no inicia persistencia si dominio o marcador de reducción bloquean", () => {
    const expected = structuredClone(EMPTY_DATA);
    const commit = vi.fn();
    deleteAllMock.mockReturnValueOnce({
      status: "BLOCKED",
      reason: "INVALID_WORKSPACE",
    });
    expect(
      runDeleteAllFiscalNotificationDocumentsCommandV1(
        input(expected, commit as unknown as Commit),
      ),
    ).toEqual({ status: "BLOCKED", reason: "INVALID_WORKSPACE" });

    deleteAllMock.mockReturnValueOnce(appliedDomain());
    transitionMock.mockReturnValueOnce(null);
    expect(
      runDeleteAllFiscalNotificationDocumentsCommandV1(
        input(expected, commit as unknown as Commit),
      ),
    ).toEqual({ status: "BLOCKED", reason: "RESULT_INVALID" });
    expect(commit).not.toHaveBeenCalled();
  });

  it("es idempotente cuando ya no hay fichas", () => {
    deleteAllMock.mockReturnValue({ status: "NOT_FOUND" });
    const commit = vi.fn();
    expect(
      runDeleteAllFiscalNotificationDocumentsCommandV1(
        input(structuredClone(EMPTY_DATA), commit as unknown as Commit),
      ),
    ).toEqual({ status: "NOT_FOUND" });
    expect(commit).not.toHaveBeenCalled();
  });

  it("no muta el snapshot si el commit durable falla", () => {
    const expected = structuredClone(EMPTY_DATA);
    const before = structuredClone(expected);
    deleteAllMock.mockReturnValue(appliedDomain());
    const commit: Commit = () =>
      ({ status: "blocked", reason: "write_failed" }) as never;

    const result = runDeleteAllFiscalNotificationDocumentsCommandV1(
      input(expected, commit),
    );

    expect(result).toEqual({ status: "blocked", reason: "write_failed" });
    expect(expected).toEqual(before);
  });
});
