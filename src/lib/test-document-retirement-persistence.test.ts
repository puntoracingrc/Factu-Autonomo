import { describe, expect, it, vi } from "vitest";
import { buildRestoreChanges } from "./admin/user-restore";
import { runBackupRestoreCommand } from "./backup-restore-command";
import {
  createBackupFilename,
  createBackupPayload,
  parseBackupJson,
} from "./backup";
import {
  applySyncChanges,
  appDataToSyncChanges,
  diffAppData,
  mergePendingChanges,
} from "./cloud/diff";
import { mergeRemoteOntoLocal } from "./cloud/incremental";
import { buildCloudReplacementChanges } from "./cloud/sync-queue";
import {
  applyTestDocumentRetirement,
  buildTestDocumentRetirementPreview,
  buildTestDocumentRetirementRollbackPreview,
  rollbackTestDocumentRetirement,
  testDocumentRetirementExportableDataFingerprint,
} from "./document-integrity/test-document-retirement";
import { normalizeLoadedData, saveData } from "./storage";
import {
  enforceAppliedTestDocumentRetirements,
  isValidTestDocumentRetirementBatch,
  mergeTestDocumentRetirementBatch,
  normalizeTestDocumentRetirementBatches,
} from "./test-document-retirement-persistence";
import { EMPTY_DATA, type AppData, type Document } from "./types";

const TENANT = `sha256:${"c".repeat(64)}`;
const APPLIED_AT = "2026-07-14T07:00:00.000Z";
const ROLLED_BACK_AT = "2026-07-14T07:05:00.000Z";

function document(
  id: string,
  type: Document["type"],
  number: string,
  overrides: Partial<Document> = {},
): Document {
  return {
    id,
    type,
    number,
    date: "2026-06-10",
    client: { name: "Cliente sintético" },
    items: [
      {
        id: `${id}:line:1`,
        description: "Servicio sintético",
        quantity: 1,
        unitPrice: 80,
        ivaPercent: 21,
      },
    ],
    status: "pagado",
    documentLifecycle: "issued",
    integrityLock: "locked",
    createdAt: "2026-06-10T08:00:00.000Z",
    updatedAt: "2026-06-10T08:00:00.000Z",
    ...overrides,
  };
}

function fixture(): { before: AppData; applied: AppData; receipt: Document } {
  const invoiceId = "synthetic-test-invoice";
  const receiptId = "synthetic-test-receipt";
  const invoice = document(invoiceId, "factura", "F-2026-0041", {
    receiptDocumentId: receiptId,
  });
  const receipt = document(receiptId, "recibo", "R-2026-0042", {
    sourceDocumentId: invoiceId,
  });
  const before: AppData = {
    ...structuredClone(EMPTY_DATA),
    documents: [invoice, receipt],
  };
  const preview = buildTestDocumentRetirementPreview(before, {
    selectedDocumentIds: [receiptId],
    tenantFingerprint: TENANT,
  });
  const result = applyTestDocumentRetirement(
    before,
    preview,
    APPLIED_AT,
    TENANT,
    {
      filename:
        "factu-autonomo-backup-antes-retirar-pruebas-2026-07-14-07-00-00.json",
      createdAt: APPLIED_AT,
      exportableDataFingerprint:
        testDocumentRetirementExportableDataFingerprint(before),
      contentSha256: `sha256:${"c".repeat(64)}`,
      byteLength: 1_024,
      disposition: "browser_download_requested",
    },
  );
  if (result.status === "blocked") {
    throw new Error(`Fixture de retiro bloqueado: ${result.reason}`);
  }
  if (result.status !== "applied") throw new Error("Retiro ya aplicado");
  return { before, applied: result.data, receipt };
}

function rolledBack(applied: AppData): AppData {
  const batch = applied.testDocumentRetirementBatches?.[0];
  if (!batch) throw new Error("Falta lote aplicado");
  const preview = buildTestDocumentRetirementRollbackPreview(
    applied,
    batch.batchId,
    TENANT,
  );
  const result = rollbackTestDocumentRetirement(
    applied,
    preview,
    ROLLED_BACK_AT,
    TENANT,
    {
      filename:
        "factu-autonomo-backup-antes-retirar-pruebas-2026-07-14-07-05-00.json",
      createdAt: ROLLED_BACK_AT,
      exportableDataFingerprint:
        testDocumentRetirementExportableDataFingerprint(applied),
      contentSha256: `sha256:${"d".repeat(64)}`,
      byteLength: 1_024,
      disposition: "browser_download_requested",
    },
  );
  if (result.status === "blocked") {
    throw new Error(`Fixture de rollback bloqueado: ${result.reason}`);
  }
  if (result.status !== "applied") throw new Error("Rollback ya aplicado");
  return result.data;
}

