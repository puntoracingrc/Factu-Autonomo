import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  buildCloudReplacementChanges,
  buildCloudUploadChanges,
  buildCloudUploadPlan,
  clearSyncPending,
  hasUnsyncedChanges,
  isSyncPendingFlag,
  markSyncPending,
} from "./sync-queue";
import { EMPTY_DATA, type Document } from "../types";
import { attestNewImportedDocument } from "../document-integrity/legacy-import-attestation";
import {
  applyTestDocumentRetirement,
  buildTestDocumentRetirementPreview,
  testDocumentRetirementExportableDataFingerprint,
} from "../document-integrity/test-document-retirement";
import { testDocumentRetirementTenantFingerprintForUserId } from "../test-document-retirement-persistence";
import type { FiscalNotificationsWorkspace } from "../fiscal-notifications/types";

const NOW = "2026-06-28T06:55:00.000Z";

const invoice: Document = {
  id: "invoice-sync-queue",
  type: "factura",
  number: "Factura/2941/",
  date: "2026-06-12",
  client: { name: "VILFER 24H SL" },
  items: [
    {
      id: "line-sync-queue",
      description: "Servicio",
      quantity: 1,
      unitPrice: 172.56,
      ivaPercent: 21,
    },
  ],
  status: "pagado",
  createdAt: "2026-06-12T08:00:00.000Z",
  updatedAt: "2026-06-28T06:48:00.000Z",
};

function dataWithAppliedRetirement() {
  const sourceInvoice: Document = {
    ...invoice,
    id: "synthetic-retirement-sync-queue-invoice",
    number: "F-2026-0043",
    date: "2026-06-10",
    documentLifecycle: "issued",
    integrityLock: "locked",
    createdAt: "2026-06-10T08:00:00.000Z",
    updatedAt: "2026-06-10T08:00:00.000Z",
  };
  const receipt: Document = {
    ...sourceInvoice,
    id: "synthetic-retirement-sync-queue-receipt",
    type: "recibo",
    number: "R-2026-0044",
    sourceDocumentId: sourceInvoice.id,
    receiptDocumentId: undefined,
  };
  const before = {
    ...structuredClone(EMPTY_DATA),
    documents: [{ ...sourceInvoice, receiptDocumentId: receipt.id }, receipt],
  };
  const tenantFingerprint =
    testDocumentRetirementTenantFingerprintForUserId("user-1");
  const preview = buildTestDocumentRetirementPreview(before, {
    selectedDocumentIds: [receipt.id],
    tenantFingerprint,
  });
  const applied = applyTestDocumentRetirement(
    before,
    preview,
    "2026-07-14T08:00:00.000Z",
    tenantFingerprint,
    {
      filename:
        "factu-autonomo-backup-antes-retirar-pruebas-2026-07-14-08-00-00.json",
      createdAt: "2026-07-14T08:00:00.000Z",
      exportableDataFingerprint:
        testDocumentRetirementExportableDataFingerprint(before),
      contentSha256: `sha256:${"a".repeat(64)}`,
      byteLength: 1_024,
      disposition: "browser_download_requested",
    },
  );
  if (applied.status !== "applied") {
    throw new Error("No se pudo preparar el lote sintético de retiro");
  }
  return applied.data;
}

