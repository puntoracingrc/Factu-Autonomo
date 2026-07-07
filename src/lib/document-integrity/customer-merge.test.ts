import { describe, expect, it } from "vitest";
import { customerToClient } from "@/lib/customers";
import { issueDocument } from "@/lib/document-integrity";
import { buildPdfViewModelForDocument } from "@/lib/document-integrity/pdf-source";
import {
  applyCustomerMergeToDocument,
  findDocumentsForCustomer,
  isDocumentCustomerSnapshotProtected,
  mergeCustomerRecords,
} from "@/lib/document-integrity/customer-merge";
import type { BusinessProfile, Customer, Document } from "@/lib/types";

const NOW = "2026-06-24T10:00:00.000Z";

const keep: Customer = {
  id: "customer-keep",
  firstName: "Ana",
  lastName: "Garcia",
  name: "Ana Garcia",
  nif: "11111111H",
  email: "ana@example.com",
  createdAt: "2026-06-01T10:00:00.000Z",
  updatedAt: "2026-06-01T10:00:00.000Z",
};

const removed: Customer = {
  id: "customer-removed",
  firstName: "Ana Maria",
  lastName: "Garcia",
  name: "Ana Maria Garcia",
  nif: "22222222J",
  phone: "600111222",
  createdAt: "2026-06-01T10:00:00.000Z",
  updatedAt: "2026-06-01T10:00:00.000Z",
};

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
      presupuesto: 1,
      recibo: 1,
    },
    formats: {
      factura: { template: "F-{year}-{num}", padding: 4 },
      factura_rectificativa: { template: "FR-{year}-{num}", padding: 4 },
      presupuesto: { template: "P-{year}-{num}", padding: 4 },
      recibo: { template: "R-{year}-{num}", padding: 4 },
    },
  },
};

function draftDocument(overrides: Partial<Document> = {}): Document {
  return {
    id: "doc-1",
    type: "factura",
    number: "F-2026-0001",
    date: "2026-06-24",
    customerId: removed.id,
    client: customerToClient(removed),
    items: [
      {
        id: "line-1",
        description: "Servicio",
        quantity: 1,
        unitPrice: 100,
        ivaPercent: 21,
      },
    ],
    notes: "Nota original",
    paymentTerms: "Transferencia",
    status: "borrador",
    createdAt: "2026-06-24T09:00:00.000Z",
    updatedAt: "2026-06-24T09:00:00.000Z",
    ...overrides,
  };
}

function issuedDocument(overrides: Partial<Document> = {}): Document {
  return issueDocument(draftDocument(overrides), profile, NOW);
}

