import { describe, expect, it } from "vitest";
import { buildDuplicatedDocumentDraft } from "./document-duplication";
import type { Document } from "./types";

function quote(): Document {
  return {
    id: "quote-1",
    type: "presupuesto",
    number: "P-2026-0001",
    date: "2026-07-01",
    customerId: "customer-1",
    client: { name: "Teresa", firstName: "Teresa", lastName: "" },
    items: [
      {
        id: "line-1",
        description: "Servicio",
        quantity: 1,
        unitPrice: 100,
        ivaPercent: 21,
      },
    ],
    notes: "Notas",
    salesTerms: "Validez de 30 días",
    paymentTerms: "Transferencia",
    status: "aceptado",
    issuer: {
      name: "Fiscal",
      nif: "12345678Z",
      address: "Calle 1",
      city: "Madrid",
      postalCode: "28001",
      capturedAt: "2026-07-01T10:00:00.000Z",
    },
    documentLifecycle: "issued",
    integrityLock: "locked",
    deliveryStatus: "sent",
    acceptanceStatus: "accepted",
    acceptedAt: "2026-07-01T10:00:00.000Z",
    createdAt: "2026-07-01T10:00:00.000Z",
    updatedAt: "2026-07-01T10:00:00.000Z",
  };
}

describe("buildDuplicatedDocumentDraft", () => {
  it("copia el contenido y limpia estado, numeracion y bloqueo", () => {
    let nextLine = 1;
    const draft = buildDuplicatedDocumentDraft(quote(), {
      date: "2026-07-03",
      lineIdFactory: () => `copy-line-${nextLine++}`,
    });

    expect(draft).toMatchObject({
      type: "presupuesto",
      date: "2026-07-03",
      customerId: "customer-1",
      client: { name: "Teresa" },
      notes: "Notas",
      salesTerms: "Validez de 30 días",
      paymentTerms: "Transferencia",
      status: "borrador",
      documentLifecycle: "draft",
      integrityLock: "unlocked",
      deliveryStatus: "not_sent",
      acceptanceStatus: "not_applicable",
    });
    expect(draft.items[0]).toMatchObject({
      id: "copy-line-1",
      description: "Servicio",
    });
    expect("issuer" in draft).toBe(false);
    expect("documentSnapshot" in draft).toBe(false);
  });
});
