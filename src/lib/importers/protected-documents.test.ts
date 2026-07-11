import { describe, expect, it } from "vitest";
import { issueDocument } from "@/lib/document-integrity";
import { EMPTY_DATA, type Document } from "@/lib/types";
import {
  assertNoProtectedImportReplacements,
  mergeImportedDocumentsPreservingProtected,
} from "./protected-documents";

function draft(id: string, unitPrice: number): Document {
  return {
    id,
    type: "factura",
    number: "F-2026-0001",
    date: "2026-07-11",
    client: { name: "Cliente" },
    items: [
      {
        id: "line-1",
        description: "Servicio",
        quantity: 1,
        unitPrice,
        ivaPercent: 21,
      },
    ],
    status: "borrador",
    createdAt: "2026-07-11T00:00:00.000Z",
    updatedAt: "2026-07-11T00:00:00.000Z",
  };
}

describe("protected importer documents", () => {
  it("preserva un documento emitido frente a una reimportación del mismo ID", () => {
    const issued = issueDocument(
      draft("source:invoice:1", 100),
      EMPTY_DATA.profile,
      "2026-07-11T00:00:00.000Z",
    );
    const replacement = draft(issued.id, 999);

    const merged = mergeImportedDocumentsPreservingProtected({
      current: [issued],
      imported: [replacement],
      belongsToSource: (document) => document.id.startsWith("source:"),
    });

    expect(merged.documents).toHaveLength(1);
    expect(merged.documents[0].documentSnapshot).toEqual(
      issued.documentSnapshot,
    );
    expect(merged.documents[0].items[0].unitPrice).toBe(100);
    expect(merged.acceptedImported).toHaveLength(0);
    expect(merged.preservedDocumentIds).toEqual([issued.id]);
    expect(merged.conflictingDocumentIds).toEqual([issued.id]);
    expect(() => assertNoProtectedImportReplacements(merged)).toThrow(
      "No se aplicó ningún cambio",
    );
  });

  it("permite una reimportación idempotente ignorando IDs y timestamps técnicos", () => {
    const issued = issueDocument(
      draft("source:invoice:1", 100),
      EMPTY_DATA.profile,
      "2026-07-11T00:00:00.000Z",
    );
    const equivalent: Document = {
      ...draft(issued.id, 100),
      items: [{ ...draft(issued.id, 100).items[0], id: "linea-nueva" }],
      createdAt: "2026-07-12T00:00:00.000Z",
      updatedAt: "2026-07-12T00:00:00.000Z",
      issuer: issued.issuer
        ? { ...issued.issuer, capturedAt: "2026-07-12T00:00:00.000Z" }
        : undefined,
    };

    const merged = mergeImportedDocumentsPreservingProtected({
      current: [issued],
      imported: [equivalent],
      belongsToSource: (document) => document.id.startsWith("source:"),
    });

    expect(merged.documents).toEqual([issued]);
    expect(merged.conflictingDocumentIds).toEqual([]);
    expect(() => assertNoProtectedImportReplacements(merged)).not.toThrow();
  });

  it("detecta cambios de dirección aunque importes, IDs y fechas coincidan", () => {
    const base = draft("source:invoice:1", 100);
    base.client = {
      ...base.client,
      address: "Calle Mayor 1",
      city: "Madrid",
      postalCode: "28001",
    };
    const issued = issueDocument(
      base,
      EMPTY_DATA.profile,
      "2026-07-11T00:00:00.000Z",
    );
    const changed: Document = {
      ...base,
      client: { ...base.client, city: "Móstoles", postalCode: "28931" },
    };

    const merged = mergeImportedDocumentsPreservingProtected({
      current: [issued],
      imported: [changed],
      belongsToSource: (document) => document.id.startsWith("source:"),
    });

    expect(merged.conflictingDocumentIds).toEqual([issued.id]);
    expect(() => assertNoProtectedImportReplacements(merged)).toThrow(
      "contenido diferente",
    );
  });
});
