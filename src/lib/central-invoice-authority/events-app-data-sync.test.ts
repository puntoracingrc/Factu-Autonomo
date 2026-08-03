import { describe, expect, it, vi } from "vitest";

import { EMPTY_DATA, type AppData, type Document } from "@/lib/types";

import { CENTRAL_INVOICE_AUTHORITY_DOCUMENT_FORM_CANARY } from "./document-form-canary";
import {
  CENTRAL_INVOICE_AUTHORITY_EVENTS_APP_DATA_SYNC,
  buildCentralInvoiceAuthorityEventsAppDataTransition,
  pullCentralInvoiceAuthorityEventsForAppData,
  selectCentralInvoiceAuthorityEventsSyncBaseline,
  shouldReplayCentralInvoiceAuthorityEventsFromStart,
  syncCentralInvoiceAuthorityEventsIntoAppData,
} from "./events-app-data-sync";
import type {
  CentralInvoiceAuthorityEventsClientJson,
  CentralInvoiceAuthorityPulledBrowserEvent,
} from "./events-client";

const cursor0 = {
  afterCreatedAt: "2026-07-27T11:00:00.000Z",
  afterEventId: "event-0",
};

const cursor1 = {
  afterCreatedAt: "2026-07-27T12:00:00.000Z",
  afterEventId: "event-1",
};

function document(overrides: Partial<Document> = {}): Document {
  return {
    id: "local-document-1",
    type: "factura",
    number: "F-2026-0001",
    date: "2026-07-27",
    client: {
      name: "Cliente Sintetico",
      nif: "12345678Z",
      address: "Calle Cliente 1",
      city: "Barcelona",
      postalCode: "08002",
    },
    items: [
      {
        id: "line-1",
        description: "Servicio",
        quantity: 1,
        unitPrice: 100,
        ivaPercent: 21,
      },
    ],
    status: "enviado",
    createdAt: "2026-07-27T11:59:00.000Z",
    updatedAt: "2026-07-27T12:00:00.000Z",
    ...overrides,
  };
}

function appData(overrides: Partial<AppData> = {}): AppData {
  return {
    ...EMPTY_DATA,
    documents: [],
    centralInvoiceAuthorityEventsSync: {
      schemaVersion: 1,
      source: "central_invoice_authority_events",
      cursor: cursor0,
      lastCheckedAt: "2026-07-27T11:00:00.000Z",
      lastResult: {
        schemaVersion: 1,
        status: "ok",
        checkedAt: "2026-07-27T11:00:00.000Z",
        pulledEvents: 0,
        appliedEvents: 0,
        skippedEvents: 0,
        conflictEvents: 0,
        serverNextCursor: null,
      },
    },
    ...overrides,
  };
}

function jsonValue(value: unknown): CentralInvoiceAuthorityEventsClientJson {
  return JSON.parse(JSON.stringify(value)) as CentralInvoiceAuthorityEventsClientJson;
}

function event(
  overrides: Partial<CentralInvoiceAuthorityPulledBrowserEvent> = {},
  doc: Document = document(),
): CentralInvoiceAuthorityPulledBrowserEvent {
  return {
    schema: "CENTRAL_INVOICE_AUTHORITY_EVENTS_RPC_ADAPTER_V1",
    eventId: "event-1",
    documentId: "server-document-1",
    identityId: "identity-1",
    eventType: "invoice_issued",
    createdAt: "2026-07-27T12:00:00.000Z",
    fullNumber: doc.number,
    sequence: 1,
    documentVersion: 1,
    documentPayload: {
      schema: CENTRAL_INVOICE_AUTHORITY_DOCUMENT_FORM_CANARY,
      localDocumentId: doc.id,
      document: jsonValue(doc),
      pendingNumber: "__CENTRAL_AUTHORITY_FULL_NUMBER__",
    },
    emittedHash: "sha256:server-materialized",
    safeSummary: {
      kind: "invoice",
      fullNumber: doc.number,
    },
    ...overrides,
  };
}

