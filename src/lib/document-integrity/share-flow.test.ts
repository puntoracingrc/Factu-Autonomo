import { describe, expect, it } from "vitest";
import { issueDocument, markDocumentSent } from ".";
import { shareDocumentWithIntegrity } from "./share-flow";
import type { BusinessProfile, Document } from "../types";

const NOW = "2026-06-24T10:00:00.000Z";

const profile: BusinessProfile = {
  name: "Punto Racing RC",
  nif: "12345678Z",
  address: "Calle Mayor 1",
  city: "Barcelona",
  postalCode: "08001",
  phone: "600000000",
  email: "hola@example.com",
  iva: { rates: [0, 4, 10, 21], defaultRate: 21 },
  numbering: {
    year: 2026,
    lastSequence: {
      factura: 1,
      factura_rectificativa: 0,
      presupuesto: 0,
      recibo: 0,
    },
    formats: {
      factura: { template: "F-{year}-{num}", padding: 4 },
      factura_rectificativa: { template: "FR-{year}-{num}", padding: 4 },
      presupuesto: { template: "P-{year}-{num}", padding: 4 },
      recibo: { template: "R-{year}-{num}", padding: 4 },
    },
  },
};

function draftInvoice(): Document {
  return {
    id: "doc-1",
    type: "factura",
    number: "F-2026-0001",
    date: "2026-06-24",
    client: {
      name: "Ana García",
      email: "ana@example.com",
      phone: "600111222",
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
    notes: "Gracias",
    paymentTerms: "Transferencia",
    status: "borrador",
    createdAt: "2026-06-24T09:00:00.000Z",
    updatedAt: "2026-06-24T09:00:00.000Z",
  };
}

describe("shareDocumentWithIntegrity", () => {
  it("si persistir la emisión falla no realiza el envío", async () => {
    let shareCalls = 0;

    await expect(
      shareDocumentWithIntegrity({
        doc: draftInvoice(),
        issueDocument: () => {
          throw new Error("persistencia fallida");
        },
        share: async () => {
          shareCalls += 1;
        },
        markDocumentSent: () => null,
      }),
    ).rejects.toThrow("persistencia fallida");

    expect(shareCalls).toBe(0);
  });

  it("emite un borrador antes de compartir y marca enviado después", async () => {
    const order: string[] = [];
    let stored = draftInvoice();

    const result = await shareDocumentWithIntegrity({
      doc: stored,
      issueDocument: (id) => {
        order.push(`issue:${id}`);
        stored = issueDocument(stored, profile, NOW);
        return stored;
      },
      share: async (doc) => {
        order.push(`share:${doc.id}:${doc.documentLifecycle}:${doc.deliveryStatus}`);
        expect(doc.number).toBe("F-2026-0001");
      },
      markDocumentSent: (id) => {
        order.push(`sent:${id}`);
        stored = markDocumentSent(stored, "2026-06-24T10:05:00.000Z");
        return stored;
      },
    });

    expect(order).toEqual([
      "issue:doc-1",
      "share:doc-1:issued:not_sent",
      "sent:doc-1",
    ]);
    expect(result.sharedDocument.documentLifecycle).toBe("issued");
    expect(result.sharedDocument.deliveryStatus).toBe("not_sent");
    expect(result.finalDocument.deliveryStatus).toBe("sent");
  });

  it("si falla el envío conserva issued/locked/not_sent", async () => {
    let stored = draftInvoice();
    let markSentCalls = 0;

    await expect(
      shareDocumentWithIntegrity({
        doc: stored,
        issueDocument: () => {
          stored = issueDocument(stored, profile, NOW);
          return stored;
        },
        share: async () => {
          throw new Error("fallo externo");
        },
        markDocumentSent: () => {
          markSentCalls += 1;
          return null;
        },
      }),
    ).rejects.toThrow("fallo externo");

    expect(stored.documentLifecycle).toBe("issued");
    expect(stored.integrityLock).toBe("locked");
    expect(stored.deliveryStatus).toBe("not_sent");
    expect(stored.status).toBe("enviado");
    expect(markSentCalls).toBe(0);
  });

  it("un reintento no vuelve a emitir ni cambia el número", async () => {
    let stored = issueDocument(draftInvoice(), profile, NOW);
    let issueCalls = 0;

    await shareDocumentWithIntegrity({
      doc: stored,
      issueDocument: () => {
        issueCalls += 1;
        return stored;
      },
      share: async (doc) => {
        expect(doc.number).toBe("F-2026-0001");
        expect(doc.documentLifecycle).toBe("issued");
      },
      markDocumentSent: () => {
        stored = markDocumentSent(stored, "2026-06-24T10:05:00.000Z");
        return stored;
      },
    });

    expect(issueCalls).toBe(0);
    expect(stored.number).toBe("F-2026-0001");
    expect(stored.deliveryStatus).toBe("sent");
  });

  it("dos intentos rápidos no crean dos emisiones", async () => {
    let stored = draftInvoice();
    let issueCalls = 0;
    let shareCalls = 0;

    const issueOnce = () => {
      if (stored.documentLifecycle === "issued") return stored;
      issueCalls += 1;
      stored = issueDocument(stored, profile, NOW);
      return stored;
    };

    await Promise.all([
      shareDocumentWithIntegrity({
        doc: stored,
        issueDocument: issueOnce,
        share: async () => {
          shareCalls += 1;
        },
        markDocumentSent: () => stored,
      }),
      shareDocumentWithIntegrity({
        doc: stored,
        issueDocument: issueOnce,
        share: async () => {
          shareCalls += 1;
        },
        markDocumentSent: () => stored,
      }),
    ]);

    expect(issueCalls).toBe(1);
    expect(shareCalls).toBe(2);
    expect(stored.number).toBe("F-2026-0001");
  });
});
