import { describe, expect, it } from "vitest";

import {
  DEFAULT_PROFILE,
  type BusinessProfile,
  type Document,
} from "@/lib/types";

import { CENTRAL_INVOICE_AUTHORITY_DOCUMENT_FORM_CANARY } from "./document-form-canary";
import {
  CENTRAL_INVOICE_AUTHORITY_EVENTS_LOCAL_APPLY,
  applyCentralInvoiceAuthorityPulledEventsToDocuments,
} from "./events-local-apply";
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

describe("central invoice authority local event apply", () => {
  it("inserta una factura central ausente y reconstruye sellos locales", () => {
    const result = applyCentralInvoiceAuthorityPulledEventsToDocuments({
      documents: [],
      profile,
      events: [event()],
      receivedAt: "2026-07-27T12:01:00.000Z",
    });

    expect(result.schema).toBe(CENTRAL_INVOICE_AUTHORITY_EVENTS_LOCAL_APPLY);
    expect(result.applied).toEqual([
      {
        eventId: "event-1",
        documentId: "local-document-1",
        fullNumber: "F-2026-0001",
        action: "inserted",
      },
    ]);
    expect(result.conflicts).toEqual([]);
    expect(result.documents).toHaveLength(1);
    expect(result.documents[0]).toMatchObject({
      id: "local-document-1",
      number: "F-2026-0001",
      documentLifecycle: "issued",
      integrityLock: "locked",
      centralInvoiceAuthority: {
        schemaVersion: 1,
        serverDocumentId: "server-document-1",
        identityId: "identity-1",
        outboxEventId: "event-1",
        fullNumber: "F-2026-0001",
        documentVersion: 1,
        emittedHash: "sha256:server-materialized",
      },
    });
    expect(result.documents[0]?.documentSnapshot?.number).toBe("F-2026-0001");
    expect(result.documents[0]?.pdfSnapshot).toBeDefined();
    expect(result.documents[0]?.snapshotSeal).toBeDefined();
  });

  it("no pisa una factura local distinta con el mismo numero fiscal", () => {
    const local = document({ id: "local-other" });
    const incoming = document({ id: "remote-doc-1" });
    const result = applyCentralInvoiceAuthorityPulledEventsToDocuments({
      documents: [local],
      profile,
      events: [event({}, incoming)],
      receivedAt: "2026-07-27T12:01:00.000Z",
    });

    expect(result.applied).toEqual([]);
    expect(result.documents).toEqual([local]);
    expect(result.conflicts).toEqual([
      {
        eventId: "event-1",
        fullNumber: "F-2026-0001",
        code: "duplicate_fiscal_number",
        localDocumentId: "local-other",
        centralDocumentId: "server-document-1",
      },
    ]);
  });

  it("anota identidad central en una factura ya existente sin tocar su contenido", () => {
    const local = document();
    const result = applyCentralInvoiceAuthorityPulledEventsToDocuments({
      documents: [local],
      profile,
      events: [event()],
      receivedAt: "2026-07-27T12:01:00.000Z",
    });

    expect(result.documents).toHaveLength(1);
    expect(result.documents[0]).toMatchObject({
      id: local.id,
      number: local.number,
      centralInvoiceAuthority: {
        serverDocumentId: "server-document-1",
        identityId: "identity-1",
        fullNumber: "F-2026-0001",
      },
    });
    expect(result.documents[0]?.items).toEqual(local.items);
    expect(result.applied).toEqual([
      {
        eventId: "event-1",
        documentId: "local-document-1",
        fullNumber: "F-2026-0001",
        action: "metadata_attached",
      },
    ]);
  });

  it("ignora eventos aun no soportados para no mezclar rectificativas", () => {
    const result = applyCentralInvoiceAuthorityPulledEventsToDocuments({
      documents: [],
      profile,
      events: [event({ eventType: "rectification_issued" })],
    });

    expect(result.documents).toEqual([]);
    expect(result.skipped).toEqual([
      {
        eventId: "event-1",
        fullNumber: "F-2026-0001",
        code: "unsupported_event_type",
      },
    ]);
  });

  it("rechaza payloads que no coinciden con el numero materializado", () => {
    const incoming = document({ number: "F-2026-9999" });
    const result = applyCentralInvoiceAuthorityPulledEventsToDocuments({
      documents: [],
      profile,
      events: [event({ fullNumber: "F-2026-0001" }, incoming)],
    });

    expect(result.documents).toEqual([]);
    expect(result.skipped).toEqual([
      {
        eventId: "event-1",
        fullNumber: "F-2026-0001",
        code: "invalid_document_payload",
      },
    ]);
  });
});
