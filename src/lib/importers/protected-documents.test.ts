import { describe, expect, it } from "vitest";
import { issueDocument } from "@/lib/document-integrity";
import { normalizeLoadedData } from "@/lib/storage";
import { EMPTY_DATA, type Document } from "@/lib/types";
import {
  assertAcceptedImportedDocumentsNormalized,
  assertNoProtectedImportReplacements,
  mergeImportedDocumentsPreservingProtected,
  reanalyzeImportAgainstCurrent,
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

  it("preserva una anulación local al reimportar el contenido fiscal original", () => {
    const issued = issueDocument(
      draft("source:invoice:1", 100),
      EMPTY_DATA.profile,
      "2026-07-11T00:00:00.000Z",
    );
    const annulled: Document = {
      ...issued,
      status: "anulada",
      documentLifecycle: "canceled",
      integrityLock: "locked",
      rectifiedById: "app:rectification:1",
    };

    const merged = mergeImportedDocumentsPreservingProtected({
      current: [annulled],
      imported: [draft(annulled.id, 100)],
      belongsToSource: (document) => document.id.startsWith("source:"),
    });

    expect(merged.documents).toEqual([annulled]);
    expect(merged.conflictingDocumentIds).toEqual([]);
    expect(() => assertNoProtectedImportReplacements(merged)).not.toThrow();
  });

  it("no ignora una anulación nueva que solo reclama el origen importado", () => {
    const issued = issueDocument(
      draft("source:invoice:1", 100),
      { ...EMPTY_DATA.profile, nif: "12345678Z" },
      "2026-07-11T00:00:00.000Z",
    );
    const importedCancellation = {
      ...draft(issued.id, 100),
      status: "anulada" as const,
    };

    const merged = mergeImportedDocumentsPreservingProtected({
      current: [issued],
      imported: [importedCancellation],
      belongsToSource: (document) => document.id.startsWith("source:"),
    });

    expect(merged.documents).toEqual([issued]);
    expect(merged.conflictingDocumentIds).toEqual([issued.id]);
    expect(() => assertNoProtectedImportReplacements(merged)).toThrow(
      "No se aplicó ningún cambio",
    );
  });

  it("aborta si un documento aceptado queda bloqueado tras normalizar", () => {
    const imported = draft("source:invoice:1", 100);
    const blocked: Document = {
      ...imported,
      snapshotIntegrity: {
        status: "blocked",
        issues: ["document_relationship_invalid"],
      },
    };

    expect(() =>
      assertAcceptedImportedDocumentsNormalized({
        normalized: [blocked],
        acceptedImported: [imported],
      }),
    ).toThrow("No se aplicó ningún cambio");
  });

  it("rechaza un emitido nuevo cuyo emisor no tiene NIF", () => {
    const imported = { ...draft("source:invoice:1", 100), status: "enviado" as const };
    const normalized = normalizeLoadedData(
      { ...EMPTY_DATA, documents: [imported] },
      { legacyBackfillDocumentIds: new Set([imported.id]) },
    );

    expect(() =>
      assertAcceptedImportedDocumentsNormalized({
        normalized: normalized.documents,
        acceptedImported: [imported],
      }),
    ).toThrow("completa nombre fiscal");
  });

  it.each(["N/A", "SIN NIF", "12345678", "1234567890"])(
    "clasifica el NIF legacy inválido %j como emisor no verificable",
    (nif) => {
      const imported = {
        ...draft("source:invoice:1", 100),
        status: "enviado" as const,
      };
      const normalized = normalizeLoadedData(
        {
          ...EMPTY_DATA,
          profile: { ...EMPTY_DATA.profile, nif },
          documents: [imported],
        },
        { legacyBackfillDocumentIds: new Set([imported.id]) },
      );

      expect(() =>
        assertAcceptedImportedDocumentsNormalized({
          normalized: normalized.documents,
          acceptedImported: [imported],
        }),
      ).toThrow("completa nombre fiscal");
    },
  );

  it("rechaza un emisor con NIF válido pero domicilio fiscal incompleto", () => {
    const imported = {
      ...draft("source:invoice:1", 100),
      status: "enviado" as const,
    };
    const normalized = normalizeLoadedData(
      {
        ...EMPTY_DATA,
        profile: {
          ...EMPTY_DATA.profile,
          name: "Negocio",
          nif: "12345678Z",
        },
        documents: [imported],
      },
      { legacyBackfillDocumentIds: new Set([imported.id]) },
    );

    expect(() =>
      assertAcceptedImportedDocumentsNormalized({
        normalized: normalized.documents,
        acceptedImported: [imported],
      }),
    ).toThrow("dirección, código postal y ciudad");
  });

  it("rechaza una factura importada sin identidad fiscal completa del cliente", () => {
    const imported = {
      ...draft("source:invoice:1", 100),
      status: "enviado" as const,
    };
    const normalized = normalizeLoadedData(
      {
        ...EMPTY_DATA,
        profile: {
          ...EMPTY_DATA.profile,
          name: "Negocio",
          nif: "12345678Z",
          address: "Calle Fiscal 1",
          postalCode: "28001",
          city: "Madrid",
        },
        documents: [imported],
      },
      { legacyBackfillDocumentIds: new Set([imported.id]) },
    );

    expect(() =>
      assertAcceptedImportedDocumentsNormalized({
        normalized: normalized.documents,
        acceptedImported: [imported],
      }),
    ).toThrow("datos mínimos de emisión del cliente");
  });

  it("conserva bloqueada una anulación legacy sin rectificativa enlazada", () => {
    const imported = { ...draft("source:invoice:1", 100), status: "anulada" as const };
    const normalized = normalizeLoadedData(
      {
        ...EMPTY_DATA,
        profile: { ...EMPTY_DATA.profile, nif: "12345678Z" },
        documents: [imported],
      },
      { legacyBackfillDocumentIds: new Set([imported.id]) },
    );

    const result = assertAcceptedImportedDocumentsNormalized({
      normalized: normalized.documents,
      acceptedImported: [imported],
    });

    expect(result).toEqual([imported.id]);
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

  it.each([
    { paidAt: "2026-07-11T10:00:00.000Z" },
    { acceptedAt: "2026-07-11T10:00:00.000Z" },
    { sentAt: "2026-07-11T10:00:00.000Z" },
    { paymentStatus: "paid" as const },
    { acceptanceStatus: "accepted" as const },
    {
      verifactuPersistence: "legacy_unverified" as const,
      verifactu: {
        recordHash: "a".repeat(64),
        previousHash: "",
        recordTimestamp: "2026-07-11T10:00:00.000Z",
        qrUrl: "https://example.invalid/legacy",
        status: "test_registered" as const,
        recordType: "alta" as const,
        environment: "test" as const,
      },
    },
  ])("preserva un borrador legacy con evidencia operativa %#", (evidence) => {
    const current: Document = {
      ...draft("source:invoice:legacy", 100),
      ...evidence,
    };
    const replacement = draft(current.id, 999);

    const merged = mergeImportedDocumentsPreservingProtected({
      current: [current],
      imported: [replacement],
      belongsToSource: (document) => document.id.startsWith("source:"),
    });

    expect(merged.documents).toEqual([current]);
    expect(merged.conflictingDocumentIds).toEqual([current.id]);
  });

  it("rechaza IDs importados duplicados antes de aplicar el lote", () => {
    const first = draft("source:invoice:F_2F1", 100);
    const second = draft("source:invoice:F_2F1", 200);
    const merged = mergeImportedDocumentsPreservingProtected({
      current: [],
      imported: [first, second],
      belongsToSource: (document) => document.id.startsWith("source:"),
    });

    expect(merged.duplicateImportedDocumentIds).toEqual([first.id]);
    expect(() => assertNoProtectedImportReplacements(merged)).toThrow(
      "duplicado",
    );
  });

  it("no aplica una importación sobre un workspace con IDs ambiguos", () => {
    const first = issueDocument(
      draft("source:invoice:duplicated", 100),
      EMPTY_DATA.profile,
      "2026-07-11T00:00:00.000Z",
    );
    const second = { ...first };
    const merged = mergeImportedDocumentsPreservingProtected({
      current: [first, second],
      imported: [],
      belongsToSource: (document) => document.id.startsWith("source:"),
    });

    expect(merged.duplicateCurrentDocumentIds).toEqual([first.id]);
    expect(() => assertNoProtectedImportReplacements(merged)).toThrow(
      "ambiguo",
    );
  });

  it("rechaza la misma identidad fiscal con un ID técnico distinto", () => {
    const current = issueDocument(
      draft("holded:invoice:1", 100),
      { ...EMPTY_DATA.profile, nif: "12345678Z" },
      "2026-07-11T00:00:00.000Z",
    );
    const imported = {
      ...draft("generic:invoice:F-2026-0001", 100),
      issuer: current.issuer,
    };
    const merged = mergeImportedDocumentsPreservingProtected({
      current: [current],
      imported: [imported],
      belongsToSource: () => true,
    });

    expect(merged.fiscalIdentityConflictDocumentIds).toEqual(
      expect.arrayContaining([current.id, imported.id]),
    );
    expect(() => assertNoProtectedImportReplacements(merged)).toThrow(
      "fiscalmente ambiguo",
    );
  });

  it("detecta una identidad importada que colisiona con un borrador manual conservado", () => {
    const manual = draft("manual:invoice:1", 100);
    const imported = draft("source:invoice:1", 100);
    const merged = mergeImportedDocumentsPreservingProtected({
      current: [manual],
      imported: [imported],
      belongsToSource: (document) => document.id.startsWith("source:"),
    });

    expect(merged.fiscalIdentityConflictDocumentIds).toEqual(
      expect.arrayContaining([manual.id, imported.id]),
    );
    expect(() => assertNoProtectedImportReplacements(merged)).toThrow();
  });

  it("no permite reutilizar el mismo número entre factura y rectificativa", () => {
    const invoice = draft("source:invoice:1", 100);
    const rectification: Document = {
      ...draft("source:rectification:1", -100),
      rectification: {
        originalDocumentId: "original",
        originalNumber: "F-2026-0000",
        originalDate: "2026-07-10",
        reason: "Anulación",
        type: "anulacion",
      },
    };
    const merged = mergeImportedDocumentsPreservingProtected({
      current: [],
      imported: [invoice, rectification],
      belongsToSource: () => true,
    });

    expect(merged.fiscalIdentityConflictDocumentIds).toEqual(
      expect.arrayContaining([invoice.id, rectification.id]),
    );
  });

  it("normaliza puntos, guiones y espacios del NIF al comparar identidades", () => {
    const current = issueDocument(
      draft("source:invoice:old", 100),
      { ...EMPTY_DATA.profile, nif: "B-12.345.678" },
      "2026-07-11T00:00:00.000Z",
    );
    const imported = {
      ...draft("source:invoice:new", 100),
      issuer: { ...current.issuer!, nif: "B12345678" },
    };
    const merged = mergeImportedDocumentsPreservingProtected({
      current: [current],
      imported: [imported],
      belongsToSource: () => true,
    });

    expect(merged.fiscalIdentityConflictDocumentIds).toEqual(
      expect.arrayContaining([current.id, imported.id]),
    );
  });

  it("no confunde números de presupuesto de orígenes distintos con facturas", () => {
    const current = {
      ...draft("manual:quote:1", 100),
      type: "presupuesto" as const,
      number: "P-2026-0001",
    };
    const imported = {
      ...draft("source:quote:1", 100),
      type: "presupuesto" as const,
      number: current.number,
    };

    const merged = mergeImportedDocumentsPreservingProtected({
      current: [current],
      imported: [imported],
      belongsToSource: (document) => document.id.startsWith("source:"),
    });

    expect(merged.fiscalIdentityConflictDocumentIds).toEqual([]);
    expect(merged.documents).toHaveLength(2);
  });

  it("ignora varios borradores manuales al comprobar identidades fiscales", () => {
    const current = [
      { ...draft("manual:draft:1", 100), number: "BORRADOR" },
      { ...draft("manual:draft:2", 200), number: "BORRADOR" },
    ];
    const imported = issueDocument(
      {
        ...draft("source:invoice:1", 300),
        number: "F-2026-0099",
      },
      { ...EMPTY_DATA.profile, nif: "12345678Z" },
      "2026-07-11T00:00:00.000Z",
    );

    const merged = mergeImportedDocumentsPreservingProtected({
      current,
      imported: [imported],
      belongsToSource: (document) => document.id.startsWith("source:"),
    });

    expect(merged.fiscalIdentityConflictDocumentIds).toEqual([]);
    expect(() => assertNoProtectedImportReplacements(merged)).not.toThrow();
  });

  it("ignora cambios del perfil vivo cuando el origen no aporta emisor", () => {
    const current = issueDocument(
      draft("source:invoice:1", 100),
      {
        ...EMPTY_DATA.profile,
        name: "Emisor histórico",
        nif: "12345678Z",
        address: "Calle Antigua 1",
      },
      "2026-07-11T00:00:00.000Z",
    );
    const imported = {
      ...draft(current.id, 100),
      issuer: {
        ...current.issuer!,
        name: "Emisor actual",
        address: "Calle Nueva 2",
      },
    };

    const inferredIssuer = mergeImportedDocumentsPreservingProtected({
      current: [current],
      imported: [imported],
      belongsToSource: () => true,
    });
    const authoritativeIssuer = mergeImportedDocumentsPreservingProtected({
      current: [current],
      imported: [imported],
      belongsToSource: () => true,
      compareImportedIssuer: true,
    });

    expect(inferredIssuer.conflictingDocumentIds).toEqual([]);
    expect(authoritativeIssuer.conflictingDocumentIds).toEqual([current.id]);
  });

  it("mantiene coste casi lineal con diez mil identidades distintas", () => {
    const imported = Array.from({ length: 10_000 }, (_, index) => ({
      ...draft(`source:invoice:${index}`, 100),
      number: `F-2026-${String(index).padStart(5, "0")}`,
    }));

    const merged = mergeImportedDocumentsPreservingProtected({
      current: [],
      imported,
      belongsToSource: () => true,
    });

    expect(merged.fiscalIdentityConflictDocumentIds).toEqual([]);
    expect(merged.acceptedImported).toHaveLength(imported.length);
  });

  it("rechaza en tiempo acotado diez mil filas con la misma identidad", () => {
    const imported = Array.from({ length: 10_000 }, (_, index) => ({
      ...draft(`source:invoice:${index}`, 100),
      number: "F-2026-REPETIDA",
    }));

    const merged = mergeImportedDocumentsPreservingProtected({
      current: [],
      imported,
      belongsToSource: () => true,
    });

    expect(new Set(merged.fiscalIdentityConflictDocumentIds).size).toBe(
      imported.length,
    );
  });

  it("mantiene coste lineal al cruzar dos lotes grandes de una identidad", () => {
    const current = Array.from({ length: 5_000 }, (_, index) => ({
      ...draft(`manual:invoice:${index}`, 100),
      number: "F-2026-CRUZADA",
    }));
    const imported = Array.from({ length: 5_000 }, (_, index) => ({
      ...draft(`source:invoice:${index}`, 100),
      number: "F-2026-CRUZADA",
    }));

    const merged = mergeImportedDocumentsPreservingProtected({
      current,
      imported,
      belongsToSource: (document) => document.id.startsWith("source:"),
    });

    expect(new Set(merged.fiscalIdentityConflictDocumentIds).size).toBe(
      current.length + imported.length,
    );
  });

  it("recorre en tiempo lineal una cadena larga de relaciones protegidas", () => {
    const drafts: Document[] = Array.from({ length: 10_000 }, (_, index) => ({
      ...draft(`source:quote:${index}`, 100),
      type: "presupuesto" as const,
      number: `P-2026-${index}`,
      sourceQuoteDocumentId:
        index === 0 ? undefined : `source:quote:${index - 1}`,
    }));
    const protectedTail = issueDocument(
      drafts.at(-1)!,
      { ...EMPTY_DATA.profile, nif: "12345678Z" },
      "2026-07-11T00:00:00.000Z",
    );
    drafts[drafts.length - 1] = protectedTail;

    const merged = mergeImportedDocumentsPreservingProtected({
      current: drafts,
      imported: [],
      belongsToSource: (document) => document.id.startsWith("source:"),
    });

    expect(merged.preservedDocumentIds).toHaveLength(drafts.length);
    expect(merged.documents).toHaveLength(drafts.length);
  });

  it("preserva el presupuesto borrador al que apunta una factura protegida", () => {
    const quote = {
      ...draft("source:quote:1", 100),
      type: "presupuesto" as const,
      number: "P-2026-0001",
    };
    const invoice = issueDocument(
      {
        ...draft("app:invoice:1", 100),
        sourceQuoteDocumentId: quote.id,
        sourceQuoteNumber: quote.number,
      },
      EMPTY_DATA.profile,
      "2026-07-11T00:00:00.000Z",
    );
    const changedQuote = { ...quote, items: [{ ...quote.items[0], unitPrice: 999 }] };

    const merged = mergeImportedDocumentsPreservingProtected({
      current: [invoice, quote],
      imported: [changedQuote],
      belongsToSource: (document) => document.id.startsWith("source:"),
    });

    expect(merged.documents.find((document) => document.id === quote.id)).toBe(
      quote,
    );
    expect(merged.conflictingDocumentIds).toEqual([quote.id]);
  });

  it("no desprende una factura borrador de un presupuesto protegido", () => {
    const protectedQuote = issueDocument(
      {
        ...draft("source:quote:protected", 100),
        type: "presupuesto",
        number: "P-2026-0001",
      },
      EMPTY_DATA.profile,
      "2026-07-11T00:00:00.000Z",
    );
    const linkedDraft = {
      ...draft("source:invoice:draft", 100),
      sourceQuoteDocumentId: protectedQuote.id,
      sourceQuoteNumber: protectedQuote.number,
    };
    const importedWithoutLink = draft(linkedDraft.id, 100);

    const merged = mergeImportedDocumentsPreservingProtected({
      current: [protectedQuote, linkedDraft],
      imported: [importedWithoutLink],
      belongsToSource: (document) => document.id.startsWith("source:"),
    });

    expect(
      merged.documents.find((document) => document.id === linkedDraft.id),
    ).toBe(linkedDraft);
  });

  it("bloquea una vista previa si el workspace cambia durante el reanálisis", async () => {
    const initial = { revision: 1 };
    const changed = { revision: 2 };
    let current = initial;

    await expect(
      reanalyzeImportAgainstCurrent({
        getCurrentData: () => current,
        analyze: async () => {
          current = changed;
          return "resultado";
        },
      }),
    ).rejects.toThrow("Los datos cambiaron");
  });
});
