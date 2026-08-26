import { afterEach, describe, expect, it, vi } from "vitest";
import { getSupabaseClientAsync } from "@/lib/supabase/client";
import type { SyncChange } from "@/lib/cloud/diff";
import type { FiscalNotificationsWorkspace } from "./types";
import {
  encodeFiscalNotificationsWorkspaceForStorageV2,
  FISCAL_NOTIFICATIONS_WORKSPACE_SYNC_ENTITY_ID_V2,
  type FiscalNotificationsWorkspaceStorageEnvelopeV2,
} from "./workspace-storage-envelope.v2";
import { pushFiscalNotificationsWorkspaceChanges } from "./workspace-cloud-repository";

vi.mock("@/lib/supabase/client", () => ({
  getSupabaseClientAsync: vi.fn(),
}));

const USER_ID = "00000000-0000-4000-8000-000000000061";
const OWNER = `user:${USER_ID}`;
const CREATED_AT = "2026-08-26T06:00:00.000Z";

interface StoredWorkspaceRow {
  user_id: string;
  entity_type: "fiscal_notifications_workspace";
  entity_id: string;
  payload: Readonly<FiscalNotificationsWorkspaceStorageEnvelopeV2>;
  deleted: false;
  updated_at: string;
}

function emptyWorkspace(
  revision: number,
  updatedAt: string,
  workspaceId = "fiscal-notifications-workspace-v1",
): FiscalNotificationsWorkspace {
  return {
    schemaVersion: 1,
    workspaceId,
    ownerScope: OWNER,
    revision,
    createdAt: CREATED_AT,
    updatedAt,
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

function envelope(
  revision: number,
  updatedAt: string,
  workspaceId?: string,
): Readonly<FiscalNotificationsWorkspaceStorageEnvelopeV2> {
  const encoded = encodeFiscalNotificationsWorkspaceForStorageV2(
    emptyWorkspace(revision, updatedAt, workspaceId),
  );
  if (!encoded) throw new Error("Fixture fiscal invalido");
  return encoded;
}

function row(
  payload: Readonly<FiscalNotificationsWorkspaceStorageEnvelopeV2>,
  updatedAt: string,
): StoredWorkspaceRow {
  return {
    user_id: USER_ID,
    entity_type: "fiscal_notifications_workspace",
    entity_id: FISCAL_NOTIFICATIONS_WORKSPACE_SYNC_ENTITY_ID_V2,
    payload,
    deleted: false,
    updated_at: updatedAt,
  };
}

function change(
  payload: Readonly<FiscalNotificationsWorkspaceStorageEnvelopeV2>,
  updatedAt: string,
): SyncChange {
  return {
    entityType: "fiscal_notifications_workspace",
    entityId: FISCAL_NOTIFICATIONS_WORKSPACE_SYNC_ENTITY_ID_V2,
    deleted: false,
    payload,
    updatedAt,
  };
}

function offsetTimestamp(value: string): string {
  return value.endsWith("Z") ? `${value.slice(0, -1)}+00:00` : value;
}

function createSupabaseFixture(options: {
  initial: StoredWorkspaceRow;
  raceOnFirstUpdate?: StoredWorkspaceRow;
  formatWrittenTimestamp?: (value: string) => string;
}) {
  let stored = options.initial;
  let updateCount = 0;

  const from = vi.fn(() => {
    let operation: "read" | "insert" | "update" = "read";
    let written: StoredWorkspaceRow | null = null;
    const filters: Array<readonly [string, unknown]> = [];
    const builder: Record<string, unknown> = {};

    const matchesFilters = () =>
      filters.every(
        ([field, expected]) =>
          (stored as unknown as Record<string, unknown>)[field] === expected,
      );

    const execute = async () => {
      if (operation === "read") {
        return {
          data: matchesFilters() ? [stored] : [],
          error: null,
        };
      }
      if (operation === "insert") {
        return {
          data: [],
          error: new Error("duplicate key"),
        };
      }

      updateCount += 1;
      if (updateCount === 1 && options.raceOnFirstUpdate) {
        stored = options.raceOnFirstUpdate;
        return { data: [], error: null };
      }
      if (!written || !matchesFilters()) return { data: [], error: null };
      stored = {
        ...written,
        updated_at: options.formatWrittenTimestamp
          ? options.formatWrittenTimestamp(written.updated_at)
          : written.updated_at,
      };
      return { data: [stored], error: null };
    };

    builder.select = vi.fn(() => builder);
    builder.eq = vi.fn((field: string, expected: unknown) => {
      filters.push([field, expected]);
      return builder;
    });
    builder.order = vi.fn(() => builder);
    builder.insert = vi.fn((value: StoredWorkspaceRow) => {
      operation = "insert";
      written = value;
      return builder;
    });
    builder.update = vi.fn((value: StoredWorkspaceRow) => {
      operation = "update";
      written = value;
      return builder;
    });
    builder.then = (
      resolve: (value: unknown) => unknown,
      reject: (reason: unknown) => unknown,
    ) => execute().then(resolve, reject);
    return builder;
  });

  return {
    client: { from },
    readStored: () => stored,
    readUpdateCount: () => updateCount,
  };
}

describe("fiscal notifications workspace cloud repository", () => {
  afterEach(() => {
    vi.useRealTimers();
    vi.resetAllMocks();
  });

  it("confirma la escritura cuando PostgREST devuelve el mismo instante con offset UTC", async () => {
    vi.useFakeTimers();
    vi.setSystemTime("2026-08-26T06:03:00.000Z");
    const incoming = envelope(2, "2026-08-26T06:02:00.000Z");
    const fixture = createSupabaseFixture({
      initial: row(
        envelope(1, "2026-08-26T06:01:00.000Z"),
        "2026-08-26T06:01:00.000+00:00",
      ),
      formatWrittenTimestamp: offsetTimestamp,
    });
    vi.mocked(getSupabaseClientAsync).mockResolvedValue(
      fixture.client as never,
    );

    await expect(
      pushFiscalNotificationsWorkspaceChanges(USER_ID, [
        change(incoming, "2026-08-26T06:02:00.000Z"),
      ]),
    ).resolves.toBe("2026-08-26T06:03:00.000Z");
    expect(fixture.readUpdateCount()).toBe(1);
    expect(fixture.readStored().payload.workspace.revision).toBe(2);
  });

  it("acepta una carrera si el otro dispositivo ya guardo la misma copia", async () => {
    const incoming = envelope(2, "2026-08-26T06:02:00.000Z");
    const fixture = createSupabaseFixture({
      initial: row(
        envelope(1, "2026-08-26T06:01:00.000Z"),
        "2026-08-26T06:01:00.000+00:00",
      ),
      raceOnFirstUpdate: row(incoming, "2026-08-26T06:02:01.000+00:00"),
    });
    vi.mocked(getSupabaseClientAsync).mockResolvedValue(
      fixture.client as never,
    );

    await expect(
      pushFiscalNotificationsWorkspaceChanges(USER_ID, [
        change(incoming, "2026-08-26T06:02:00.000Z"),
      ]),
    ).resolves.toEqual(expect.any(String));
    expect(fixture.readUpdateCount()).toBe(1);
  });

  it("reintenta sobre una revision concurrente incluida en la copia local", async () => {
    vi.useFakeTimers();
    vi.setSystemTime("2026-08-26T06:04:00.000Z");
    const incoming = envelope(3, "2026-08-26T06:03:00.000Z");
    const fixture = createSupabaseFixture({
      initial: row(
        envelope(1, "2026-08-26T06:01:00.000Z"),
        "2026-08-26T06:01:00.000+00:00",
      ),
      raceOnFirstUpdate: row(
        envelope(2, "2026-08-26T06:02:00.000Z"),
        "2026-08-26T06:02:01.000+00:00",
      ),
      formatWrittenTimestamp: offsetTimestamp,
    });
    vi.mocked(getSupabaseClientAsync).mockResolvedValue(
      fixture.client as never,
    );

    await expect(
      pushFiscalNotificationsWorkspaceChanges(USER_ID, [
        change(incoming, "2026-08-26T06:03:00.000Z"),
      ]),
    ).resolves.toBe("2026-08-26T06:04:00.000Z");
    expect(fixture.readUpdateCount()).toBe(2);
    expect(fixture.readStored().payload.workspace.revision).toBe(3);
  });

  it("mantiene el bloqueo cuando la carrera contiene otro historial", async () => {
    const incoming = envelope(2, "2026-08-26T06:02:00.000Z");
    const fixture = createSupabaseFixture({
      initial: row(
        envelope(1, "2026-08-26T06:01:00.000Z"),
        "2026-08-26T06:01:00.000+00:00",
      ),
      raceOnFirstUpdate: row(
        envelope(
          2,
          "2026-08-26T06:02:00.000Z",
          "other-fiscal-workspace",
        ),
        "2026-08-26T06:02:01.000+00:00",
      ),
    });
    vi.mocked(getSupabaseClientAsync).mockResolvedValue(
      fixture.client as never,
    );

    await expect(
      pushFiscalNotificationsWorkspaceChanges(USER_ID, [
        change(incoming, "2026-08-26T06:02:00.000Z"),
      ]),
    ).rejects.toMatchObject({ code: "fiscal_workspace_diverged" });
    expect(fixture.readUpdateCount()).toBe(1);
  });
});
