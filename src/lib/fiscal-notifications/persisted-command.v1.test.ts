import { describe, expect, it, vi } from "vitest";
import type {
  AppDataDurabilityResult,
  AppDataTransition,
} from "../app-data-durability";
import type { SaveDataBlockedReason, SaveDataResult } from "../storage";
import { EMPTY_DATA, type AppData } from "../types";
import type { FiscalNotificationsWorkspace } from "./types";
import {
  runFiscalNotificationCommandAgainstLatestPersistedV1,
  type FiscalNotificationPersistedCommitV1,
} from "./persisted-command.v1";

type Result = AppDataDurabilityResult<string>;

const blocked = (
  reason: SaveDataBlockedReason | "storage_state_unknown",
): Result =>
  reason === "storage_state_unknown"
    ? { status: "indeterminate", reason }
    : { status: "blocked", reason };

function runNoop(
  expected: AppData,
  commit: FiscalNotificationPersistedCommitV1,
): Result {
  return commit(expected, (previous) => ({
    data: previous,
    value: "applied",
  }));
}

function namedData(name: string): AppData {
  return {
    ...structuredClone(EMPTY_DATA),
    profile: { ...EMPTY_DATA.profile, name },
  };
}

function fiscalWorkspace(revision: number): FiscalNotificationsWorkspace {
  const timestamp = "2026-07-20T10:05:00.000Z";
  return {
    schemaVersion: 1,
    workspaceId: "fiscal-notifications-workspace-v1",
    ownerScope: "user:00000000-0000-4000-8000-000000000165",
    revision,
    createdAt: timestamp,
    updatedAt: timestamp,
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

describe("fiscal notification persisted command v1", () => {
  it("reconstruye una sola vez sobre la cabeza durable ganadora", () => {
    const stale = namedData("stale-tab");
    const fresh = namedData("other-tab");
    const readPersisted = vi
      .fn<() => AppData | null>()
      .mockReturnValueOnce(stale)
      .mockReturnValueOnce(fresh);
    const persist = vi
      .fn<(candidate: AppData, expected: AppData) => SaveDataResult>()
      .mockReturnValueOnce({ status: "blocked", reason: "stale_precondition" })
      .mockReturnValueOnce({ status: "applied" });

    const result = runFiscalNotificationCommandAgainstLatestPersistedV1({
      fallback: stale,
      storageBaseline: { status: "known", data: stale },
      lastKnownPersisted: stale,
      readPersisted,
      persist,
      blocked,
      run: runNoop,
    });

    expect(result.status).toBe("applied");
    if (result.status !== "applied") return;
    expect(result.data.profile.name).toBe("other-tab");
    expect(readPersisted).toHaveBeenCalledTimes(2);
    expect(persist).toHaveBeenCalledTimes(2);
    expect(persist.mock.calls[1]?.[1]).toBe(fresh);
  });

  it("conserva el estado local y su cambio pendiente tras un fallo previo", () => {
    const persisted = namedData("persisted");
    const current: AppData = {
      ...persisted,
      profile: { ...persisted.profile, name: "unsaved-local" },
      meta: {
        lastModified: "2026-07-20T10:00:00.000Z",
        pendingChanges: [
          {
            entityType: "profile",
            entityId: "profile",
            deleted: false,
            payload: { ...persisted.profile, name: "unsaved-local" },
            updatedAt: "2026-07-20T10:00:00.000Z",
          },
        ],
      },
    };
    const persist = vi.fn(
      (): SaveDataResult => ({ status: "applied" }),
    );

    const result = runFiscalNotificationCommandAgainstLatestPersistedV1({
      fallback: current,
      storageBaseline: { status: "blocked", reason: "write_failed" },
      lastKnownPersisted: persisted,
      readPersisted: () => structuredClone(persisted),
      persist,
      blocked,
      run: runNoop,
    });

    expect(result.status).toBe("applied");
    if (result.status !== "applied") return;
    expect(result.data.profile.name).toBe("unsaved-local");
    expect(result.data.meta?.pendingChanges).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          entityType: "profile",
          payload: expect.objectContaining({ name: "unsaved-local" }),
        }),
      ]),
    );
    expect(persist).toHaveBeenCalledWith(expect.anything(), persisted);
  });

  it("usa el snapshot local durable aunque el autosync marque un baseline divergente", () => {
    const current: AppData = {
      ...namedData("local-durable"),
      fiscalNotificationsWorkspace: fiscalWorkspace(3),
      meta: {
        lastModified: "2026-07-20T10:05:00.000Z",
        pendingChanges: [
          {
            entityType: "fiscal_notifications_workspace",
            entityId: "fiscal-notifications-workspace-v1",
            deleted: false,
            payload: { marker: "pending-fiscal-sync" },
            updatedAt: "2026-07-20T10:05:00.000Z",
          },
        ],
      },
    };
    const staleRemoteHead = namedData("stale-remote-head");
    const persisted: AppData = {
      ...structuredClone(current),
      fiscalNotificationsWorkspace: fiscalWorkspace(4),
    };
    const persist = vi.fn(
      (): SaveDataResult => ({ status: "applied" }),
    );

    const result = runFiscalNotificationCommandAgainstLatestPersistedV1({
      fallback: current,
      storageBaseline: { status: "blocked", reason: "stale_precondition" },
      lastKnownPersisted: staleRemoteHead,
      readPersisted: () => persisted,
      persist,
      blocked,
      run: runNoop,
    });

    expect(result.status).toBe("applied");
    if (result.status !== "applied") return;
    expect(result.data.profile.name).toBe("local-durable");
    expect(result.data.fiscalNotificationsWorkspace?.revision).toBe(4);
    expect(result.data.meta?.pendingChanges).toEqual(
      current.meta?.pendingChanges,
    );
    expect(persist).toHaveBeenCalledWith(expect.anything(), persisted);
  });

  it("no ignora cambios de contenido aunque también cambie la revisión fiscal", () => {
    const current: AppData = {
      ...namedData("local-durable"),
      fiscalNotificationsWorkspace: fiscalWorkspace(3),
    };
    const persisted: AppData = {
      ...namedData("remote-business-change"),
      fiscalNotificationsWorkspace: fiscalWorkspace(4),
    };
    const persist = vi.fn(
      (): SaveDataResult => ({ status: "applied" }),
    );

    const result = runFiscalNotificationCommandAgainstLatestPersistedV1({
      fallback: current,
      storageBaseline: { status: "blocked", reason: "stale_precondition" },
      lastKnownPersisted: namedData("stale-remote-head"),
      readPersisted: () => persisted,
      persist,
      blocked,
      run: runNoop,
    });

    expect(result).toEqual({ status: "blocked", reason: "stale_precondition" });
    expect(persist).not.toHaveBeenCalled();
  });

  it("confirma durabilidad antes de aceptar un replay con cambios locales", () => {
    const persisted = namedData("persisted");
    const current = namedData("unsaved-local");
    const persist = vi.fn(
      (): SaveDataResult => ({ status: "applied" }),
    );

    const result = runFiscalNotificationCommandAgainstLatestPersistedV1({
      fallback: current,
      storageBaseline: { status: "blocked", reason: "write_failed" },
      lastKnownPersisted: persisted,
      readPersisted: () => structuredClone(persisted),
      persist,
      blocked,
      run: (expected): Result => ({
        status: "applied",
        data: expected,
        value: "replayed",
        replayed: true,
      }),
    });

    expect(result.status).toBe("applied");
    expect(persist).toHaveBeenCalledWith(current, expect.anything());
  });

  it("no acepta un replay local si su escritura durable pierde la carrera", () => {
    const persisted = namedData("persisted");
    const current = namedData("unsaved-local");

    expect(
      runFiscalNotificationCommandAgainstLatestPersistedV1({
        fallback: current,
        storageBaseline: { status: "blocked", reason: "write_failed" },
        lastKnownPersisted: persisted,
        readPersisted: () => structuredClone(persisted),
        persist: () => ({
          status: "blocked",
          reason: "stale_precondition",
        }),
        blocked,
        run: (expected): Result => ({
          status: "applied",
          data: expected,
          value: "replayed",
          replayed: true,
        }),
      }),
    ).toEqual({ status: "blocked", reason: "stale_precondition" });
  });

  it("no pisa una cabeza remota nueva cuando también hay cambios locales", () => {
    const lastKnown = namedData("last-known");
    const current = namedData("unsaved-local");
    const remote = namedData("other-tab");
    const run = vi.fn(
      (
        expected: AppData,
        commit: <T>(
          expected: AppData,
          build: (previous: AppData) => AppDataTransition<T>,
        ) => AppDataDurabilityResult<T>,
      ) => runNoop(expected, commit),
    );
    const persist = vi.fn();

    expect(
      runFiscalNotificationCommandAgainstLatestPersistedV1({
        fallback: current,
        storageBaseline: { status: "blocked", reason: "write_failed" },
        lastKnownPersisted: lastKnown,
        readPersisted: () => remote,
        persist,
        blocked,
        run,
      }),
    ).toEqual({ status: "blocked", reason: "stale_precondition" });
    expect(run).not.toHaveBeenCalled();
    expect(persist).not.toHaveBeenCalled();
  });

  it("bloquea un baseline indeterminado incluso si el comando sería replay", () => {
    const readPersisted = vi.fn<() => AppData | null>();
    const persist = vi.fn();
    const run = vi.fn((): Result => ({
      status: "applied",
      data: namedData("replayed"),
      value: "replayed",
      replayed: true,
    }));

    expect(
      runFiscalNotificationCommandAgainstLatestPersistedV1({
        fallback: namedData("current"),
        storageBaseline: {
          status: "indeterminate",
          reason: "storage_state_unknown",
        },
        lastKnownPersisted: namedData("last-known"),
        readPersisted,
        persist,
        blocked,
        run,
      }),
    ).toEqual({ status: "indeterminate", reason: "storage_state_unknown" });
    expect(readPersisted).not.toHaveBeenCalled();
    expect(run).not.toHaveBeenCalled();
    expect(persist).not.toHaveBeenCalled();
  });

  it("no afirma guardado cuando no puede leer el estado durable", () => {
    const run = vi.fn(runNoop);

    expect(
      runFiscalNotificationCommandAgainstLatestPersistedV1({
        fallback: namedData("current"),
        storageBaseline: { status: "known", data: namedData("current") },
        lastKnownPersisted: namedData("last-known"),
        readPersisted: () => null,
        persist: vi.fn(),
        blocked,
        run,
      }),
    ).toEqual({ status: "indeterminate", reason: "storage_state_unknown" });
    expect(run).not.toHaveBeenCalled();
  });
});
