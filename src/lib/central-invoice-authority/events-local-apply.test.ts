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

function rectificationDocument(
  overrides: Partial<Document> = {},
  original: Document = document({
    id: "original-invoice-1",
    number: "F-2026-0001",
  }),
): Document {
  return document({
    id: "central-rectification-1",
    number: "R-2026-0001",
    status: "enviado",
    rectification: {
      originalDocumentId: original.id,
      originalNumber: original.number,
      originalDate: original.date,
      reason: "Correccion sintetica",
      type: "correccion",
    },
    items: [
      {
        id: "line-rect-1",
        description: "Correccion",
        quantity: 1,
        unitPrice: -25,
        ivaPercent: 21,
      },
    ],
    ...overrides,
  });
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

  it("aplica un cambio central de cobro sobre una factura ya recibida", () => {
    const local = document({
      centralInvoiceAuthority: {
        schemaVersion: 1,
        source: "central_invoice_authority",
        serverDocumentId: "server-document-1",
        identityId: "identity-1",
        outboxEventId: "event-1",
        eventType: "invoice_issued",
        fullNumber: "F-2026-0001",
        sequence: 1,
        documentVersion: 1,
        emittedHash: "sha256:server-materialized",
        receivedAt: "2026-07-27T12:01:00.000Z",
      },
      paymentStatus: "pending",
      paidAt: undefined,
    });
    const paid = document({
      status: "pagado",
      paymentStatus: "paid",
      paidAt: "2026-07-28T09:00:00.000Z",
      updatedAt: "2026-07-28T09:00:00.000Z",
    });

    const result = applyCentralInvoiceAuthorityPulledEventsToDocuments({
      documents: [local],
      profile,
      events: [
        event(
          {
            eventId: "event-paid-1",
            eventType: "invoice_collection_updated",
            documentVersion: 2,
            createdAt: "2026-07-28T09:00:01.000Z",
          },
          paid,
        ),
      ],
      receivedAt: "2026-07-28T09:00:02.000Z",
    });

    expect(result.conflicts).toEqual([]);
    expect(result.skipped).toEqual([]);
    expect(result.applied).toEqual([
      {
        eventId: "event-paid-1",
        documentId: local.id,
        fullNumber: "F-2026-0001",
        action: "collection_updated",
      },
    ]);
    expect(result.documents[0]).toMatchObject({
      id: local.id,
      status: "pagado",
      paymentStatus: "paid",
      paidAt: "2026-07-28T09:00:00.000Z",
      updatedAt: "2026-07-28T09:00:00.000Z",
      centralInvoiceAuthority: {
        outboxEventId: "event-paid-1",
        eventType: "invoice_collection_updated",
        documentVersion: 2,
      },
    });
    expect(result.documents[0]?.documentSnapshot).toBe(local.documentSnapshot);
    expect(result.documents[0]?.pdfSnapshot).toBe(local.pdfSnapshot);
  });

  it("inserta una rectificativa central y marca la original local", () => {
    const original = document({
      id: "original-invoice-1",
      number: "F-2026-0001",
    });
    const rectification = rectificationDocument({}, original);

    const result = applyCentralInvoiceAuthorityPulledEventsToDocuments({
      documents: [original],
      profile,
      events: [
        event(
          {
            eventId: "event-rect-1",
            documentId: "server-rectification-1",
            identityId: "identity-rect-1",
            eventType: "rectification_issued",
            fullNumber: "R-2026-0001",
            sequence: 1,
            documentVersion: 1,
          },
          rectification,
        ),
      ],
      receivedAt: "2026-07-27T12:01:00.000Z",
    });

    expect(result.conflicts).toEqual([]);
    expect(result.skipped).toEqual([]);
    expect(result.applied).toEqual([
      {
        eventId: "event-rect-1",
        documentId: "central-rectification-1",
        fullNumber: "R-2026-0001",
        action: "inserted",
      },
    ]);
    expect(result.documents).toHaveLength(2);
    expect(result.documents.find((doc) => doc.id === original.id)).toMatchObject({
      status: "rectificada",
      rectifiedById: "central-rectification-1",
      updatedAt: "2026-07-27T12:01:00.000Z",
    });
    expect(
      result.documents.find((doc) => doc.id === "central-rectification-1"),
    ).toMatchObject({
      number: "R-2026-0001",
      documentLifecycle: "issued",
      centralInvoiceAuthority: {
        eventType: "rectification_issued",
        fullNumber: "R-2026-0001",
        identityId: "identity-rect-1",
      },
      rectification: {
        originalDocumentId: original.id,
        originalNumber: original.number,
      },
    });
  });

  it("bloquea una rectificativa central si falta su factura original", () => {
    const rectification = rectificationDocument();

    const result = applyCentralInvoiceAuthorityPulledEventsToDocuments({
      documents: [],
      profile,
      events: [
        event(
          {
            eventId: "event-rect-1",
            documentId: "server-rectification-1",
            identityId: "identity-rect-1",
            eventType: "rectification_issued",
            fullNumber: "R-2026-0001",
          },
          rectification,
        ),
      ],
    });

    expect(result.documents).toEqual([]);
    expect(result.applied).toEqual([]);
    expect(result.conflicts).toEqual([
      {
        eventId: "event-rect-1",
        fullNumber: "R-2026-0001",
        code: "rectification_original_missing",
        centralDocumentId: "server-rectification-1",
      },
    ]);
  });

  it("bloquea una rectificativa central si la original ya enlaza otra rectificativa", () => {
    const original = document({
      id: "original-invoice-1",
      number: "F-2026-0001",
      rectifiedById: "other-rectification",
      status: "rectificada",
    });
    const rectification = rectificationDocument({}, original);

    const result = applyCentralInvoiceAuthorityPulledEventsToDocuments({
      documents: [original],
      profile,
      events: [
        event(
          {
            eventId: "event-rect-1",
            documentId: "server-rectification-1",
            identityId: "identity-rect-1",
            eventType: "rectification_issued",
            fullNumber: "R-2026-0001",
          },
          rectification,
        ),
      ],
    });

    expect(result.documents).toEqual([original]);
    expect(result.applied).toEqual([]);
    expect(result.conflicts).toEqual([
      {
        eventId: "event-rect-1",
        fullNumber: "R-2026-0001",
        code: "rectification_original_already_linked",
        localDocumentId: original.id,
        centralDocumentId: "server-rectification-1",
      },
    ]);
  });

  it("ignora eventos documentales aun no soportados", () => {
    const result = applyCentralInvoiceAuthorityPulledEventsToDocuments({
      documents: [],
      profile,
      events: [event({ eventType: "document_repaired" })],
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
