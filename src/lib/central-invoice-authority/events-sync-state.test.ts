import { describe, expect, it } from "vitest";

import { normalizeLoadedData, projectAppDataForPersistence } from "@/lib/storage";
import {
  EMPTY_DATA,
  type AppData,
  type CentralInvoiceAuthorityEventsCursorV1,
  type Document,
} from "@/lib/types";

import {
  CENTRAL_INVOICE_AUTHORITY_EVENTS_LOCAL_SYNC,
  type CentralInvoiceAuthorityEventsLocalSyncResult,
} from "./events-local-sync";
import {
  CENTRAL_INVOICE_AUTHORITY_EVENTS_SYNC_STATE,
  recordCentralInvoiceAuthorityEventsLocalSyncResult,
} from "./events-sync-state";

const cursor0: CentralInvoiceAuthorityEventsCursorV1 = {
  afterCreatedAt: "2026-07-27T10:00:00.000Z",
  afterEventId: "event-0",
};

const cursor1: CentralInvoiceAuthorityEventsCursorV1 = {
  afterCreatedAt: "2026-07-27T11:00:00.000Z",
  afterEventId: "event-1",
};

function document(overrides: Partial<Document> = {}): Document {
  return {
    id: "document-1",
    type: "factura",
    number: "F-2026-0001",
    date: "2026-07-27",
    client: { name: "Cliente Sintetico" },
    items: [],
    status: "enviado",
    createdAt: "2026-07-27T10:59:00.000Z",
    updatedAt: "2026-07-27T11:00:00.000Z",
    ...overrides,
  };
}

