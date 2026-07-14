import { beforeEach, describe, expect, it, vi } from "vitest";
import { pullSyncChanges, pushSyncChanges } from "./repository";
import type { SyncChange } from "./diff";
import { buildCloudReplacementChanges } from "./sync-queue";
import { rebuildCloudSnapshot } from "./incremental";
import { attestNewImportedDocument, inspectLegacyImportAttestation } from "../document-integrity/legacy-import-attestation";
import { EMPTY_DATA, type AppData, type Document } from "../types";
import { appDataToSyncChanges } from "./diff";
import {
  applyTestDocumentRetirement,
  buildTestDocumentRetirementPreview,
  buildTestDocumentRetirementRollbackPreview,
  rollbackTestDocumentRetirement,
  testDocumentRetirementExportableDataFingerprint,
} from "../document-integrity/test-document-retirement";
import { testDocumentRetirementTenantFingerprintForUserId } from "../test-document-retirement-persistence";

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

function installPullMock(
  rows: Row[],
  upsert = vi.fn(async (rows: unknown[]) => {
    void rows;
    return { error: null };
  }),
) {
  const ranges: Array<[number, number]> = [];
  const gtValues: string[] = [];
  const insert = vi.fn();
  const update = vi.fn();

  supabaseMock.from.mockImplementation(() => {
    const builder = {
      select: vi.fn(() => builder),
      eq: vi.fn((field: string, value: unknown) => {
        if (field === "entity_type" && typeof value === "string") {
          builder.entityType = value;
        }
        builder.filters.push([field, value]);
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
      operation: "select" as "select" | "insert" | "update",
      operationValue: undefined as Row | undefined,
      filters: [] as Array<[string, unknown]>,
      insert: vi.fn((value: Row) => {
        insert(value);
        builder.operation = "insert";
        builder.operationValue = value;
        return builder;
      }),
      update: vi.fn((value: Row) => {
        update(value);
        builder.operation = "update";
        builder.operationValue = value;
        return builder;
      }),
      then(
        resolve: (value: { data: Row[] | null; error: null | Error }) => void,
      ) {
        if (builder.operation === "insert") {
          const value = builder.operationValue!;
          const exists = rows.some(
            (row) =>
              row.entity_type === value.entity_type &&
              row.entity_id === value.entity_id &&
              row.user_id === value.user_id,
          );
          if (exists) {
            resolve({ data: null, error: new Error("duplicate") });
          } else {
            rows.push(value);
            resolve({ data: [value], error: null });
          }
          return;
        }
        if (builder.operation === "update") {
          const matches = rows.filter((row) =>
            builder.filters.every(([field, expected]) => {
              const actual = row[field as keyof Row];
              return JSON.stringify(actual) === JSON.stringify(expected);
            }),
          );
          for (const match of matches) {
            Object.assign(match, builder.operationValue);
          }
          resolve({ data: matches, error: null });
          return;
        }
        const [from, to] = builder.currentRange;
        const filtered = rows.filter(
          (row) =>
            (!builder.since || row.updated_at > builder.since) &&
            (!builder.entityType || row.entity_type === builder.entityType),
        );
        resolve({ data: filtered.slice(from, to + 1), error: null });
      },
      upsert,
    };
    return builder;
  });

  return { ranges, gtValues, upsert, insert, update };
}

function retirementHistories(): { applied: AppData; rolledBack: AppData } {
  const receiptId = "synthetic-retirement-repository-receipt";
  const invoice: Document = {
    id: "synthetic-retirement-repository-invoice",
    type: "factura",
    number: "F-2026-0043",
    date: "2026-06-10",
    client: { name: "Cliente sintético" },
    items: [
      {
        id: "synthetic-line",
        description: "Servicio",
        quantity: 1,
        unitPrice: 100,
        ivaPercent: 21,
      },
    ],
    status: "pagado",
    documentLifecycle: "issued",
    integrityLock: "locked",
    receiptDocumentId: receiptId,
    createdAt: "2026-06-10T08:00:00.000Z",
    updatedAt: "2026-06-10T08:00:00.000Z",
  };
  const receipt: Document = {
    ...invoice,
    id: receiptId,
    type: "recibo",
    number: "R-2026-0044",
    sourceDocumentId: invoice.id,
    receiptDocumentId: undefined,
  };
  const before: AppData = {
    ...structuredClone(EMPTY_DATA),
    documents: [invoice, receipt],
  };
  const tenant = testDocumentRetirementTenantFingerprintForUserId("user-1");
  const preview = buildTestDocumentRetirementPreview(before, {
    selectedDocumentIds: [receipt.id],
    tenantFingerprint: tenant,
  });
  const applied = applyTestDocumentRetirement(
    before,
    preview,
    "2026-07-14T07:10:00.000Z",
    tenant,
    {
      filename:
        "factu-autonomo-backup-antes-retirar-pruebas-2026-07-14-07-10-00.json",
      createdAt: "2026-07-14T07:10:00.000Z",
      exportableDataFingerprint:
        testDocumentRetirementExportableDataFingerprint(before),
      contentSha256: `sha256:${"c".repeat(64)}`,
      byteLength: 1_024,
      disposition: "browser_download_requested",
    },
  );
  if (applied.status === "blocked") throw new Error(applied.reason);
  if (applied.status !== "applied") throw new Error("Retiro ya aplicado");
  const batchId = applied.data.testDocumentRetirementBatches![0]!.batchId;
  const rollbackPreview = buildTestDocumentRetirementRollbackPreview(
    applied.data,
    batchId,
    tenant,
  );
  const rolledBack = rollbackTestDocumentRetirement(
    applied.data,
    rollbackPreview,
    "2026-07-14T07:15:00.000Z",
    tenant,
    {
      filename:
        "factu-autonomo-backup-antes-retirar-pruebas-2026-07-14-07-15-00.json",
      createdAt: "2026-07-14T07:15:00.000Z",
      exportableDataFingerprint:
        testDocumentRetirementExportableDataFingerprint(applied.data),
      contentSha256: `sha256:${"d".repeat(64)}`,
      byteLength: 1_024,
      disposition: "browser_download_requested",
    },
  );
  if (rolledBack.status === "blocked") throw new Error(rolledBack.reason);
  if (rolledBack.status !== "applied") throw new Error("Rollback ya aplicado");
  return { applied: applied.data, rolledBack: rolledBack.data };
}

function documentRows(data: AppData, updatedAt: string): Row[] {
  return data.documents.map((document) => ({
    user_id: "user-1",
    entity_type: "document",
    entity_id: document.id,
    payload: document,
    deleted: false,
    updated_at: updatedAt,
  }));
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

  it("recupera siempre lotes de retiro anteriores al watermark", async () => {
    const { applied } = retirementHistories();
    const batch = applied.testDocumentRetirementBatches![0]!;
    installPullMock([
      {
        entity_type: "document_retirement_batch",
        entity_id: batch.batchId,
        payload: batch,
        deleted: false,
        updated_at: batch.events[0]!.at,
      },
    ]);

    const changes = await pullSyncChanges(
      "user-1",
      "2026-07-14T08:00:00.000Z",
    );

    expect(changes).toEqual([
      expect.objectContaining({
        entityType: "document_retirement_batch",
        entityId: batch.batchId,
        deleted: false,
      }),
    ]);
  });

  it("no acorta en cloud un historial append-only más largo", async () => {
    const { applied, rolledBack } = retirementHistories();
    const remoteBatch = rolledBack.testDocumentRetirementBatches![0]!;
    const upsert = vi.fn(async (rows: unknown[]) => {
      void rows;
      return { error: null };
    });
    const writes = installPullMock(
      [
        {
          entity_type: "document_retirement_batch",
          entity_id: remoteBatch.batchId,
          payload: remoteBatch,
          deleted: false,
          updated_at: remoteBatch.events.at(-1)!.at,
        },
      ],
      upsert,
    );
    const staleChange = appDataToSyncChanges(applied).find(
      (change) => change.entityType === "document_retirement_batch",
    )!;

    await pushSyncChanges("user-1", [staleChange]);

    expect(writes.insert).not.toHaveBeenCalled();
    expect(writes.update).not.toHaveBeenCalled();
    expect(upsert).not.toHaveBeenCalled();
  });

  it("inserta el overlay aplicado una sola vez y el reintento es idempotente", async () => {
    const { applied } = retirementHistories();
    const audit = appDataToSyncChanges(applied).find(
      (change) => change.entityType === "document_retirement_batch",
    )!;
    const rows: Row[] = [];
    const writes = installPullMock(rows);

    await pushSyncChanges("user-1", [audit]);
    await pushSyncChanges("user-1", [audit]);

    expect(writes.insert).toHaveBeenCalledTimes(1);
    expect(writes.update).not.toHaveBeenCalled();
    expect(writes.upsert).toHaveBeenCalledTimes(1);
    const bootstrapRows = writes.upsert.mock.calls[0]![0] as unknown as Row[];
    expect(
      bootstrapRows
        .filter((row) => row.entity_type === "document")
        .map((row) => row.entity_id)
        .sort(),
    ).toEqual(
      applied.testDocumentRetirementBatches![0]!.retiredDocuments
        .map((entry) => entry.document.id)
        .concat(
          applied.testDocumentRetirementBatches![0]!.backlinkChanges.map(
            (entry) => entry.documentId,
          ),
        )
        .sort(),
    );
    expect(rows).toHaveLength(1);
  });

  it("conserva las filas documentales base al crear el overlay sobre una nube vacía", async () => {
    const { applied } = retirementHistories();
    const batch = applied.testDocumentRetirementBatches![0]!;
    const rows: Row[] = [];
    const upsert = vi.fn(async (rawRows: unknown[]) => {
      rows.push(...(rawRows as Row[]));
      return { error: null };
    });
    const writes = installPullMock(rows, upsert);

    await pushSyncChanges(
      "user-1",
      buildCloudReplacementChanges(applied, "2026-07-14T08:00:00.000Z"),
    );

    const baseRows = rows.filter((row) => row.entity_type === "document");
    expect(baseRows).toHaveLength(2);
    expect(baseRows.some((row) => row.deleted)).toBe(false);
    expect(
      baseRows.find((row) => row.entity_id === batch.selectedDocumentIds[0])
        ?.payload,
    ).toEqual(batch.retiredDocuments[0]!.document);
    expect(
      (baseRows.find(
        (row) => row.entity_id === batch.backlinkChanges[0]!.documentId,
      )?.payload as Document).receiptDocumentId,
    ).toBe(batch.selectedDocumentIds[0]);
    expect(writes.insert).toHaveBeenCalledTimes(1);

    installPullMock(rows);
    const rebuilt = rebuildCloudSnapshot(
      await pullSyncChanges("user-1"),
    ).data;
    expect(rebuilt.documents.map((document) => document.id)).toEqual([
      batch.backlinkChanges[0]!.documentId,
    ]);
    expect(rebuilt.documents[0]?.receiptDocumentId).toBeUndefined();
  });

  it("no reescribe documentos base cuando la transición los encuentra intactos", async () => {
    const { applied, rolledBack } = retirementHistories();
    const audit = appDataToSyncChanges(applied).find(
      (change) => change.entityType === "document_retirement_batch",
    )!;
    const rows = documentRows(rolledBack, "2026-07-14T07:00:00.000Z");
    const writes = installPullMock(rows);

    await pushSyncChanges("user-1", [audit]);

    expect(writes.insert).toHaveBeenCalledTimes(1);
    expect(writes.upsert).not.toHaveBeenCalled();
  });

  it("bloquea el rollback si el CAS condicional ya no encuentra la revisión leída", async () => {
    const { applied, rolledBack } = retirementHistories();
    const appliedBatch = applied.testDocumentRetirementBatches![0]!;
    const rollbackAudit = appDataToSyncChanges(rolledBack).find(
      (change) => change.entityType === "document_retirement_batch",
    )!;
    const rows: Row[] = [
      {
        user_id: "user-1",
        entity_type: "document_retirement_batch",
        entity_id: appliedBatch.batchId,
        payload: appliedBatch,
        deleted: false,
        updated_at: appliedBatch.events[0]!.at,
      },
      ...documentRows(rolledBack, "2026-07-14T07:00:00.000Z"),
    ];
    const writes = installPullMock(rows);
    writes.update.mockImplementation(() => {
      rows[0] = {
        ...rows[0]!,
        updated_at: "2026-07-14T07:10:00.001Z",
      };
    });

    await expect(pushSyncChanges("user-1", [rollbackAudit])).rejects.toThrow(
      "cambió antes de confirmar",
    );
    expect(writes.update).toHaveBeenCalledTimes(1);
    expect(writes.upsert).not.toHaveBeenCalled();
  });

  it("permite editar después un documento superviviente aunque se adjunte el lote aplicado", async () => {
    const { applied, rolledBack } = retirementHistories();
    const batch = applied.testDocumentRetirementBatches![0]!;
    const rows: Row[] = [
      {
        user_id: "user-1",
        entity_type: "document_retirement_batch",
        entity_id: batch.batchId,
        payload: batch,
        deleted: false,
        updated_at: batch.events.at(-1)!.at,
      },
      ...documentRows(rolledBack, "2026-07-14T07:00:00.000Z"),
    ];
    const writes = installPullMock(rows);
    const survivor = applied.documents[0]!;
    const edited: Document = {
      ...survivor,
      client: { ...survivor.client, name: "Cliente sintético actualizado" },
      updatedAt: "2026-07-14T08:30:00.000Z",
    };
    const audit = appDataToSyncChanges(applied).find(
      (change) => change.entityType === "document_retirement_batch",
    )!;

    await pushSyncChanges("user-1", [
      audit,
      {
        entityType: "document",
        entityId: edited.id,
        deleted: false,
        payload: edited,
        updatedAt: edited.updatedAt,
      },
    ]);

    expect(writes.insert).not.toHaveBeenCalled();
    expect(writes.update).not.toHaveBeenCalled();
    expect(writes.upsert).toHaveBeenCalledTimes(1);
    expect(writes.upsert.mock.calls[0]![0]).toEqual([
      expect.objectContaining({
        entity_type: "document",
        entity_id: edited.id,
        payload: edited,
        deleted: false,
      }),
    ]);
  });

  it("permite editar un documento restaurado cuando el rollback ya estaba compartido", async () => {
    const { rolledBack } = retirementHistories();
    const batch = rolledBack.testDocumentRetirementBatches![0]!;
    const rows: Row[] = [
      {
        user_id: "user-1",
        entity_type: "document_retirement_batch",
        entity_id: batch.batchId,
        payload: batch,
        deleted: false,
        updated_at: batch.events.at(-1)!.at,
      },
      ...documentRows(rolledBack, "2026-07-14T07:15:00.000Z"),
    ];
    const writes = installPullMock(rows);
    const restored = rolledBack.documents.find(
      (document) => document.id === batch.selectedDocumentIds[0],
    )!;
    const edited: Document = {
      ...restored,
      client: { ...restored.client, name: "Cliente restaurado actualizado" },
      updatedAt: "2026-07-14T08:45:00.000Z",
    };
    const audit = appDataToSyncChanges(rolledBack).find(
      (change) => change.entityType === "document_retirement_batch",
    )!;

    await pushSyncChanges("user-1", [
      audit,
      {
        entityType: "document",
        entityId: edited.id,
        deleted: false,
        payload: edited,
        updatedAt: edited.updatedAt,
      },
    ]);

    expect(writes.upsert).toHaveBeenCalledTimes(1);
    expect(writes.upsert.mock.calls[0]![0]).toEqual([
      expect.objectContaining({ entity_id: edited.id, payload: edited }),
    ]);
  });

  it("conserva intacta la fila subyacente de un escritor viejo; el overlay evita que reaparezca", async () => {
    const { applied, rolledBack } = retirementHistories();
    const batch = applied.testDocumentRetirementBatches![0]!;
    const staleInvoice = rolledBack.documents.find(
      (entry) => entry.type === "factura",
    )!;
    const upsert = vi.fn(async (rows: unknown[]) => {
      void rows;
      return { error: null };
    });
    installPullMock(
      [
        {
          entity_type: "document_retirement_batch",
          entity_id: batch.batchId,
          payload: batch,
          deleted: false,
          updated_at: batch.events.at(-1)!.at,
        },
      ],
      upsert,
    );

    await pushSyncChanges("user-1", [
      {
        entityType: "document",
        entityId: staleInvoice.id,
        deleted: false,
        payload: staleInvoice,
        updatedAt: "2099-01-01T00:00:00.000Z",
      },
    ]);

    const rows = upsert.mock.calls[0]![0] as unknown as Row[];
    const invoiceRow = rows.find((row) => row.entity_id === staleInvoice.id)!;
    expect((invoiceRow.payload as Document).receiptDocumentId).toBe(
      batch.selectedDocumentIds[0],
    );
    expect(
      rows.some((row) => row.entity_id === batch.selectedDocumentIds[0]),
    ).toBe(false);

    const projected = rebuildCloudSnapshot([
      appDataToSyncChanges(applied).find(
        (change) => change.entityType === "document_retirement_batch",
      )!,
      {
        entityType: "document",
        entityId: staleInvoice.id,
        deleted: false,
        payload: staleInvoice,
        updatedAt: "2099-01-01T00:00:00.000Z",
      },
      {
        entityType: "document",
        entityId: batch.selectedDocumentIds[0]!,
        deleted: false,
        payload: rolledBack.documents.find(
          (entry) => entry.id === batch.selectedDocumentIds[0],
        )!,
        updatedAt: "2099-01-01T00:00:00.000Z",
      },
    ]).data;
    expect(projected.documents.map((entry) => entry.id)).toEqual([
      staleInvoice.id,
    ]);
    expect(projected.documents[0]?.receiptDocumentId).toBeUndefined();
  });

  it("rechaza un payload documental no derivado mezclado con la transición", async () => {
    const { applied, rolledBack } = retirementHistories();
    const audit = appDataToSyncChanges(applied).find(
      (change) => change.entityType === "document_retirement_batch",
    )!;
    const receipt = rolledBack.documents.find(
      (entry) => entry.type === "recibo",
    )!;
    const writes = installPullMock([]);

    await expect(
      pushSyncChanges("user-1", [
        audit,
        {
          entityType: "document",
          entityId: receipt.id,
          deleted: false,
          payload: { ...receipt, number: "R-2026-9999" },
          updatedAt: "2026-07-14T07:10:00.000Z",
        },
      ]),
    ).rejects.toThrow("cambió durante la transición");
    expect(writes.insert).not.toHaveBeenCalled();
    expect(writes.upsert).not.toHaveBeenCalled();
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

  it("hace visible una atestación restaurada tras un watermark posterior", async () => {
    const historical = attestNewImportedDocument(
      {
        id: "pcfacturacion:factura:Factura_2F2940_2F",
        type: "factura",
        number: "Factura/2940/",
        date: "2024-06-12",
        client: { name: "Cliente histórico" },
        items: [
          {
            id: "line-historical",
            description: "Servicio",
            quantity: 1,
            unitPrice: 100,
            ivaPercent: 21,
          },
        ],
        status: "enviado",
        issuer: {
          name: "Negocio histórico",
          nif: "12345678Z",
          address: "Calle Mayor 1",
          city: "Madrid",
          postalCode: "28001",
          capturedAt: "2024-06-12T08:00:00.000Z",
        },
        documentLifecycle: "issued",
        integrityLock: "locked",
        createdAt: "2024-06-12T08:00:00.000Z",
        updatedAt: "2024-06-12T08:00:00.000Z",
      },
      {
        ...EMPTY_DATA.profile,
        name: "Negocio histórico",
        nif: "12345678Z",
        address: "Calle Mayor 1",
        city: "Madrid",
        postalCode: "28001",
      },
      "pcfacturacion",
      "2026-07-12T22:00:00.000Z",
    );
    const changes = buildCloudReplacementChanges(
      {
        ...EMPTY_DATA,
        documents: [historical],
        snapshotIntegrityVersion: 1,
      },
      "2026-07-13T08:00:00.000Z",
    );
    const uploadedRows: Row[] = [];
    const upsert = vi.fn(async (rawRows: unknown[]) => {
      uploadedRows.push(...(rawRows as Row[]));
      return { error: null };
    });
    installPullMock([], upsert);

    await pushSyncChanges("user-1", changes);
    installPullMock(uploadedRows);
    const pulled = await pullSyncChanges(
      "user-1",
      "2026-07-13T07:59:59.000Z",
    );
    const restored = rebuildCloudSnapshot(pulled).data;
    const restoredDocument = restored.documents.find(
      (document) => document.id === historical.id,
    );

    expect(restoredDocument).toBeDefined();
    expect((restoredDocument as Document).updatedAt).toBe(
      "2024-06-12T08:00:00.000Z",
    );
    expect(inspectLegacyImportAttestation(restoredDocument!)).toMatchObject({
      ok: true,
    });
    expect(restoredDocument?.legacyImportProvenance).toEqual(
      historical.legacyImportProvenance,
    );
    expect(restoredDocument?.legacyImportAttestation).toEqual(
      historical.legacyImportAttestation,
    );
  });
});
