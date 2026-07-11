import { beforeEach, describe, expect, it, vi } from "vitest";
import { pullSyncChanges, pushSyncChanges } from "./repository";
import type { SyncChange } from "./diff";

const supabaseMock = vi.hoisted(() => ({
  from: vi.fn(),
}));

vi.mock("../supabase/client", () => ({
  getSupabaseClientAsync: vi.fn(async () => supabaseMock),
}));

interface Row {
  user_id?: string;
  entity_type: string;
  entity_id: string;
  payload: unknown;
  deleted: boolean;
  updated_at: string;
}

function makeRows(count: number): Row[] {
  return Array.from({ length: count }, (_, index) => ({
    user_id: "user-1",
    entity_type: "document",
    entity_id: `doc-${String(index).padStart(4, "0")}`,
    payload: { id: `doc-${index}` },
    deleted: false,
    updated_at: `2026-06-29T10:${String(Math.floor(index / 60)).padStart(2, "0")}:${String(index % 60).padStart(2, "0")}.000Z`,
  }));
}

function installPullMock(rows: Row[]) {
  const ranges: Array<[number, number]> = [];
  const gtValues: string[] = [];

  supabaseMock.from.mockImplementation(() => {
    const builder = {
      select: vi.fn(() => builder),
      eq: vi.fn((field: string, value: string) => {
        if (field === "entity_type") builder.entityType = value;
        return builder;
      }),
      order: vi.fn(() => builder),
      range: vi.fn((from: number, to: number) => {
        ranges.push([from, to]);
        builder.currentRange = [from, to] as [number, number];
        return builder;
      }),
      gt: vi.fn((_field: string, value: string) => {
        gtValues.push(value);
        builder.since = value;
        return builder;
      }),
      currentRange: [0, 499] as [number, number],
      since: undefined as string | undefined,
      entityType: undefined as string | undefined,
      then(resolve: (value: { data: Row[]; error: null }) => void) {
        const [from, to] = builder.currentRange;
        const filtered = rows.filter(
          (row) =>
            (!builder.since || row.updated_at > builder.since) &&
            (!builder.entityType || row.entity_type === builder.entityType),
        );
        resolve({ data: filtered.slice(from, to + 1), error: null });
      },
    };
    return builder;
  });

  return { ranges, gtValues };
}

describe("cloud repository", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("descarga entidades sincronizadas por paginas para cuentas grandes", async () => {
    const { ranges } = installPullMock(makeRows(1205));

    const changes = await pullSyncChanges("user-1");

    expect(changes).toHaveLength(1205);
    expect(changes[0]).toMatchObject({
      entityType: "document",
      entityId: "doc-0000",
    });
    expect(changes.at(-1)).toMatchObject({
      entityType: "document",
      entityId: "doc-1204",
    });
    expect(ranges).toEqual([
      [0, 499],
      [500, 999],
      [1000, 1499],
    ]);
  });

  it("mantiene el filtro incremental al paginar descargas", async () => {
    const { gtValues } = installPullMock(makeRows(620));

    const changes = await pullSyncChanges("user-1", "2026-06-29T10:01:00.000Z");

    expect(changes.length).toBeGreaterThan(0);
    expect(gtValues).toEqual([
      "2026-06-29T10:01:00.000Z",
      "2026-06-29T10:01:00.000Z",
    ]);
    expect(changes.every((change) => change.updatedAt > "2026-06-29T10:01:00.000Z")).toBe(
      true,
    );
  });

  it("recupera siempre exclusiones monotónicas anteriores al watermark", async () => {
    const rows: Row[] = [
      {
        entity_type: "customer",
        entity_id: "old-customer",
        payload: { id: "old-customer" },
        deleted: false,
        updated_at: "2026-06-01T10:00:00.000Z",
      },
      {
        entity_type: "recurring_occurrence_exclusion",
        entity_id: "rent:2026-05-31",
        payload: {
          templateId: "rent",
          key: "rent:2026-05-31",
          excludedAt: "2026-06-01T10:00:00.000Z",
        },
        deleted: false,
        updated_at: "2026-06-01T10:00:00.000Z",
      },
    ];
    installPullMock(rows);

    const changes = await pullSyncChanges(
      "user-1",
      "2026-06-15T10:00:00.000Z",
    );

    expect(changes).toHaveLength(1);
    expect(changes[0]).toMatchObject({
      entityType: "recurring_occurrence_exclusion",
      entityId: "rent:2026-05-31",
    });
  });

  it("sube cambios en lotes para no depender del limite por defecto", async () => {
    const upsert = vi.fn(async () => ({ error: null }));
    supabaseMock.from.mockReturnValue({ upsert });
    const changes: SyncChange[] = Array.from({ length: 1201 }, (_, index) => ({
      entityType: "customer",
      entityId: `customer-${index}`,
      deleted: false,
      payload: { id: `customer-${index}` },
      updatedAt: "2026-06-29T10:00:00.000Z",
    }));

    await pushSyncChanges("user-1", changes);

    const calls = upsert.mock.calls as unknown as Array<[unknown[]]>;
    expect(upsert).toHaveBeenCalledTimes(3);
    expect(calls[0][0]).toHaveLength(500);
    expect(calls[1][0]).toHaveLength(500);
    expect(calls[2][0]).toHaveLength(201);
  });
});