function appData(overrides: Partial<AppData> = {}): AppData {
  return {
    ...EMPTY_DATA,
    documents: [document()],
    centralInvoiceAuthorityEventsSync: {
      schemaVersion: 1,
      source: "central_invoice_authority_events",
      cursor: cursor0,
      lastCheckedAt: "2026-07-27T10:00:00.000Z",
      lastResult: {
        schemaVersion: 1,
        status: "ok",
        checkedAt: "2026-07-27T10:00:00.000Z",
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

function okResult(
  overrides: Partial<Extract<CentralInvoiceAuthorityEventsLocalSyncResult, { ok: true }>> = {},
): Extract<CentralInvoiceAuthorityEventsLocalSyncResult, { ok: true }> {
  return {
    ok: true,
    schema: CENTRAL_INVOICE_AUTHORITY_EVENTS_LOCAL_SYNC,
    documents: [document({ id: "document-2", number: "F-2026-0002" })],
    pulledEvents: 1,
    applied: [
      {
        eventId: "event-1",
        documentId: "document-2",
        fullNumber: "F-2026-0002",
        action: "inserted",
      },
    ],
    skipped: [],
    conflicts: [],
    cursorToPersist: cursor1,
    serverNextCursor: cursor1,
    ...overrides,
  };
}

function failedResult(
  overrides: Partial<Extract<CentralInvoiceAuthorityEventsLocalSyncResult, { ok: false }>> = {},
): Extract<CentralInvoiceAuthorityEventsLocalSyncResult, { ok: false }> {
  return {
    ok: false,
    schema: CENTRAL_INVOICE_AUTHORITY_EVENTS_LOCAL_SYNC,
    code: "CENTRAL_AUTHORITY_EVENTS_LOCAL_CONFLICT",
    message: "Revision necesaria.",
    status: 409,
    documents: [document({ id: "document-2", number: "F-2026-0002" })],
    pulledEvents: 1,
    applied: [],
    skipped: [],
    conflicts: [
      {
        eventId: "event-1",
        fullNumber: "F-2026-0001",
        code: "duplicate_fiscal_number",
        localDocumentId: "document-1",
        centralDocumentId: "server-document-1",
      },
    ],
    cursorToPersist: cursor0,
    serverNextCursor: cursor1,
    ...overrides,
  };
}

describe("central invoice authority event sync state", () => {
  it("registra un pull correcto y solo entonces sustituye documentos y cursor", () => {
    const previous = appData();
    const transition = recordCentralInvoiceAuthorityEventsLocalSyncResult({
      data: previous,
      result: okResult(),
      recordedAt: "2026-07-27T11:01:00.000Z",
    });

    expect(CENTRAL_INVOICE_AUTHORITY_EVENTS_SYNC_STATE).toBe(
      "CENTRAL_INVOICE_AUTHORITY_EVENTS_SYNC_STATE_V1",
    );
    expect(transition.data.documents).toEqual([
      expect.objectContaining({ id: "document-2", number: "F-2026-0002" }),
    ]);
    expect(transition.state).toMatchObject({
      schemaVersion: 1,
      source: "central_invoice_authority_events",
      cursor: cursor1,
      lastCheckedAt: "2026-07-27T11:01:00.000Z",
      lastAppliedAt: "2026-07-27T11:01:00.000Z",
      lastResult: {
        status: "ok",
        pulledEvents: 1,
        appliedEvents: 1,
        skippedEvents: 0,
        conflictEvents: 0,
        serverNextCursor: cursor1,
      },
    });
  });

  it("falla cerrado en conflicto, conserva documentos y no avanza cursor", () => {
    const previous = appData();
    const transition = recordCentralInvoiceAuthorityEventsLocalSyncResult({
      data: previous,
      result: failedResult(),
      recordedAt: "2026-07-27T11:01:00.000Z",
    });

    expect(transition.data.documents).toBe(previous.documents);
    expect(transition.state).toMatchObject({
      cursor: cursor0,
      lastConflictAt: "2026-07-27T11:01:00.000Z",
      lastResult: {
        status: "conflict",
        code: "CENTRAL_AUTHORITY_EVENTS_LOCAL_CONFLICT",
        pulledEvents: 1,
        appliedEvents: 0,
        conflictEvents: 1,
        serverNextCursor: cursor1,
      },
    });
  });

  it("registra errores de lectura central sin borrar el cursor previo", () => {
    const previous = appData();
    const transition = recordCentralInvoiceAuthorityEventsLocalSyncResult({
      data: previous,
      result: failedResult({
        code: "CENTRAL_AUTHORITY_EVENTS_NETWORK_ERROR",
        message: "Sin conexion.",
        status: 0,
        pulledEvents: 0,
        conflicts: [],
        cursorToPersist: null,
        serverNextCursor: null,
      }),
      recordedAt: "2026-07-27T11:01:00.000Z",
    });

    expect(transition.data.documents).toBe(previous.documents);
    expect(transition.state).toMatchObject({
      cursor: cursor0,
      lastErrorAt: "2026-07-27T11:01:00.000Z",
      lastResult: {
        status: "error",
        code: "CENTRAL_AUTHORITY_EVENTS_NETWORK_ERROR",
        conflictEvents: 0,
      },
    });
  });

  it("normaliza y persiste solo el estado operacional versionado", () => {
    const normalized = normalizeLoadedData({
      ...EMPTY_DATA,
      centralInvoiceAuthorityEventsSync: {
        schemaVersion: 1,
        source: "central_invoice_authority_events",
        cursor: cursor1,
        lastCheckedAt: "2026-07-27T11:01:00.000Z",
        lastResult: {
          schemaVersion: 1,
          status: "ok",
          checkedAt: "2026-07-27T11:01:00.000Z",
          pulledEvents: 1,
          appliedEvents: 1,
          skippedEvents: 0,
          conflictEvents: 0,
          serverNextCursor: cursor1,
        },
      },
    });

    expect(normalized.centralInvoiceAuthorityEventsSync?.cursor).toEqual(cursor1);
    expect(projectAppDataForPersistence(normalized)).toMatchObject({
      centralInvoiceAuthorityEventsSync: {
        schemaVersion: 1,
        cursor: cursor1,
      },
    });
  });

  it("manda a cuarentena un estado central mal formado", () => {
    const normalized = normalizeLoadedData({
      ...EMPTY_DATA,
      centralInvoiceAuthorityEventsSync: {
        schemaVersion: 2,
        source: "central_invoice_authority_events",
        cursor: cursor1,
      },
    });

    expect(normalized.centralInvoiceAuthorityEventsSync).toBeUndefined();
    expect(normalized.workspaceIntegrityQuarantine).toEqual([
      expect.objectContaining({
        collection: "centralInvoiceAuthorityEventsSync",
        reason: "malformed_record",
      }),
    ]);
  });
});
