import { beforeEach, describe, expect, it, vi } from "vitest";
import type {
  AppDataDurabilityResult,
  AppDataTransition,
} from "../app-data-durability";
import { EMPTY_DATA, type AppData } from "../types";
import type {
  FiscalNotificationDriveArchiveRecordV1,
  FiscalNotificationsWorkspace,
} from "./types";

const { appendMock } = vi.hoisted(() => ({ appendMock: vi.fn() }));

vi.mock("./drive-original-archive.v1", async (importOriginal) => ({
  ...(await importOriginal<typeof import("./drive-original-archive.v1")>()),
  appendFiscalNotificationDriveArchiveV1: appendMock,
}));

import { runFiscalNotificationDriveArchiveCommandV1 } from "./drive-original-archive-command.v1";

const OWNER = "user:00000000-0000-4000-8000-000000000091";
const HASH = "d".repeat(64);
const ARCHIVED_AT = "2026-07-15T09:00:00.000Z";
type Commit = <T>(
  expected: AppData,
  build: (previous: AppData) => AppDataTransition<T>,
) => AppDataDurabilityResult<T>;

describe("durable fiscal notification Drive archive command v1", () => {
  beforeEach(() => appendMock.mockReset());

  it("no escribe cuando el dominio bloquea la operación", () => {
    appendMock.mockReturnValue({ status: "BLOCKED" });
    const commitSpy = vi.fn();
    const commit: Commit = () => {
      commitSpy();
      throw new Error("commit must not run");
    };

    expect(runFiscalNotificationDriveArchiveCommandV1(input(commit))).toEqual({
      status: "blocked",
    });
    expect(commitSpy).not.toHaveBeenCalled();
  });

  it("reproduce sin escritura un enlace ya registrado", () => {
    const expected = structuredClone(EMPTY_DATA);
    const workspace = emptyWorkspace();
    const archive = archiveRecord();
    expected.fiscalNotificationsWorkspace = workspace;
    appendMock.mockReturnValue({
      status: "EXISTING",
      workspace,
      archive,
    });
    const commitSpy = vi.fn();
    const commit: Commit = () => {
      commitSpy();
      throw new Error("commit must not run");
    };

    const result = runFiscalNotificationDriveArchiveCommandV1(
      input(commit, expected),
    );

    expect(result).toEqual({
      status: "applied",
      data: expected,
      value: { status: "EXISTING", workspace, archive },
      replayed: true,
    });
    expect(commitSpy).not.toHaveBeenCalled();
  });

  it("entrega una única transición al commit durable", () => {
    const expected = structuredClone(EMPTY_DATA);
    const workspace = { ...emptyWorkspace(), revision: 1 };
    const archive = archiveRecord();
    appendMock.mockReturnValue({
      status: "APPLIED",
      workspace,
      archive,
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

    const result = runFiscalNotificationDriveArchiveCommandV1(
      input(commit, expected),
    );

    expect(commitSpy).toHaveBeenCalledTimes(1);
    expect(result.status).toBe("applied");
    if (result.status === "applied") {
      expect(result.data.fiscalNotificationsWorkspace).toBe(workspace);
      expect(result.value).toEqual({ status: "APPLIED", workspace, archive });
    }
  });
});

function input(commit: Commit, expected = structuredClone(EMPTY_DATA)) {
  return {
    expected,
    ownerScope: OWNER,
    receipt: {
      sourceSha256: HASH,
      driveFileId: "drive_file_verified",
      driveFolderId: "drive_folder_verified",
      documentDate: "2026-06-30",
      verification: "SHA256_READBACK_MATCH" as const,
    },
    archivedAt: ARCHIVED_AT,
    commit,
  };
}

function emptyWorkspace(): FiscalNotificationsWorkspace {
  return {
    schemaVersion: 1,
    workspaceId: "fiscal-notifications-workspace-v1",
    ownerScope: OWNER,
    revision: 0,
    createdAt: ARCHIVED_AT,
    updatedAt: ARCHIVED_AT,
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
  };
}

function archiveRecord(): FiscalNotificationDriveArchiveRecordV1 {
  return {
    id: `drive-archive:${HASH}`,
    ownerScope: OWNER,
    fileId: "file:verified",
    documentIds: ["document:verified"],
    sourceSha256: HASH,
    driveFileId: "drive_file_verified",
    driveFolderId: "drive_folder_verified",
    documentDate: "2026-06-30",
    archiveStatus: "ARCHIVED_VERIFIED",
    reviewStatus: "USER_CONFIRMED",
    verificationMethod: "SHA256_READBACK_MATCH",
    recordVersion: 1,
    workspaceRevision: 1,
    archivedAt: ARCHIVED_AT,
  };
}