describe("sync queue", () => {
  beforeEach(() => {
    const store = new Map<string, string>();
    vi.stubGlobal("localStorage", {
      getItem: (key: string) => store.get(key) ?? null,
      setItem: (key: string, value: string) => store.set(key, value),
      removeItem: (key: string) => store.delete(key),
    });
    vi.stubGlobal("window", { navigator: { onLine: true } });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.useRealTimers();
  });

  it("detecta cambios pendientes", () => {
    const data = {
      ...EMPTY_DATA,
      meta: {
        lastModified: "2026-06-10T12:00:00.000Z",
        lastSyncedAt: "2026-06-09T12:00:00.000Z",
      },
    };
    expect(hasUnsyncedChanges(data)).toBe(true);
  });

  it("marca y limpia la cola local", () => {
    markSyncPending();
    expect(isSyncPendingFlag()).toBe(true);
    clearSyncPending();
    expect(isSyncPendingFlag()).toBe(false);
  });

  it("respeta la cola incremental cuando ya existe", () => {
    const pending = [
      {
        entityType: "document" as const,
        entityId: invoice.id,
        action: "upsert" as const,
        deleted: false,
        payload: invoice,
        updatedAt: "2026-06-28T06:48:00.000Z",
      },
    ];
    const data = {
      ...EMPTY_DATA,
      documents: [invoice],
      meta: {
        lastModified: "2026-06-28T06:48:00.000Z",
        lastSyncedAt: "2026-06-27T10:00:00.000Z",
        pendingChanges: pending,
      },
    };

    expect(buildCloudUploadChanges(data)).toBe(pending);
  });

  it("no reinyecta un retiro ya estable al subir solo un cambio de perfil", () => {
    const retired = dataWithAppliedRetirement();
    const profile = {
      ...retired.profile,
      documentPhrases: {
        phrases: [
          {
            id: "phrase-sync-queue",
            documentType: "factura" as const,
            text: "Condiciones de venta guardadas",
          },
        ],
        defaultPhraseId: {},
      },
    };
    const pending = [
      {
        entityType: "profile" as const,
        entityId: "profile",
        deleted: false,
        payload: profile,
        updatedAt: NOW,
      },
    ];
    const data = {
      ...retired,
      profile,
      meta: {
        lastModified: NOW,
        lastSyncedAt: "2026-07-14T07:59:00.000Z",
        pendingChanges: pending,
      },
    };

    expect(buildCloudUploadChanges(data)).toBe(pending);
  });

  it("genera una subida completa si hay cambios sin cola incremental", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(NOW));
    const data = {
      ...EMPTY_DATA,
      documents: [invoice],
      meta: {
        lastModified: "2026-06-28T06:49:00.000Z",
        lastSyncedAt: "2026-06-27T10:00:00.000Z",
      },
    };

    const changes = buildCloudUploadChanges(data);

    expect(changes.map((change) => change.entityType)).toEqual([
      "document",
      "profile",
      "counters",
      "workspace_metadata",
    ]);
    expect(changes.every((change) => change.updatedAt === NOW)).toBe(true);
  });

  it("distingue una reconstruccion completa de la cola explicita", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(NOW));
    const data = {
      ...EMPTY_DATA,
      documents: [invoice],
      meta: {
        lastModified: "2026-06-28T06:49:00.000Z",
        lastSyncedAt: "2026-06-27T10:00:00.000Z",
      },
    };

    expect(buildCloudUploadPlan(data)).toMatchObject({
      queueDepth: 0,
      uploadChangeCount: 4,
      uploadMode: "full_snapshot_rebuild",
      containsFiscalWorkspace: false,
      entityTypeCounts: {
        document: 1,
        profile: 1,
        counters: 1,
        workspace_metadata: 1,
      },
      lastModifiedAfterLastSynced: true,
    });
  });

  it("describe una cola incremental sin exponer identificadores", () => {
    const pending = [
      {
        entityType: "document" as const,
        entityId: invoice.id,
        deleted: false,
        payload: invoice,
        updatedAt: NOW,
      },
    ];
    const plan = buildCloudUploadPlan({
      ...EMPTY_DATA,
      documents: [invoice],
      meta: {
        lastModified: NOW,
        lastSyncedAt: "2026-06-27T10:00:00.000Z",
        pendingChanges: pending,
      },
    });

    expect(plan).toMatchObject({
      queueDepth: 1,
      uploadChangeCount: 1,
      uploadMode: "queued",
      entityTypeCounts: { document: 1 },
    });
    expect(JSON.stringify({ ...plan, changes: undefined })).not.toContain(
      invoice.id,
    );
  });

  it("indica si la subida contiene la cabeza fiscal sin registrar su payload", () => {
    const fiscalWorkspace: FiscalNotificationsWorkspace = {
      schemaVersion: 1,
      workspaceId: "fiscal-notifications-workspace-v1",
      ownerScope: "user:00000000-0000-4000-8000-000000000001",
      revision: 0,
      createdAt: NOW,
      updatedAt: NOW,
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
    const plan = buildCloudUploadPlan({
      ...EMPTY_DATA,
      fiscalNotificationsWorkspace: fiscalWorkspace,
      meta: {
        lastModified: NOW,
        lastSyncedAt: "2026-06-27T10:00:00.000Z",
      },
    });

    expect(plan).toMatchObject({
      queueDepth: 0,
      uploadChangeCount: 4,
      uploadMode: "full_snapshot_rebuild",
      containsFiscalWorkspace: true,
      entityTypeCounts: { fiscal_notifications_workspace: 1 },
    });
    expect(plan.entityTypeCounts).not.toHaveProperty("entityId");
  });

  it("refecha solo los sobres de una restauración completa", () => {
    const historical = attestNewImportedDocument(
      {
        ...invoice,
        id: "pcfacturacion:factura:Factura_2F2941_2F",
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
    const data = { ...EMPTY_DATA, documents: [historical] };

    const replacement = buildCloudReplacementChanges(data, NOW);
    const documentChange = replacement.find(
      (change) => change.entityType === "document",
    );

    expect(replacement.every((change) => change.updatedAt === NOW)).toBe(true);
    expect(documentChange?.payload).toEqual(historical);
    expect((documentChange?.payload as Document).updatedAt).toBe(
      "2024-06-12T08:00:00.000Z",
    );
    expect(
      buildCloudUploadChanges({
        ...data,
        meta: {
          lastModified: NOW,
          pendingChanges: replacement,
        },
      }),
    ).toBe(replacement);
  });

  it("no genera cambios cuando los datos ya están sincronizados", () => {
    const data = {
      ...EMPTY_DATA,
      meta: {
        lastModified: "2026-06-27T10:00:00.000Z",
        lastSyncedAt: "2026-06-27T10:00:00.000Z",
      },
    };

    expect(buildCloudUploadChanges(data)).toEqual([]);
  });
});
