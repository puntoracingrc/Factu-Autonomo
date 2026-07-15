import { beforeEach, describe, expect, it, vi } from "vitest";
import type {
  AppDataDurabilityResult,
  AppDataTransition,
} from "../app-data-durability";
import { EMPTY_DATA, type AppData } from "../types";
import type { FiscalNotificationsWorkspace } from "./types";

const { deleteMock } = vi.hoisted(() => ({ deleteMock: vi.fn() }));

vi.mock("./document-deletion.v1", async (importOriginal) => ({
  ...(await importOriginal<typeof import("./document-deletion.v1")>()),
  deleteFiscalNotificationDocumentV1: deleteMock,
}));

import { runDeleteFiscalNotificationDocumentCommandV1 } from "./document-deletion-command.v1";

const OWNER = "user:00000000-0000-4000-8000-000000000161";
const DELETED_AT = "2026-07-15T22:30:00.000Z";
type Commit = <T>(
  expected: AppData,
  build: (previous: AppData) => AppDataTransition<T>,
) => AppDataDurabilityResult<T>;

describe("durable fiscal notification document deletion command v1", () => {
  beforeEach(() => deleteMock.mockReset());

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

  it("entrega una única transición completa al commit durable", () => {
    const expected = structuredClone(EMPTY_DATA);
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
    expect(result.value).toEqual(
      expect.objectContaining({
        drivePolicy: "PRESERVE_USER_DRIVE_ORIGINAL",
        driveFileIdsPreserved: ["drive_file_preserved_161"],
      }),
    );
  });
});

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
