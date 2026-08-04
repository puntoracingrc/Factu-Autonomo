import { describe, expect, it } from "vitest";
import { issueDocument } from "@/lib/document-integrity";
import { DEFAULT_PROFILE, type Document } from "@/lib/types";
import {
  CENTRAL_INVOICE_AUTHORITY_OPERATION_STATE,
  getCentralInvoiceAuthorityOperationState,
} from "./operation-state";

const ISSUED_AT = "2026-07-24T10:00:00.000Z";

function baseDocument(overrides: Partial<Document> = {}): Document {
  return {
    id: "doc-1",
    type: "factura",
    number: "F-2026-0001",
    date: "2026-07-24",
    dueDate: "2026-08-24",
    client: {
      name: "Cliente de prueba",
      email: "cliente@example.com",
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
    status: "borrador",
    createdAt: "2026-07-24T09:00:00.000Z",
    updatedAt: "2026-07-24T09:00:00.000Z",
    ...overrides,
  };
}

function issuedInvoice(overrides: Partial<Document> = {}): Document {
  return {
    ...issueDocument(baseDocument(), DEFAULT_PROFILE, ISSUED_AT),
    ...overrides,
  };
}

function withCentralAuthority(
  document: Document,
  overrides: Partial<NonNullable<Document["centralInvoiceAuthority"]>> = {},
): Document {
  return {
    ...document,
    centralInvoiceAuthority: {
      schemaVersion: 1,
      source: "central_invoice_authority",
      serverDocumentId: "server-doc-1",
      identityId: "identity-1",
      outboxEventId: "event-1",
      eventType: "invoice_issued",
      fullNumber: document.number,
      sequence: 1,
      documentVersion: 1,
      receivedAt: "2026-07-24T10:00:01.000Z",
      ...overrides,
    },
  };
}

describe("central invoice authority operation state", () => {
  it("mantiene los documentos sin identidad central como locales", () => {
    const state = getCentralInvoiceAuthorityOperationState(issuedInvoice());

    expect(state).toEqual({
      schema: CENTRAL_INVOICE_AUTHORITY_OPERATION_STATE,
      kind: "local_only",
      tone: "neutral",
      badgeLabel: null,
      statusHint: null,
      requiresReview: false,
    });
  });

  it("presenta una factura emitida con identidad central coherente", () => {
    const state = getCentralInvoiceAuthorityOperationState(
      withCentralAuthority(issuedInvoice()),
    );

    expect(state.kind).toBe("server_issued");
    expect(state.tone).toBe("success");
    expect(state.badgeLabel).toBe("Servidor central");
    expect(state.statusHint).toContain("servidor central");
    expect(state.requiresReview).toBe(false);
  });

  it("presenta rectificativas centrales cuando el documento tambien lo es", () => {
    const rectification = issuedInvoice({
      id: "rect-1",
      number: "R-2026-0001",
      rectification: {
        originalDocumentId: "doc-1",
        originalNumber: "F-2026-0001",
        originalDate: "2026-07-24",
        reason: "Rectificacion de prueba",
        type: "correccion",
      },
    });

    const state = getCentralInvoiceAuthorityOperationState(
      withCentralAuthority(rectification, {
        eventType: "rectification_issued",
        fullNumber: "R-2026-0001",
      }),
    );

    expect(state.kind).toBe("server_rectification_issued");
    expect(state.badgeLabel).toBe("Servidor central");
    expect(state.statusHint).toContain("Rectificativa emitida");
    expect(state.requiresReview).toBe(false);
  });

  it("presenta reparaciones centrales sin degradar la identidad", () => {
    const state = getCentralInvoiceAuthorityOperationState(
      withCentralAuthority(issuedInvoice(), {
        eventType: "document_repaired",
      }),
    );

    expect(state.kind).toBe("server_repaired");
    expect(state.badgeLabel).toBe("Servidor central");
    expect(state.statusHint).toContain("Documento conciliado");
    expect(state.requiresReview).toBe(false);
  });

  it("mantiene como emitida central una factura cuyo ultimo evento fue cobro", () => {
    const state = getCentralInvoiceAuthorityOperationState(
      withCentralAuthority(
        issuedInvoice({
          status: "pagado",
          paymentStatus: "paid",
          paidAt: "2026-07-28T09:00:00.000Z",
        }),
        {
          eventType: "invoice_collection_updated",
          outboxEventId: "event-paid-1",
          documentVersion: 2,
        },
      ),
    );

    expect(state.kind).toBe("server_issued");
    expect(state.badgeLabel).toBe("Servidor central");
    expect(state.requiresReview).toBe(false);
  });

  it("mantiene como emitida central una factura cuyo ultimo evento fue una relacion", () => {
    const state = getCentralInvoiceAuthorityOperationState(
      withCentralAuthority(issuedInvoice(), {
        eventType: "invoice_relationship_updated",
        outboxEventId: "event-relationship-1",
        documentVersion: 2,
      }),
    );

    expect(state.kind).toBe("server_issued");
    expect(state.badgeLabel).toBe("Servidor central");
    expect(state.requiresReview).toBe(false);
  });

  it("pide revision si la identidad central no coincide con el documento", () => {
    const state = getCentralInvoiceAuthorityOperationState(
      withCentralAuthority(issuedInvoice(), {
        fullNumber: "F-2026-9999",
      }),
    );

    expect(state.kind).toBe("requires_review");
    expect(state.tone).toBe("warning");
    expect(state.badgeLabel).toBe("Revisar servidor");
    expect(state.statusHint).toContain("Requiere revisión");
    expect(state.requiresReview).toBe(true);
  });

  it("pide revision si el enlace central esta en un borrador", () => {
    const state = getCentralInvoiceAuthorityOperationState(
      withCentralAuthority(baseDocument()),
    );

    expect(state.kind).toBe("requires_review");
    expect(state.requiresReview).toBe(true);
  });
});
