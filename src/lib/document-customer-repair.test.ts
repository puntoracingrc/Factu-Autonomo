import { describe, expect, it } from "vitest";
import { DEFAULT_PROFILE } from "@/lib/types";
import { buildDocumentSnapshot } from "@/lib/document-integrity";
import { repairDocumentCustomerSnapshot } from "@/lib/document-customer-repair";
import type { Customer, Document } from "@/lib/types";

const repairedAt = "2026-07-07T19:00:00.000Z";

const llefisa: Customer = {
  id: "customer-llefisa",
  customerType: "company",
  firstName: "LLEFISA SL",
  lastName: "",
  name: "LLEFISA SL",
  nif: "B60422417",
  streetType: "avenida",
  address: "Diagonal 622 2/1 B",
  city: "Barcelona",
  postalCode: "08021",
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-01T00:00:00.000Z",
};

function issuedInvoice(): Document {
  const doc: Document = {
    id: "doc-2937",
    type: "factura",
    number: "Factura/2937/",
    date: "2026-06-12",
    customerId: "customer-carmen",
    client: {
      name: "Carmen Camí",
      nif: "B60422417",
    },
    items: [
      {
        id: "line-1",
        description: "Reparación de persiana",
        quantity: 1,
        unitPrice: 90,
        ivaPercent: 21,
      },
    ],
    status: "pagado",
    documentLifecycle: "issued",
    integrityLock: "locked",
    createdAt: "2026-06-12T09:00:00.000Z",
    updatedAt: "2026-06-12T09:00:00.000Z",
  };

  return {
    ...doc,
    documentSnapshot: buildDocumentSnapshot(doc, DEFAULT_PROFILE, {
      capturedAt: doc.updatedAt,
      source: "legacy_backfill",
    }),
  };
}

describe("repairDocumentCustomerSnapshot", () => {
  it("reconstruye el titular y el snapshot sin cambiar datos economicos", () => {
    const original = issuedInvoice();
    const repaired = repairDocumentCustomerSnapshot(
      original,
      llefisa,
      DEFAULT_PROFILE,
      repairedAt,
    );

    expect(repaired.customerId).toBe("customer-llefisa");
    expect(repaired.client.name).toBe("LLEFISA SL");
    expect(repaired.client.nif).toBe("B60422417");
    expect(repaired.number).toBe(original.number);
    expect(repaired.date).toBe(original.date);
    expect(repaired.status).toBe("pagado");
    expect(repaired.items).toEqual(original.items);
    expect(repaired.documentLifecycle).toBe("issued");
    expect(repaired.integrityLock).toBe("locked");
    expect(repaired.documentSnapshot?.source).toBe("customer_repair");
    expect(repaired.documentSnapshot?.customer.name).toBe("LLEFISA SL");
    expect(repaired.documentSnapshot?.taxSummary.total).toBe(
      original.documentSnapshot?.taxSummary.total,
    );
    expect(repaired.pdfSnapshot?.contentHash).toBeTruthy();
    expect(repaired.pdfSnapshot?.contentHash).not.toBe(
      original.pdfSnapshot?.contentHash,
    );
  });

  it("en borradores sin snapshot solo cambia el cliente visible", () => {
    const draft: Document = {
      ...issuedInvoice(),
      status: "borrador",
      documentLifecycle: "draft",
      integrityLock: "unlocked",
      documentSnapshot: undefined,
      pdfSnapshot: undefined,
    };

    const repaired = repairDocumentCustomerSnapshot(
      draft,
      llefisa,
      DEFAULT_PROFILE,
      repairedAt,
    );

    expect(repaired.client.name).toBe("LLEFISA SL");
    expect(repaired.documentSnapshot).toBeUndefined();
    expect(repaired.pdfSnapshot).toBeUndefined();
  });
});
