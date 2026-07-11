import { describe, expect, it } from "vitest";
import { DEFAULT_PROFILE } from "@/lib/types";
import {
  attachRegisteredVerifactuToSnapshots,
  buildDocumentPdfSnapshot,
  buildDocumentSnapshot,
  buildDocumentSnapshotSeal,
} from "@/lib/document-integrity";
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

  const documentSnapshot = buildDocumentSnapshot(doc, DEFAULT_PROFILE, {
    capturedAt: doc.updatedAt,
    source: "legacy_backfill",
  });
  const pdfSnapshot = buildDocumentPdfSnapshot(
    documentSnapshot,
    DEFAULT_PROFILE,
    doc.updatedAt,
  );

  return {
    ...doc,
    documentSnapshot,
    pdfSnapshot,
    snapshotSeal: buildDocumentSnapshotSeal(
      doc.id,
      documentSnapshot,
      pdfSnapshot,
    ),
    snapshotIntegrityRequired: true,
  };
}

describe("repairDocumentCustomerSnapshot", () => {
  it("bloquea reescribir el titular de un documento emitido sin auditoría", () => {
    const original = issuedInvoice();
    expect(() =>
      repairDocumentCustomerSnapshot(
        original,
        llefisa,
        DEFAULT_PROFILE,
        repairedAt,
      ),
    ).toThrow("historial de reparación auditable");
    expect(original.documentSnapshot?.customer.name).toBe("Carmen Camí");
  });

  it("tampoco bendice deriva viva al intentar una reparación", () => {
    const original = issuedInvoice();
    const drifted: Document = {
      ...original,
      number: "FALSA-VIVA",
      notes: "Nota viva ajena",
      items: [{ ...original.items[0], unitPrice: 999 }],
    };
    expect(() =>
      repairDocumentCustomerSnapshot(
        drifted,
        llefisa,
        DEFAULT_PROFILE,
        repairedAt,
      ),
    ).toThrow("historial de reparación auditable");
    expect(original.documentSnapshot?.items[0].unitPrice).toBe(90);
  });

  it("rechaza reparar y resellar un snapshot ya manipulado", () => {
    const original = issuedInvoice();
    const tampered: Document = {
      ...original,
      documentSnapshot: {
        ...original.documentSnapshot!,
        number: "F-ALTERADA",
      },
    };

    expect(() =>
      repairDocumentCustomerSnapshot(
        tampered,
        llefisa,
        DEFAULT_PROFILE,
        repairedAt,
      ),
    ).toThrow("no supera la comprobación de integridad");
    expect(original.documentSnapshot?.number).toBe("Factura/2937/");
  });

  it("bloquea reescribir el destinatario después del registro VeriFactu", () => {
    const registered = attachRegisteredVerifactuToSnapshots({
      ...issuedInvoice(),
      verifactuPersistence: "server_confirmed",
      verifactu: {
        recordHash: "A".repeat(64),
        previousHash: "",
        recordTimestamp: "2026-07-07T19:00:00+02:00",
        qrUrl: "https://example.invalid/qr",
        status: "test_registered",
        recordType: "alta",
        environment: "test",
      },
    });

    expect(() =>
      repairDocumentCustomerSnapshot(
        registered,
        llefisa,
        DEFAULT_PROFILE,
        repairedAt,
      ),
    ).toThrow("historial de reparación auditable");
  });

  it("en borradores sin snapshot solo cambia el cliente visible", () => {
    const draft: Document = {
      ...issuedInvoice(),
      status: "borrador",
      documentLifecycle: "draft",
      integrityLock: "unlocked",
      documentSnapshot: undefined,
      pdfSnapshot: undefined,
      snapshotSeal: undefined,
      snapshotIntegrityRequired: undefined,
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
