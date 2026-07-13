import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  buildCloudReplacementChanges,
  buildCloudUploadChanges,
  clearSyncPending,
  hasUnsyncedChanges,
  isSyncPendingFlag,
  markSyncPending,
} from "./sync-queue";
import { EMPTY_DATA, type Document } from "../types";
import { attestNewImportedDocument } from "../document-integrity/legacy-import-attestation";

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
