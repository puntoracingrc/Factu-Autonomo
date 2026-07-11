import { describe, expect, it } from "vitest";
import { issueDocument, markDocumentPaid } from "../document-integrity";
import { issueDraftDocumentWithStatus } from "../document-integrity/issuance";
import { captureIssuerSnapshot } from "../issuer-snapshot";
import { DEFAULT_PROFILE, type Document } from "../types";
import { selectCanonicalFiscalDocumentsForExport } from "./fiscal-export-documents";

const NOW = "2026-07-11T10:00:00.000Z";
const profile = {
  ...DEFAULT_PROFILE,
  name: "Autónomo Test",
  nif: "11111111H",
};

function invoiceDraft(overrides: Partial<Document> = {}): Document {
  return {
    id: "invoice-1",
    type: "factura",
    number: "F-2026-0001",
    date: "2026-07-11",
    client: { name: "Cliente Test" },
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
    createdAt: NOW,
    updatedAt: NOW,
    ...overrides,
  };
}

function select(documents: Document[]) {
  return selectCanonicalFiscalDocumentsForExport(
    documents,
    profile,
    () => true,
  );
}

describe("selectCanonicalFiscalDocumentsForExport", () => {
  it("ignora un borrador legítimo aunque una vista previa adjuntase emisor", () => {
    const previewDraft = invoiceDraft({
      issuer: captureIssuerSnapshot(profile, NOW),
    });

    expect(select([previewDraft])).toEqual({
      documents: [],
      blockedDocuments: [],
    });
  });

  it("bloquea una factura sellada disfrazada como recibo automático", () => {
    const issued = issueDocument(invoiceDraft(), profile, NOW);
    const disguised: Document = {
      ...issued,
      type: "recibo",
      sourceDocumentId: "fake-source",
    };

    const result = select([disguised]);

    expect(result.documents).toHaveLength(0);
    expect(result.blockedDocuments).toEqual([
      expect.objectContaining({
        id: issued.id,
        issues: ["document_relationship_invalid"],
      }),
    ]);
  });

  it("bloquea una factura aunque manipulen ambos tipos para disfrazarla de presupuesto", () => {
    const issued = issueDocument(invoiceDraft(), profile, NOW);
    const disguised: Document = {
      ...issued,
      type: "presupuesto",
      status: "borrador",
      documentSnapshot: {
        ...issued.documentSnapshot!,
        documentType: "presupuesto",
        documentKind: "presupuesto",
      },
    };

    const result = select([disguised]);

    expect(result.documents).toHaveLength(0);
    expect(result.blockedDocuments).toEqual([
      expect.objectContaining({
        id: issued.id,
        issues: expect.arrayContaining(["document_hash_mismatch"]),
      }),
    ]);
  });

  it("bloquea una emisión despojada de evidencia y mutada a presupuesto", () => {
    const issued = issueDocument(invoiceDraft(), profile, NOW);
    const stripped: Document = {
      ...issued,
      type: "presupuesto",
      status: "borrador",
      documentSnapshot: undefined,
      pdfSnapshot: undefined,
      snapshotSeal: undefined,
      snapshotIntegrityRequired: undefined,
      snapshotIntegrity: undefined,
    };

    const result = select([stripped]);

    expect(result.documents).toHaveLength(0);
    expect(result.blockedDocuments).toEqual([
      expect.objectContaining({
        id: issued.id,
        issues: expect.arrayContaining(["document_snapshot_missing"]),
      }),
    ]);
  });

  it("bloquea estados y vínculos vivos que excluirían una factura sin soporte", () => {
    const issued = issueDocument(invoiceDraft(), profile, NOW);

    for (const drifted of [
      { ...issued, status: "anulada" as const },
      { ...issued, rectifiedById: "missing-rectification" },
    ]) {
      const result = select([drifted]);
      expect(result.documents).toHaveLength(0);
      expect(result.blockedDocuments).toEqual([
        expect.objectContaining({
          id: issued.id,
          issues: ["document_relationship_invalid"],
        }),
      ]);
    }
  });

  it("excluye un recibo automático solo después de verificar su factura", () => {
    const invoice = markDocumentPaid(
      issueDocument(
        invoiceDraft({ receiptDocumentId: "receipt-1" }),
        profile,
        NOW,
      ),
      NOW,
    );
    const receipt = issueDraftDocumentWithStatus(
      {
        ...invoiceDraft({
          id: "receipt-1",
          type: "recibo",
          number: "R-2026-0001",
          sourceDocumentId: invoice.id,
          receiptDocumentId: undefined,
        }),
      },
      "pagado",
      profile,
      NOW,
    );

    const result = select([invoice, receipt]);

    expect(result.blockedDocuments).toHaveLength(0);
    expect(result.documents.map((document) => document.id)).toEqual([
      invoice.id,
    ]);
  });

  it("bloquea un recibo con vínculo unilateral aunque apunte a una factura canónica", () => {
    const invoice = issueDocument(invoiceDraft(), profile, NOW);
    const receipt = issueDraftDocumentWithStatus(
      invoiceDraft({
        id: "receipt-1",
        type: "recibo",
        number: "R-2026-0001",
        sourceDocumentId: invoice.id,
      }),
      "pagado",
      profile,
      NOW,
    );

    const result = select([invoice, receipt]);

    expect(result.documents.map((document) => document.id)).toEqual([
      invoice.id,
    ]);
    expect(result.blockedDocuments).toEqual([
      expect.objectContaining({
        id: receipt.id,
        issues: ["document_relationship_invalid"],
      }),
    ]);
  });

  it("no permite que fechas vivas y evidencia corrupta oculten un bloqueo fuera del periodo", () => {
    const issued = issueDocument(
      invoiceDraft({ date: "2026-04-15" }),
      profile,
      NOW,
    );
    const corrupted: Document = {
      ...issued,
      date: "2026-07-15",
      documentSnapshot: {
        ...issued.documentSnapshot!,
        date: "2026-07-15",
      },
    };

    const result = selectCanonicalFiscalDocumentsForExport(
      [corrupted],
      profile,
      (date) => date >= "2026-04-01" && date <= "2026-06-30",
    );

    expect(result.documents).toHaveLength(0);
    expect(result.blockedDocuments).toEqual([
      expect.objectContaining({
        id: issued.id,
        issues: expect.arrayContaining(["document_hash_mismatch"]),
      }),
    ]);
  });

  it("acepta una relación rectificativa completa y verificable", () => {
    const original = issueDocument(invoiceDraft(), profile, NOW);
    const rectification = issueDocument(
      invoiceDraft({
        id: "rectification-1",
        number: "FR-2026-0001",
        date: "2026-07-12",
        items: [
          {
            id: "rectification-line",
            description: "Anulación",
            quantity: 1,
            unitPrice: -100,
            ivaPercent: 21,
          },
        ],
        rectification: {
          originalDocumentId: original.id,
          originalNumber: original.number,
          originalDate: original.date,
          reason: "Anulación",
          type: "anulacion",
        },
        documentLifecycle: "draft",
        integrityLock: "unlocked",
      }),
      profile,
      NOW,
    );
    const linkedOriginal: Document = {
      ...original,
      status: "anulada",
      rectifiedById: rectification.id,
    };

    const result = select([linkedOriginal, rectification]);

    expect(result.blockedDocuments).toHaveLength(0);
    expect(result.documents.map((document) => document.id)).toEqual([
      original.id,
      rectification.id,
    ]);
  });
});
