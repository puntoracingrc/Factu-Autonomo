import { describe, expect, it } from "vitest";
import { createDemoWorkspaceData } from "./demo-workspace";
import { applyDocumentLinkUpdate } from "./document-links";
import { inspectDocumentSnapshotsIntegrity } from "./document-integrity";
import { normalizeLoadedData } from "./storage";
import { documentAmounts } from "./vat-regime";

const REFERENCE_DATE = new Date("2026-07-11T10:00:00.000Z");

describe("demo workspace", () => {
  it("crea la factura emitida con snapshots válidos e importe conservado", () => {
    const data = createDemoWorkspaceData(REFERENCE_DATE);
    const invoice = data.documents.find(
      (document) => document.id === "demo-invoice-1",
    );

    expect(invoice).toBeDefined();
    expect(inspectDocumentSnapshotsIntegrity(invoice!)).toMatchObject({
      ok: true,
    });
    expect(invoice?.snapshotIntegrity).toBeUndefined();
    expect(documentAmounts(invoice!, false)).toEqual({
      subtotal: 150,
      iva: 31.5,
      total: 181.5,
    });

    const normalized = normalizeLoadedData(data);
    const normalizedInvoice = normalized.documents.find(
      (document) => document.id === "demo-invoice-1",
    );
    expect(normalizedInvoice?.snapshotIntegrity).toBeUndefined();
    expect(documentAmounts(normalizedInvoice!, false).total).toBe(181.5);
  });

  it("vincular y desvincular presupuesto no altera snapshots, sello ni importes", () => {
    const data = createDemoWorkspaceData(REFERENCE_DATE);
    const original = data.documents.find(
      (document) => document.id === "demo-invoice-1",
    )!;
    const protectedEvidence = JSON.stringify({
      documentSnapshot: original.documentSnapshot,
      pdfSnapshot: original.pdfSnapshot,
      snapshotSeal: original.snapshotSeal,
    });

    const linkedDocuments = applyDocumentLinkUpdate(data.documents, {
      relation: "quote_invoice",
      invoiceId: original.id,
      quoteId: "demo-quote-1",
      updatedAt: "2026-07-11T11:00:00.000Z",
    });
    const linked = linkedDocuments.find((document) => document.id === original.id)!;
    expect(linked.sourceQuoteDocumentId).toBe("demo-quote-1");
    expect(
      JSON.stringify({
        documentSnapshot: linked.documentSnapshot,
        pdfSnapshot: linked.pdfSnapshot,
        snapshotSeal: linked.snapshotSeal,
      }),
    ).toBe(protectedEvidence);

    const unlinkedDocuments = applyDocumentLinkUpdate(linkedDocuments, {
      relation: "quote_invoice",
      invoiceId: original.id,
      quoteId: null,
      updatedAt: "2026-07-11T12:00:00.000Z",
    });
    const normalized = normalizeLoadedData({
      ...data,
      documents: unlinkedDocuments,
    });
    const unlinked = normalized.documents.find(
      (document) => document.id === original.id,
    )!;

    expect(unlinked.sourceQuoteDocumentId).toBeUndefined();
    expect(inspectDocumentSnapshotsIntegrity(unlinked).ok).toBe(true);
    expect(unlinked.snapshotIntegrity).toBeUndefined();
    expect(documentAmounts(unlinked, false).total).toBe(181.5);
    expect(
      JSON.stringify({
        documentSnapshot: unlinked.documentSnapshot,
        pdfSnapshot: unlinked.pdfSnapshot,
        snapshotSeal: unlinked.snapshotSeal,
      }),
    ).toBe(protectedEvidence);
  });
});
