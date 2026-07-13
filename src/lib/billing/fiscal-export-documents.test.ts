import { describe, expect, it } from "vitest";
import { issueDocument, markDocumentPaid } from "../document-integrity";
import { issueDraftDocumentWithStatus } from "../document-integrity/issuance";
import { captureIssuerSnapshot } from "../issuer-snapshot";
import { DEFAULT_PROFILE, EMPTY_DATA, type Document } from "../types";
import { selectCanonicalFiscalDocumentsForExport } from "./fiscal-export-documents";
import {
  applyLegacyImportRepair,
  attestNewImportedDocument,
  buildLegacyImportRepairPreview,
} from "../document-integrity/legacy-import-attestation";

const NOW = "2026-07-11T10:00:00.000Z";
const profile = {
  ...DEFAULT_PROFILE,
  name: "Autónomo Test",
  nif: "11111111H",
  address: "Calle Fiscal 1",
  postalCode: "28001",
  city: "Madrid",
};

function invoiceDraft(overrides: Partial<Document> = {}): Document {
  return {
    id: "invoice-1",
    type: "factura",
    number: "F-2026-0001",
    date: "2026-07-11",
    client: {
      name: "Cliente Test",
      nif: "US-42",
      address: "1 Main Street",
      postalCode: "10001",
      city: "New York",
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
    createdAt: NOW,
    updatedAt: NOW,
    ...overrides,
  };
}

function legacyFiscalDocument(
  overrides: Partial<Document> = {},
  issuerProfile = profile,
): Document {
  const issued = issueDocument(invoiceDraft(overrides), issuerProfile, NOW);
  return {
    ...issued,
    documentSnapshot: {
      ...issued.documentSnapshot!,
      source: "legacy_backfill",
    },
    pdfSnapshot: undefined,
    snapshotSeal: undefined,
    snapshotIntegrityRequired: undefined,
    issuedAt: undefined,
  };
}

function select(documents: Document[]) {
  return selectCanonicalFiscalDocumentsForExport(
    documents,
    profile,
    () => true,
  );
}

function attestedHistoricalCorrectionDocuments(): Document[] {
  const originalId = "pcfacturacion:factura:F-2024-0001";
  const rectificationId = "pcfacturacion:factura:FR-2024-0001";
  const rolloutResidue = {
    snapshotIntegrityRequired: true as const,
    snapshotIntegrity: {
      status: "blocked" as const,
      issues: [
        "document_snapshot_missing" as const,
        "pdf_snapshot_missing" as const,
        "snapshot_seal_missing" as const,
      ],
    },
  };
  const original: Document = {
    ...invoiceDraft({
      id: originalId,
      number: "F-2024-0001",
      date: "2024-04-01",
    }),
    status: "rectificada",
    issuer: captureIssuerSnapshot(profile, "2024-04-01T10:00:00.000Z"),
    documentLifecycle: "issued",
    integrityLock: "locked",
    rectifiedById: rectificationId,
    ...rolloutResidue,
  };
  const rectification: Document = {
    ...invoiceDraft({
      id: rectificationId,
      number: "FR-2024-0001",
      date: "2024-04-02",
      rectification: {
        originalDocumentId: originalId,
        originalNumber: original.number,
        originalDate: original.date,
        reason: "Correccion historica",
        type: "correccion",
      },
    }),
    status: "enviado",
    issuer: captureIssuerSnapshot(profile, "2024-04-02T10:00:00.000Z"),
    documentLifecycle: "issued",
    integrityLock: "locked",
    ...rolloutResidue,
  };
  const data = {
    ...EMPTY_DATA,
    profile,
    documents: [original, rectification],
    snapshotIntegrityVersion: 1 as const,
  };
  const result = applyLegacyImportRepair(
    data,
    buildLegacyImportRepairPreview(data),
    "2026-07-13T08:00:00.000Z",
  );
  if (result.status !== "applied") {
    throw new Error(
      `No se pudo atestar la correccion historica: ${result.reason}`,
    );
  }
  return result.data.documents;
}

describe("selectCanonicalFiscalDocumentsForExport", () => {
  it("selecciona un histórico importado atestado sin exigir PDF ni sello moderno", () => {
    const imported = attestNewImportedDocument(
      {
        ...invoiceDraft({
          id: "pcfacturacion:factura:F-2024-0001",
          number: "F-2024-0001",
          date: "2024-04-01",
          status: "enviado",
        }),
        issuer: captureIssuerSnapshot(profile, NOW),
        documentLifecycle: "issued",
        integrityLock: "locked",
      },
      profile,
      "pcfacturacion",
      "2026-07-12T22:00:00.000Z",
    );

    const result = select([imported]);
    expect(result.blockedDocuments).toEqual([]);
    expect(result.documents).toHaveLength(1);
    expect(result.documents[0].documentSnapshot?.taxSummary.total).toBe(121);
    expect(imported.pdfSnapshot).toBeUndefined();
    expect(imported.snapshotSeal).toBeUndefined();
  });

  it("conserva la cadena V3 para seleccionar la rectificativa vigente sin bloquear", () => {
    const documents = attestedHistoricalCorrectionDocuments();
    const result = select(documents);

    expect(result.blockedDocuments).toEqual([]);
    expect(result.documents.map((document) => document.id)).toEqual([
      "pcfacturacion:factura:F-2024-0001",
      "pcfacturacion:factura:FR-2024-0001",
    ]);
    const rectification = result.documents.find(
      (document) => document.id === "pcfacturacion:factura:FR-2024-0001",
    );
    expect(rectification?.legacyImportAttestation).toMatchObject({
      schemaVersion: 3,
      relationshipGroup: {
        kind: "rectification_correction",
        role: "rectification",
        counterpartDocumentId: "pcfacturacion:factura:F-2024-0001",
      },
    });
    expect(rectification?.documentSnapshot?.taxSummary).toMatchObject({
      subtotal: 100,
      iva: 21,
      total: 121,
    });
  });

  it("exporta un V2 aceptado aunque conserve campos históricos incompletos", () => {
    const imported = attestNewImportedDocument(
      {
        ...invoiceDraft({
          id: "pcfacturacion:factura:Factura_2F2940_2F",
          number: "Factura/2940/",
          date: "2026-06-12",
          client: { name: "Jordi Vinardell" },
          items: [
            {
              id: "legacy-line",
              description: "",
              quantity: 1,
              unitPrice: 100,
              ivaPercent: 21,
            },
          ],
          status: "pagado",
        }),
        issuer: {
          name: "Negocio histórico",
          nif: "",
          commercialName: "",
          website: "",
          address: "",
          city: "",
          postalCode: "",
          capturedAt: NOW,
        },
        documentLifecycle: "issued",
        integrityLock: "locked",
      },
      profile,
      "pcfacturacion",
      "2026-07-13T06:00:00.000Z",
    );

    expect(imported.legacyImportAttestation).toMatchObject({
      schemaVersion: 2,
      acceptedContentPolicy: {
        kind: "stored_fiscal_content_user_authoritative",
      },
    });
    const result = select([imported]);
    expect(result.blockedDocuments).toEqual([]);
    expect(result.documents).toHaveLength(1);
    expect(result.documents[0].documentSnapshot?.taxSummary).toMatchObject({
      subtotal: 100,
      iva: 21,
      total: 121,
    });
  });

  it("ignora un borrador legítimo aunque una vista previa adjuntase emisor", () => {
    const previewDraft = invoiceDraft({
      issuer: captureIssuerSnapshot(profile, NOW),
    });

    expect(select([previewDraft])).toEqual({
      documents: [],
      blockedDocuments: [],
    });
  });

  it("ignora un presupuesto congelado sin evidencia fiscal persistida", () => {
    const historicalQuote = invoiceDraft({
      id: "historical-quote-without-fiscal-evidence",
      type: "presupuesto",
      number: "P-2024-0001",
      status: "aceptado",
      documentLifecycle: "issued",
      integrityLock: "locked",
      snapshotIntegrity: {
        status: "blocked",
        issues: [
          "document_snapshot_missing",
          "pdf_snapshot_missing",
          "snapshot_seal_missing",
        ],
      },
    });

    expect(select([historicalQuote])).toEqual({
      documents: [],
      blockedDocuments: [],
    });
  });

  it("mantiene bloqueada una afirmación VeriFactu parcial disfrazada de presupuesto", () => {
    const ambiguousQuote = invoiceDraft({
      id: "quote-with-verifactu-persistence",
      type: "presupuesto",
      number: "P-2024-0002",
      status: "aceptado",
      documentLifecycle: "issued",
      integrityLock: "locked",
      verifactuPersistence: "server_confirmed",
    });

    const result = select([ambiguousQuote]);

    expect(result.documents).toEqual([]);
    expect(result.blockedDocuments).toEqual([
      expect.objectContaining({
        id: ambiguousQuote.id,
        issues: expect.arrayContaining(["document_snapshot_missing"]),
      }),
    ]);
  });

  it("ignora fiscalmente un presupuesto emitido con su evidencia íntegra", () => {
    const issuedQuote = issueDocument(
      invoiceDraft({
        id: "sealed-quote",
        type: "presupuesto",
        number: "P-2026-0001",
      }),
      profile,
      NOW,
    );

    expect(select([issuedQuote])).toEqual({
      documents: [],
      blockedDocuments: [],
    });
  });

  it.each([0, 21])(
    "conserva un snapshot legacy completo con IVA %s aunque no tenga PDF ni sello",
    (ivaPercent) => {
      const legacy = legacyFiscalDocument({
        items: [
          {
            id: `valid-rate-${ivaPercent}`,
            description: "Servicio",
            quantity: 1,
            unitPrice: 100,
            ivaPercent,
          },
        ],
      });

      const result = select([legacy]);

      expect(result.blockedDocuments).toHaveLength(0);
      expect(result.documents.map((document) => document.id)).toEqual([
        legacy.id,
      ]);
    },
  );

  it.each(["", "N/A"])(
    "bloquea un snapshot legacy cuyo NIF de emisor es %j",
    (nif) => {
      const legacy = legacyFiscalDocument({}, { ...profile, nif });

      const result = select([legacy]);

      expect(result.documents).toHaveLength(0);
      expect(result.blockedDocuments).toEqual([
        expect.objectContaining({
          id: legacy.id,
          issues: ["document_relationship_invalid"],
        }),
      ]);
    },
  );

  it("bloquea un snapshot legacy con emisor incompleto aunque el perfil vivo esté completo", () => {
    const legacy = legacyFiscalDocument({}, { ...profile, address: "" });

    const result = select([legacy]);

    expect(result.documents).toHaveLength(0);
    expect(result.blockedDocuments).toEqual([
      expect.objectContaining({
        id: legacy.id,
        issues: ["document_snapshot_semantic_invalid"],
      }),
    ]);
  });

  it("bloquea una factura legacy con identidad de cliente incompleta", () => {
    const legacy = legacyFiscalDocument({
      client: {
        name: "Cliente incompleto",
        nif: "EXT-7",
        address: "",
        postalCode: "",
        city: "",
      },
    });

    const result = select([legacy]);

    expect(result.documents).toHaveLength(0);
    expect(result.blockedDocuments).toEqual([
      expect.objectContaining({
        id: legacy.id,
        issues: ["document_snapshot_semantic_invalid"],
      }),
    ]);
  });

  it("bloquea un snapshot legacy sin ningún concepto descrito", () => {
    const legacy = legacyFiscalDocument({
      items: [
        {
          id: "blank-concept",
          description: "   ",
          quantity: 1,
          unitPrice: 100,
          ivaPercent: 21,
        },
      ],
    });

    const result = select([legacy]);

    expect(result.documents).toHaveLength(0);
    expect(result.blockedDocuments[0]).toEqual(
      expect.objectContaining({
        id: legacy.id,
        issues: ["document_snapshot_semantic_invalid"],
      }),
    );
  });

  it("mantiene un recibo independiente legacy con cliente simplificado", () => {
    const receipt = legacyFiscalDocument({
      id: "standalone-receipt",
      type: "recibo",
      number: "R-2026-0001",
      client: { name: "Consumidor final" },
    });

    const result = select([receipt]);

    expect(result.blockedDocuments).toHaveLength(0);
    expect(result.documents.map((document) => document.id)).toEqual([
      receipt.id,
    ]);
  });

  it("bloquea un recibo independiente pagado cuyo ciclo de vida está cancelado", () => {
    const receipt = issueDraftDocumentWithStatus(
      invoiceDraft({
        id: "canceled-standalone-receipt",
        type: "recibo",
        number: "R-2026-CANCELED",
        client: { name: "Consumidor final" },
      }),
      "pagado",
      profile,
      NOW,
    );
    const canceledReceipt: Document = {
      ...receipt,
      documentLifecycle: "canceled",
    };

    const result = select([canceledReceipt]);

    expect(result.documents).toHaveLength(0);
    expect(result.blockedDocuments).toEqual([
      expect.objectContaining({
        id: receipt.id,
        issues: ["document_relationship_invalid"],
      }),
    ]);
  });

  it.each([-1, -200, 101])(
    "bloquea un snapshot fiscal legacy con IVA imposible %s",
    (ivaPercent) => {
      const legacy = legacyFiscalDocument({
        items: [
          {
            id: `invalid-rate-${ivaPercent}`,
            description: "Servicio",
            quantity: 1,
            unitPrice: 100,
            ivaPercent,
          },
        ],
      });

      const result = select([legacy]);

      expect(result.documents).toHaveLength(0);
      expect(result.blockedDocuments[0]).toEqual(
        expect.objectContaining({
          id: legacy.id,
          issues: ["document_snapshot_semantic_invalid"],
        }),
      );
    },
  );

  it("bloquea una factura ordinaria legacy con totales negativos", () => {
    const legacy = legacyFiscalDocument({
      items: [
        {
          id: "negative-invoice-line",
          description: "Importe negativo improcedente",
          quantity: 1,
          unitPrice: -100,
          ivaPercent: 21,
        },
      ],
    });

    const result = select([legacy]);

    expect(result.documents).toHaveLength(0);
    expect(result.blockedDocuments[0]).toEqual(
      expect.objectContaining({
        id: legacy.id,
        issues: ["document_snapshot_semantic_invalid"],
      }),
    );
  });

  it("bloquea un recibo independiente legacy con totales negativos", () => {
    const receipt = legacyFiscalDocument({
      id: "negative-standalone-receipt",
      type: "recibo",
      number: "R-2026-0002",
      client: { name: "Consumidor final" },
      items: [
        {
          id: "negative-receipt-line",
          description: "Importe negativo improcedente",
          quantity: 1,
          unitPrice: -100,
          ivaPercent: 21,
        },
      ],
    });

    const result = select([receipt]);

    expect(result.documents).toHaveLength(0);
    expect(result.blockedDocuments[0]).toEqual(
      expect.objectContaining({
        id: receipt.id,
        issues: ["document_snapshot_semantic_invalid"],
      }),
    );
  });

  it("permite una línea de descuento negativa si el agregado sigue siendo positivo", () => {
    const legacy = legacyFiscalDocument({
      items: [
        {
          id: "service-line",
          description: "Servicio",
          quantity: 1,
          unitPrice: 100,
          ivaPercent: 21,
        },
        {
          id: "discount-line",
          description: "Descuento",
          quantity: 1,
          unitPrice: -10,
          ivaPercent: 21,
        },
      ],
    });

    const result = select([legacy]);

    expect(result.blockedDocuments).toHaveLength(0);
    expect(result.documents.map((document) => document.id)).toEqual([
      legacy.id,
    ]);
  });

  it("bloquea todos los snapshots legacy con la misma identidad fiscal antes del periodo", () => {
    const first = legacyFiscalDocument({
      id: "duplicate-january",
      date: "2026-01-10",
      number: "F-DUP-0001",
    });
    const second = legacyFiscalDocument({
      id: "duplicate-july",
      date: "2026-07-10",
      number: " f-dup-0001 ",
    });

    const result = selectCanonicalFiscalDocumentsForExport(
      [first, second],
      profile,
      (date) => date.startsWith("2026-07"),
    );

    expect(result.documents).toHaveLength(0);
    expect(
      result.blockedDocuments.map((document) => document.id).sort(),
    ).toEqual([first.id, second.id]);
    expect(
      result.blockedDocuments.every((document) =>
        document.issues.includes("document_relationship_invalid"),
      ),
    ).toBe(true);
  });

  it("permite el mismo número fiscal en años distintos", () => {
    const first = legacyFiscalDocument({
      id: "same-number-2025",
      date: "2025-12-31",
      number: "F-SAME-0001",
    });
    const second = legacyFiscalDocument({
      id: "same-number-2026",
      date: "2026-01-01",
      number: "F-SAME-0001",
    });

    const result = select([first, second]);

    expect(result.blockedDocuments).toHaveLength(0);
    expect(result.documents.map((document) => document.id).sort()).toEqual([
      first.id,
      second.id,
    ]);
  });

  it("mantiene separados los namespaces de factura y recibo", () => {
    const invoice = legacyFiscalDocument({
      id: "same-number-invoice",
      number: "SHARED-2026-0001",
    });
    const receipt = legacyFiscalDocument({
      id: "same-number-receipt",
      type: "recibo",
      number: "SHARED-2026-0001",
      client: { name: "Consumidor final" },
    });

    const result = select([invoice, receipt]);

    expect(result.blockedDocuments).toHaveLength(0);
    expect(result.documents.map((document) => document.id).sort()).toEqual([
      invoice.id,
      receipt.id,
    ]);
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

  it("bloquea una rectificativa de corrección con agregado negativo y su extremo original", () => {
    const original = issueDocument(invoiceDraft(), profile, NOW);
    const correction = issueDocument(
      invoiceDraft({
        id: "negative-correction",
        number: "FR-2026-NEG",
        date: "2026-07-12",
        items: [
          {
            id: "negative-correction-line",
            description: "Corrección negativa improcedente",
            quantity: 1,
            unitPrice: -100,
            ivaPercent: 21,
          },
        ],
        rectification: {
          originalDocumentId: original.id,
          originalNumber: original.number,
          originalDate: original.date,
          reason: "Corrección",
          type: "correccion",
        },
        documentLifecycle: "draft",
        integrityLock: "unlocked",
      }),
      profile,
      NOW,
    );
    const linkedOriginal: Document = {
      ...original,
      status: "rectificada",
      rectifiedById: correction.id,
    };

    const result = select([linkedOriginal, correction]);

    expect(result.documents).toHaveLength(0);
    expect(result.blockedDocuments.map((document) => document.id)).toEqual(
      expect.arrayContaining([correction.id, original.id]),
    );
  });

  it("usa el mismo namespace para una rectificativa y una factura ordinaria", () => {
    const original = issueDocument(
      invoiceDraft({ id: "namespace-original", number: "F-2026-ORIGINAL" }),
      profile,
      NOW,
    );
    const cancellation = issueDocument(
      invoiceDraft({
        id: "namespace-cancellation",
        number: "FR-2026-SHARED",
        date: "2026-07-12",
        items: [
          {
            id: "namespace-cancellation-line",
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
      rectifiedById: cancellation.id,
    };
    const collidingLegacyInvoice = legacyFiscalDocument({
      id: "namespace-legacy-invoice",
      number: cancellation.number,
      date: cancellation.date,
    });

    const result = select([
      linkedOriginal,
      cancellation,
      collidingLegacyInvoice,
    ]);

    expect(result.blockedDocuments.map((document) => document.id)).toEqual(
      expect.arrayContaining([cancellation.id, collidingLegacyInvoice.id]),
    );
    expect(
      result.blockedDocuments
        .filter((document) =>
          [cancellation.id, collidingLegacyInvoice.id].includes(document.id),
        )
        .every((document) =>
          document.issues.includes("document_relationship_invalid"),
        ),
    ).toBe(true);
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