describe("central invoice authority app data sync", () => {
  it("adopta el estado durable mas avanzado de otra pestana antes de tirar del servidor", () => {
    const memory = appData({
      meta: {
        lastModified: "2026-07-27T11:00:00.000Z",
        pendingChanges: [],
      },
    });
    const persisted = appData({
      documents: [document()],
      centralInvoiceAuthorityEventsSync: {
        ...memory.centralInvoiceAuthorityEventsSync!,
        cursor: cursor1,
      },
      meta: {
        lastModified: "2026-07-27T12:00:00.000Z",
        pendingChanges: [],
      },
    });

    expect(
      selectCentralInvoiceAuthorityEventsSyncBaseline({
        memory,
        persisted,
        persistedMatchesMemory: false,
      }),
    ).toBe(persisted);
  });

  it("no pisa memoria mas reciente con una copia durable atrasada", () => {
    const memory = appData({
      documents: [document()],
      centralInvoiceAuthorityEventsSync: {
        ...appData().centralInvoiceAuthorityEventsSync!,
        cursor: cursor1,
      },
      meta: {
        lastModified: "2026-07-27T12:00:00.000Z",
        pendingChanges: [],
      },
    });
    const persisted = appData({
      meta: {
        lastModified: "2026-07-27T11:00:00.000Z",
        pendingChanges: [],
      },
    });

    expect(
      selectCentralInvoiceAuthorityEventsSyncBaseline({
        memory,
        persisted,
        persistedMatchesMemory: false,
      }),
    ).toBeNull();
  });

  it("usa el cursor operativo de AppData y construye una transición aplicable", async () => {
    const pullEvents = vi.fn(async () => ({
      ok: true as const,
      schema: "CENTRAL_INVOICE_AUTHORITY_EVENTS_CLIENT_V1" as const,
      events: [event()],
      nextCursor: cursor1,
    }));

    const transition = await syncCentralInvoiceAuthorityEventsIntoAppData(
      {
        data: appData(),
        limit: 25,
        receivedAt: "2026-07-27T12:01:00.000Z",
      },
      { pullEvents },
    );

    expect(pullEvents).toHaveBeenCalledWith({
      afterCreatedAt: cursor0.afterCreatedAt,
      afterEventId: cursor0.afterEventId,
      limit: 25,
    });
    expect(transition.value.schema).toBe(
      CENTRAL_INVOICE_AUTHORITY_EVENTS_APP_DATA_SYNC,
    );
    expect(transition.data.documents).toHaveLength(1);
    expect(transition.data.centralInvoiceAuthorityEventsSync).toMatchObject({
      cursor: cursor1,
      lastAppliedAt: "2026-07-27T12:01:00.000Z",
      lastResult: {
        status: "ok",
        pulledEvents: 1,
        appliedEvents: 1,
      },
    });
  });

  it("relee desde el inicio si hay cursor pero no queda ninguna factura activa", async () => {
    const stale = appData({
      documents: [],
      centralInvoiceAuthorityEventsSync: {
        ...appData().centralInvoiceAuthorityEventsSync!,
        cursor: cursor1,
      },
    });
    const pullEvents = vi.fn(async () => ({
      ok: true as const,
      schema: "CENTRAL_INVOICE_AUTHORITY_EVENTS_CLIENT_V1" as const,
      events: [event()],
      nextCursor: cursor1,
    }));

    const pulled = await pullCentralInvoiceAuthorityEventsForAppData(
      {
        data: stale,
        limit: 50,
        receivedAt: "2026-07-27T12:01:00.000Z",
        replayFromStartWhenNoActiveInvoices: true,
      },
      { pullEvents },
    );
    const transition = buildCentralInvoiceAuthorityEventsAppDataTransition({
      data: stale,
      pulled,
    });

    expect(shouldReplayCentralInvoiceAuthorityEventsFromStart(stale)).toBe(
      true,
    );
    expect(pullEvents).toHaveBeenCalledWith({
      afterCreatedAt: null,
      afterEventId: null,
      limit: 50,
    });
    expect(transition.data.documents).toHaveLength(1);
    expect(transition.data.centralInvoiceAuthorityEventsSync?.cursor).toEqual(
      cursor1,
    );
  });

  it("no resucita facturas retiradas al comprobar un cursor sin lista activa", () => {
    const retired = appData({
      documents: [],
      testDocumentRetirementBatches: [
        {
          retiredDocuments: [{ originalIndex: 0, document: document() }],
        } as NonNullable<AppData["testDocumentRetirementBatches"]>[number],
      ],
    });

    expect(shouldReplayCentralInvoiceAuthorityEventsFromStart(retired)).toBe(
      false,
    );
  });

  it("prepara un valor que AppStore puede reconstruir sobre la base durable vigente", async () => {
    const pulled = await pullCentralInvoiceAuthorityEventsForAppData(
      {
        data: appData({ documents: [document({ id: "local-other" })] }),
        receivedAt: "2026-07-27T12:01:00.000Z",
      },
      {
        pullEvents: vi.fn(async () => ({
          ok: true as const,
          schema: "CENTRAL_INVOICE_AUTHORITY_EVENTS_CLIENT_V1" as const,
          events: [event({}, document({ id: "remote-document-1" }))],
          nextCursor: cursor1,
        })),
      },
    );

    const current = appData({
      documents: [document({ id: "local-other" })],
    });
    const transition = buildCentralInvoiceAuthorityEventsAppDataTransition({
      data: current,
      pulled,
    });

    expect(transition.data.documents).toBe(current.documents);
    expect(transition.data.centralInvoiceAuthorityEventsSync).toMatchObject({
      cursor: cursor0,
      lastConflictAt: "2026-07-27T12:01:00.000Z",
      lastResult: {
        status: "conflict",
        conflictEvents: 1,
        serverNextCursor: cursor1,
      },
    });
  });

  it("registra errores centrales sin borrar documentos ni avanzar cursor", async () => {
    const local = document();
    const previous = appData({ documents: [local] });
    const transition = await syncCentralInvoiceAuthorityEventsIntoAppData(
      {
        data: previous,
        receivedAt: "2026-07-27T12:01:00.000Z",
      },
      {
        pullEvents: vi.fn(async () => ({
          ok: false as const,
          status: 401,
          code: "CENTRAL_AUTHORITY_EVENTS_SESSION_REQUIRED",
          message: "Sesion requerida.",
        })),
      },
    );

    expect(transition.data.documents).toBe(previous.documents);
    expect(transition.data.documents).toEqual([local]);
    expect(transition.data.centralInvoiceAuthorityEventsSync).toMatchObject({
      cursor: cursor0,
      lastErrorAt: "2026-07-27T12:01:00.000Z",
      lastResult: {
        status: "error",
        code: "CENTRAL_AUTHORITY_EVENTS_SESSION_REQUIRED",
      },
    });
  });
});