describe("safe customer merge", () => {
  it("mergeCustomerRecords elimina secundarios y conserva aliases en el maestro", () => {
    const result = mergeCustomerRecords([keep, removed], keep.id, [removed.id], NOW);

    expect(result?.customers).toHaveLength(1);
    expect(result?.keep.id).toBe(keep.id);
    expect(result?.keep.mergedCustomerIds).toEqual([removed.id]);
    expect(result?.keep.phone).toBe(removed.phone);
    expect(result?.removed.map((customer) => customer.id)).toEqual([removed.id]);
  });

  it("factura emitida con documentSnapshot.customer no cambia tras merge", () => {
    const issued = issuedDocument();
    const beforeClient = issued.client;
    const beforeSnapshot = issued.documentSnapshot!;
    const beforePdfSnapshot = issued.pdfSnapshot!;

    const merged = applyCustomerMergeToDocument(issued, keep, [removed]);

    expect(merged.customerId).toBe(keep.id);
    expect(merged.client).toEqual(beforeClient);
    expect(merged.documentSnapshot).toBe(beforeSnapshot);
    expect(merged.documentSnapshot?.customer).toEqual(beforeSnapshot.customer);
    expect(merged.documentSnapshot?.snapshotHash).toBe(
      beforeSnapshot.snapshotHash,
    );
    expect(merged.pdfSnapshot).toBe(beforePdfSnapshot);
    expect(merged.pdfSnapshot?.contentHash).toBe(beforePdfSnapshot.contentHash);
  });

  it("PDF histórico tras merge sigue usando el cliente congelado", () => {
    const issued = issuedDocument();
    const merged = applyCustomerMergeToDocument(issued, keep, [removed]);
    const view = buildPdfViewModelForDocument(merged, {
      ...profile,
      name: "Negocio cambiado",
    });

    expect(view.source).toBe("snapshot");
    expect(view.doc.client).toEqual(issued.documentSnapshot?.customer);
    expect(view.doc.client).not.toEqual(customerToClient(keep));
    expect(view.documentSnapshot?.snapshotHash).toBe(
      issued.documentSnapshot?.snapshotHash,
    );
    expect(view.pdfSnapshot?.contentHash).toBe(issued.pdfSnapshot?.contentHash);
  });

  it("factura emitida legacy sin snapshot no cambia document.client", () => {
    const legacy = draftDocument({
      status: "enviado",
      documentSnapshot: undefined,
      pdfSnapshot: undefined,
    });

    const merged = applyCustomerMergeToDocument(legacy, keep, [removed]);

    expect(isDocumentCustomerSnapshotProtected(legacy)).toBe(true);
    expect(merged.customerId).toBe(keep.id);
    expect(merged.client).toEqual(legacy.client);
    expect(merged.documentSnapshot).toBeUndefined();
  });

  it("documento issued/locked/not_sent no cambia document.client", () => {
    const issued = issuedDocument();

    const merged = applyCustomerMergeToDocument(issued, keep, [removed]);

    expect(merged.customerId).toBe(keep.id);
    expect(merged.client).toEqual(issued.client);
    expect(merged.documentLifecycle).toBe("issued");
    expect(merged.integrityLock).toBe("locked");
    expect(merged.deliveryStatus).toBe("not_sent");
  });

  it("presupuesto emitido no cambia document.client", () => {
    const quote = issuedDocument({
      type: "presupuesto",
      number: "P-2026-0001",
      verifactu: undefined,
    });

    const merged = applyCustomerMergeToDocument(quote, keep, [removed]);

    expect(merged.customerId).toBe(keep.id);
    expect(merged.client).toEqual(quote.client);
  });

  it("recibo emitido no cambia document.client", () => {
    const receipt = issuedDocument({
      type: "recibo",
      number: "R-2026-0001",
      verifactu: undefined,
    });

    const merged = applyCustomerMergeToDocument(receipt, keep, [removed]);

    expect(merged.customerId).toBe(keep.id);
    expect(merged.client).toEqual(receipt.client);
  });

  it("borrador no cambia document.client si updateDraftDocuments=false", () => {
    const draft = draftDocument();

    const merged = applyCustomerMergeToDocument(draft, keep, [removed], {
      updateDraftDocuments: false,
    });

    expect(merged.customerId).toBe(keep.id);
    expect(merged.client).toEqual(draft.client);
  });

  it("borrador cambia document.client solo con updateDraftDocuments=true", () => {
    const draft = draftDocument();

    const merged = applyCustomerMergeToDocument(draft, keep, [removed], {
      updateDraftDocuments: true,
    });

    expect(merged.customerId).toBe(keep.id);
    expect(merged.client).toEqual(customerToClient(keep));
  });

  it("customerId de emitidos puede apuntar al maestro sin cambiar snapshot", () => {
    const issued = issuedDocument({ customerId: removed.id });

    const merged = applyCustomerMergeToDocument(issued, keep, [removed]);

    expect(merged.customerId).toBe(keep.id);
    expect(merged.documentSnapshot?.customer).toEqual(
      issued.documentSnapshot?.customer,
    );
  });

  it("findDocumentsForCustomer encuentra históricos fusionados por customerId maestro", () => {
    const mergedCustomer = { ...keep, mergedCustomerIds: [removed.id] };
    const historical = applyCustomerMergeToDocument(
      issuedDocument({ id: "historical" }),
      mergedCustomer,
      [removed],
    );
    const currentDraft = draftDocument({
      id: "current",
      customerId: keep.id,
      client: customerToClient(keep),
    });

    const found = findDocumentsForCustomer(
      [historical, currentDraft],
      mergedCustomer,
    );

    expect(found.map((doc) => doc.id).sort()).toEqual(["current", "historical"]);
  });

  it("no reclama documentos sin customerId solo por NIF compartido si el titular no coincide", () => {
    const personWithSharedNif: Customer = {
      ...removed,
      firstName: "Carmen",
      lastName: "Camí",
      name: "Carmen Camí",
      nif: "B60422417",
    };
    const companyKeep: Customer = {
      ...keep,
      customerType: "company",
      firstName: "Llefisa SL",
      lastName: "",
      name: "Llefisa SL",
      nif: "B60422417",
    };
    const companyInvoice = issuedDocument({
      id: "company-invoice",
      customerId: undefined,
      client: {
        customerType: "company",
        name: "Llefisa SL",
        nif: "B60422417",
      },
    });

    const merged = applyCustomerMergeToDocument(
      companyInvoice,
      companyKeep,
      [personWithSharedNif],
    );

    expect(merged).toBe(companyInvoice);
    expect(merged.customerId).toBeUndefined();
    expect(merged.client.name).toBe("Llefisa SL");
  });

  it("no modifica documentos de clientes no relacionados", () => {
    const other = draftDocument({
      id: "other",
      customerId: "other-customer",
      client: { name: "Otro Cliente", nif: "99999999R" },
    });

    const merged = applyCustomerMergeToDocument(other, keep, [removed], {
      updateDraftDocuments: true,
    });

    expect(merged).toBe(other);
  });
});
