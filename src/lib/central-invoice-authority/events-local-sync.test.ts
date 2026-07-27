import { describe, expect, it, vi } from "vitest";

import {
  DEFAULT_PROFILE,
  type BusinessProfile,
  type Document,
} from "@/lib/types";

import { CENTRAL_INVOICE_AUTHORITY_DOCUMENT_FORM_CANARY } from "./document-form-canary";
import {
  CENTRAL_INVOICE_AUTHORITY_EVENTS_LOCAL_SYNC,
  syncCentralInvoiceAuthorityPulledEventsIntoDocuments,
} from "./events-local-sync";
import type {
  CentralInvoiceAuthorityEventsClientJson,
  CentralInvoiceAuthorityPulledBrowserEvent,
} from "./events-client";

const profile: BusinessProfile = {
  ...DEFAULT_PROFILE,
  name: "Empresa Sintetica SL",
  nif: "B12345678",
  address: "Calle Central 1",
  city: "Barcelona",
  postalCode: "08001",
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

describe("central invoice authority local event sync", () => {
  it("descarga eventos centrales, los aplica y avanza solo el cursor confirmado", async () => {
    const pullEvents = vi.fn(async () => ({
      ok: true as const,
      schema: "CENTRAL_INVOICE_AUTHORITY_EVENTS_CLIENT_V1" as const,
      events: [event()],
      nextCursor: {
        afterCreatedAt: "2026-07-27T12:00:00.000Z",
        afterEventId: "event-1",
      },
    }));

    const result = await syncCentralInvoiceAuthorityPulledEventsIntoDocuments(
      {
        documents: [],
        profile,
        cursor: {
          afterCreatedAt: "2026-07-27T11:00:00.000Z",
          afterEventId: "event-0",
        },
        limit: 25,
        receivedAt: "2026-07-27T12:01:00.000Z",
      },
      { pullEvents },
    );

    expect(pullEvents).toHaveBeenCalledWith({
      afterCreatedAt: "2026-07-27T11:00:00.000Z",
      afterEventId: "event-0",
      limit: 25,
    });
    expect(result).toMatchObject({
      ok: true,
      schema: CENTRAL_INVOICE_AUTHORITY_EVENTS_LOCAL_SYNC,
      pulledEvents: 1,
      applied: [
        {
          eventId: "event-1",
          fullNumber: "F-2026-0001",
          action: "inserted",
        },
      ],
      cursorToPersist: {
        afterEventId: "event-1",
      },
    });
    expect(result.documents).toHaveLength(1);
    expect(result.documents[0]?.centralInvoiceAuthority?.outboxEventId).toBe(
      "event-1",
    );
  });

  it("mantiene documentos y cursor si la lectura central falla", async () => {
    const local = document();
    const cursor = {
      afterCreatedAt: "2026-07-27T11:00:00.000Z",
      afterEventId: "event-0",
    };

    const result = await syncCentralInvoiceAuthorityPulledEventsIntoDocuments(
      {
        documents: [local],
        profile,
        cursor,
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

    expect(result).toEqual({
      ok: false,
      schema: CENTRAL_INVOICE_AUTHORITY_EVENTS_LOCAL_SYNC,
      code: "CENTRAL_AUTHORITY_EVENTS_SESSION_REQUIRED",
      message: "Sesion requerida.",
      status: 401,
      documents: [local],
      pulledEvents: 0,
      applied: [],
      skipped: [],
      conflicts: [],
      cursorToPersist: cursor,
      serverNextCursor: null,
    });
  });

  it("no entrega cambios parciales ni avanza cursor cuando hay numero duplicado", async () => {
    const local = document({ id: "local-other" });
    const remoteDoc = document({ id: "remote-document-1" });
    const cursor = {
      afterCreatedAt: "2026-07-27T11:00:00.000Z",
      afterEventId: "event-0",
    };

    const result = await syncCentralInvoiceAuthorityPulledEventsIntoDocuments(
      {
        documents: [local],
        profile,
        cursor,
      },
      {
        pullEvents: vi.fn(async () => ({
          ok: true as const,
          schema: "CENTRAL_INVOICE_AUTHORITY_EVENTS_CLIENT_V1" as const,
          events: [event({}, remoteDoc)],
          nextCursor: {
            afterCreatedAt: "2026-07-27T12:00:00.000Z",
            afterEventId: "event-1",
          },
        })),
      },
    );

    expect(result).toMatchObject({
      ok: false,
      code: "CENTRAL_AUTHORITY_EVENTS_LOCAL_CONFLICT",
      status: 409,
      documents: [local],
      applied: [],
      cursorToPersist: cursor,
      serverNextCursor: {
        afterEventId: "event-1",
      },
      conflicts: [
        {
          eventId: "event-1",
          fullNumber: "F-2026-0001",
          code: "duplicate_fiscal_number",
          localDocumentId: "local-other",
        },
      ],
    });
  });

  it("conserva el cursor anterior cuando no llegan eventos nuevos", async () => {
    const cursor = {
      afterCreatedAt: "2026-07-27T11:00:00.000Z",
      afterEventId: "event-0",
    };

    const result = await syncCentralInvoiceAuthorityPulledEventsIntoDocuments(
      {
        documents: [],
        profile,
        cursor,
      },
      {
        pullEvents: vi.fn(async () => ({
          ok: true as const,
          schema: "CENTRAL_INVOICE_AUTHORITY_EVENTS_CLIENT_V1" as const,
          events: [],
          nextCursor: null,
        })),
      },
    );

    expect(result).toMatchObject({
      ok: true,
      documents: [],
      pulledEvents: 0,
      cursorToPersist: cursor,
      serverNextCursor: null,
    });
  });
});