describe("persistencia de retiros explícitos", () => {
  it("rehidrata el lote, evita resurrección y reserva la numeración", () => {
    const { before, applied, receipt } = fixture();
    const stale = {
      ...applied,
      documents: [
        { ...before.documents[0]!, receiptDocumentId: receipt.id },
        receipt,
      ],
      counters: { ...applied.counters, recibo: 0 },
      profile: {
        ...applied.profile,
        numbering: {
          ...applied.profile.numbering,
          lastSequence: {
            ...applied.profile.numbering.lastSequence,
            recibo: 0,
          },
        },
      },
    };

    const normalized = normalizeLoadedData(stale);

    expect(normalized.documents.map((entry) => entry.id)).toEqual([
      "synthetic-test-invoice",
    ]);
    expect(normalized.documents[0]?.receiptDocumentId).toBeUndefined();
    expect(normalized.testDocumentRetirementBatches).toEqual(
      applied.testDocumentRetirementBatches,
    );
    expect(normalized.counters.recibo).toBe(42);
    expect(normalized.profile.numbering.lastSequence.recibo).toBe(42);
  });

  it("mantiene historia append-only y rechaza ramas divergentes", () => {
    const { applied } = fixture();
    const afterRollback = rolledBack(applied);
    const short = applied.testDocumentRetirementBatches![0]!;
    const long = afterRollback.testDocumentRetirementBatches![0]!;

    expect(mergeTestDocumentRetirementBatch(short, long)).toEqual(long);
    expect(mergeTestDocumentRetirementBatch(long, short)).toEqual(long);

    const divergentWorkspace = rolledBack(fixture().applied);
    const divergent = divergentWorkspace.testDocumentRetirementBatches![0]!;
    divergent.events[1] = {
      ...divergent.events[1]!,
      at: "2026-07-14T07:06:00.000Z",
      backup: {
        ...divergent.events[1]!.backup,
        createdAt: "2026-07-14T07:06:00.000Z",
        filename:
          "factu-autonomo-backup-antes-retirar-pruebas-2026-07-14-07-06-00.json",
      },
    };
    expect(isValidTestDocumentRetirementBatch(divergent)).toBe(true);
    expect(mergeTestDocumentRetirementBatch(long, divergent)).toBeNull();
  });

  it("no emite tombstones cloud y un upsert obsoleto no resucita datos", () => {
    const { before, applied, receipt } = fixture();
    const applyDiff = diffAppData(before, applied);
    expect(
      applyDiff.filter((change) => change.entityType === "document"),
    ).toEqual([]);
    expect(
      mergePendingChanges(undefined, applyDiff).filter(
        (change) => change.entityType === "document",
      ),
    ).toEqual([]);
    const batchChange = appDataToSyncChanges(applied).find(
      (change) => change.entityType === "document_retirement_batch",
    );
    expect(batchChange).toMatchObject({ deleted: false });
    expect(
      diffAppData(applied, {
        ...applied,
        testDocumentRetirementBatches: [],
      }).some((change) => change.entityType === "document_retirement_batch"),
    ).toBe(false);

    const resurrected = applySyncChanges(
      { ...structuredClone(EMPTY_DATA), testDocumentRetirementBatches: [] },
      [
        batchChange!,
        {
          entityType: "document",
          entityId: before.documents[0]!.id,
          deleted: false,
          payload: before.documents[0],
          updatedAt: "2099-01-01T00:00:00.000Z",
        },
        {
          entityType: "document",
          entityId: receipt.id,
          deleted: false,
          payload: receipt,
          updatedAt: "2099-01-01T00:00:00.000Z",
        },
      ],
    );
    expect(resurrected.documents).toHaveLength(1);
    expect(resurrected.documents[0]?.receiptDocumentId).toBeUndefined();

    const afterDeletedAudit = applySyncChanges(resurrected, [
      { ...batchChange!, deleted: true, payload: undefined },
    ]);
    expect(afterDeletedAudit.testDocumentRetirementBatches).toHaveLength(1);
  });

  it("el rollback sincroniza solo el overlay y no reescribe documentos ni backlinks", () => {
    const { applied } = fixture();
    const afterRollback = rolledBack(applied);

    const rollbackDiff = diffAppData(applied, afterRollback);

    expect(
      rollbackDiff.filter((change) => change.entityType === "document"),
    ).toEqual([]);
    expect(
      rollbackDiff.filter(
        (change) => change.entityType === "document_retirement_batch",
      ),
    ).toHaveLength(1);
  });

  it("fusiona un rollback remoto aunque un sobre local tenga timestamp mayor", () => {
    const { applied } = fixture();
    const afterRollback = rolledBack(applied);
    const remote = appDataToSyncChanges(afterRollback).find(
      (change) => change.entityType === "document_retirement_batch",
    )!;
    const local: AppData = {
      ...applied,
      meta: {
        lastModified: "2099-01-01T00:00:00.000Z",
        pendingChanges: [
          {
            ...appDataToSyncChanges(applied).find(
              (change) => change.entityType === "document_retirement_batch",
            )!,
            updatedAt: "2099-01-01T00:00:00.000Z",
          },
        ],
      },
    };

    const merged = mergeRemoteOntoLocal(local, [remote]);
    expect(merged.applied).toBe(1);
    expect(merged.data.testDocumentRetirementBatches?.[0]?.events).toHaveLength(
      2,
    );
  });

  it("reconstruye atómicamente el rollback si el LWW descartó sus upserts documentales", () => {
    const { applied } = fixture();
    const afterRollback = rolledBack(applied);
    const remoteAudit = appDataToSyncChanges(afterRollback).find(
      (change) => change.entityType === "document_retirement_batch",
    )!;

    const merged = applySyncChanges(applied, [remoteAudit]);

    expect(merged.testDocumentRetirementBatches).toEqual(
      afterRollback.testDocumentRetirementBatches,
    );
    expect(merged.documents).toEqual(afterRollback.documents);
    expect(merged.workspaceIntegrityQuarantine).toBeUndefined();
  });

  it("el rollback ignora upserts documentales redundantes y reconstruye desde el overlay", () => {
    const { applied } = fixture();
    const afterRollback = rolledBack(applied);
    const remote = appDataToSyncChanges(afterRollback);
    const remoteAudit = remote.find(
      (change) => change.entityType === "document_retirement_batch",
    )!;
    const restoredReceipt = remote.find(
      (change) =>
        change.entityType === "document" &&
        change.entityId === "synthetic-test-receipt",
    )!;

    const restored = applySyncChanges(applied, [restoredReceipt, remoteAudit]);

    expect(restored.documents).toEqual(afterRollback.documents);
    expect(restored.testDocumentRetirementBatches).toEqual(
      afterRollback.testDocumentRetirementBatches,
    );
    expect(restored.workspaceIntegrityQuarantine).toBeUndefined();
  });

  it("reconstruye apply y rollback con filas cloud desordenadas sin perder supervivientes", () => {
    const { before, applied } = fixture();
    const afterRollback = rolledBack(applied);
    const extra = document(
      "synthetic-later-survivor",
      "factura",
      "F-2026-0099",
      { date: "2026-07-14" },
    );
    const documentRows = [
      extra,
      before.documents[1]!,
      before.documents[0]!,
    ].map((entry, index) => ({
      entityType: "document" as const,
      entityId: entry.id,
      deleted: false,
      payload: entry,
      updatedAt: `2026-07-14T06:0${index}:00.000Z`,
    }));
    const appliedAudit = appDataToSyncChanges(applied).find(
      (change) => change.entityType === "document_retirement_batch",
    )!;
    const rollbackAudit = appDataToSyncChanges(afterRollback).find(
      (change) => change.entityType === "document_retirement_batch",
    )!;

    const projectedApplied = applySyncChanges(structuredClone(EMPTY_DATA), [
      appliedAudit,
      ...documentRows,
    ]);
    expect(projectedApplied.documents.map((entry) => entry.id)).toEqual([
      "synthetic-test-invoice",
      "synthetic-later-survivor",
    ]);
    expect(projectedApplied.documents[0]?.receiptDocumentId).toBeUndefined();

    const projectedRollback = applySyncChanges(structuredClone(EMPTY_DATA), [
      rollbackAudit,
      ...documentRows,
    ]);
    expect(projectedRollback.documents.map((entry) => entry.id)).toEqual([
      "synthetic-test-invoice",
      "synthetic-test-receipt",
      "synthetic-later-survivor",
    ]);
    expect(projectedRollback.documents[0]?.receiptDocumentId).toBe(
      "synthetic-test-receipt",
    );
  });

  it("conserva el timestamp del evento en reemplazos cloud", () => {
    const { applied } = fixture();
    const replacement = buildCloudReplacementChanges(
      applied,
      "2099-01-01T00:00:00.000Z",
    );
    const audit = replacement.find(
      (change) => change.entityType === "document_retirement_batch",
    );
    expect(audit?.updatedAt).toBe(APPLIED_AT);
    expect(
      replacement
        .filter((change) => change.entityType !== "document_retirement_batch")
        .every((change) => change.updatedAt === "2099-01-01T00:00:00.000Z"),
    ).toBe(true);
  });

  it("incluye el historial en backup y bloquea una copia que lo omite", () => {
    const { before, applied } = fixture();
    const payload = createBackupPayload(applied, APPLIED_AT);
    const parsed = parseBackupJson(payload);
    expect("error" in parsed).toBe(false);
    if ("error" in parsed) return;
    expect(parsed.testDocumentRetirementBatches).toEqual(
      applied.testDocumentRetirementBatches,
    );
    expect(createBackupFilename(APPLIED_AT, "pre_test_retirement")).toBe(
      "factu-autonomo-backup-antes-retirar-pruebas-2026-07-14-07-00-00.json",
    );

    const commit = <T>(
      expected: AppData,
      build: (data: AppData) => {
        data: AppData;
        value: T;
      },
    ) => {
      const transition = build(expected);
      return {
        status: "applied" as const,
        data: transition.data,
        value: transition.value,
        replayed: false,
      };
    };
    const restored = runBackupRestoreCommand({
      expected: applied,
      restored: before,
      commit,
    });
    expect(restored).toEqual({
      status: "blocked",
      reason: "transition_failed",
    });
  });

  it("un restore admin antiguo falla cerrado antes de borrar el lote", () => {
    const { before, applied } = fixture();
    expect(() =>
      buildRestoreChanges(applied, before, "2099-01-01T00:00:00.000Z"),
    ).toThrow("retrocede el historial de retiro");
  });

  it("un restore admin divergente falla cerrado", () => {
    const { applied } = fixture();
    const current = rolledBack(applied);
    const divergent = structuredClone(current);
    const event = divergent.testDocumentRetirementBatches![0]!.events[1]!;
    divergent.testDocumentRetirementBatches![0]!.events[1] = {
      ...event,
      at: "2026-07-14T07:06:00.000Z",
      backup: {
        ...event.backup,
        createdAt: "2026-07-14T07:06:00.000Z",
        filename:
          "factu-autonomo-backup-antes-retirar-pruebas-2026-07-14-07-06-00.json",
      },
    };
    expect(() => buildRestoreChanges(current, divergent)).toThrow(
      "historial de retiro",
    );
  });

  it("pone en cuarentena un lote malformado sin aplicarlo", () => {
    const { applied } = fixture();
    const malformed = structuredClone(
      applied.testDocumentRetirementBatches![0]!,
    );
    malformed.events[0]!.workspaceFingerprint = `sha256:${"0".repeat(64)}`;

    expect(normalizeTestDocumentRetirementBatches([malformed])).toMatchObject({
      batches: [],
      invalidEntries: [{ index: 0 }],
    });
    const normalized = normalizeLoadedData({
      ...applied,
      testDocumentRetirementBatches: [malformed],
    });
    expect(normalized.testDocumentRetirementBatches).toEqual([]);
    expect(normalized.workspaceIntegrityQuarantine).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          collection: "testDocumentRetirementBatches",
          reason: "malformed_record",
        }),
      ]),
    );
  });

  it("rechaza evidencia documental parcial no confiable sin lanzar", () => {
    const { applied } = fixture();
    const source = applied.testDocumentRetirementBatches![0]!;
    const malformedValues = [
      {},
      { fiscalContext: {} },
      { fiscalContext: { verifactu: {} } },
    ];

    for (const partialSnapshot of malformedValues) {
      const malformed = structuredClone(source);
      malformed.retiredDocuments[0]!.document.documentSnapshot =
        partialSnapshot as Document["documentSnapshot"];
      expect(() => isValidTestDocumentRetirementBatch(malformed)).not.toThrow();
      expect(isValidTestDocumentRetirementBatch(malformed)).toBe(false);
      expect(normalizeTestDocumentRetirementBatches([malformed])).toMatchObject(
        {
          batches: [],
          invalidEntries: [{ index: 0 }],
        },
      );
      const quarantined = normalizeLoadedData({
        ...applied,
        testDocumentRetirementBatches: [malformed],
      });
      expect(quarantined.testDocumentRetirementBatches).toEqual([]);
      expect(quarantined.workspaceIntegrityQuarantine).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            collection: "testDocumentRetirementBatches",
            reason: "malformed_record",
          }),
        ]),
      );
    }

    const throwingPayload = new Proxy(
      {},
      {
        get() {
          throw new Error("payload hostil");
        },
      },
    );
    expect(() =>
      isValidTestDocumentRetirementBatch(throwingPayload),
    ).not.toThrow();
    expect(isValidTestDocumentRetirementBatch(throwingPayload)).toBe(false);
  });

  it("exige timestamps de eventos estrictamente crecientes y coherentes", () => {
    const { applied } = fixture();
    const validRollback =
      rolledBack(applied).testDocumentRetirementBatches![0]!;

    const duplicate = structuredClone(validRollback);
    duplicate.events[1] = {
      ...duplicate.events[1]!,
      at: duplicate.events[0]!.at,
      backup: {
        ...duplicate.events[1]!.backup,
        createdAt: duplicate.events[0]!.at,
      },
    };
    expect(isValidTestDocumentRetirementBatch(duplicate)).toBe(false);

    const decreasing = structuredClone(validRollback);
    decreasing.events[1] = {
      ...decreasing.events[1]!,
      at: "2026-07-14T06:59:59.000Z",
      backup: {
        ...decreasing.events[1]!.backup,
        createdAt: "2026-07-14T06:59:59.000Z",
      },
    };
    expect(isValidTestDocumentRetirementBatch(decreasing)).toBe(false);

    const mismatchedBackup = structuredClone(validRollback);
    mismatchedBackup.events[1] = {
      ...mismatchedBackup.events[1]!,
      backup: {
        ...mismatchedBackup.events[1]!.backup,
        createdAt: "2026-07-14T07:05:01.000Z",
      },
    };
    expect(isValidTestDocumentRetirementBatch(mismatchedBackup)).toBe(false);
  });

  it("el guard anti-vaciado considera el archivo de retiros como datos", () => {
    const { applied } = fixture();
    const archiveOnly: AppData = {
      ...structuredClone(EMPTY_DATA),
      testDocumentRetirementBatches: applied.testDocumentRetirementBatches,
    };
    const beforeRaw = JSON.stringify(archiveOnly);
    const store = new Map([["factura-autonomo-data", beforeRaw]]);
    vi.stubGlobal("window", {});
    vi.stubGlobal("localStorage", {
      getItem: (key: string) => store.get(key) ?? null,
      setItem: (key: string, value: string) => store.set(key, value),
      removeItem: (key: string) => store.delete(key),
    });
    try {
      expect(saveData(structuredClone(EMPTY_DATA))).toEqual({
        status: "blocked",
        reason: "protected_existing_data",
      });
      expect(store.get("factura-autonomo-data")).toBe(beforeRaw);
    } finally {
      vi.unstubAllGlobals();
    }
  });

  it("la política pura es idempotente", () => {
    const { applied } = fixture();
    expect(
      enforceAppliedTestDocumentRetirements(
        enforceAppliedTestDocumentRetirements(applied),
      ),
    ).toEqual(enforceAppliedTestDocumentRetirements(applied));
  });
});
