import { describe, expect, it } from "vitest";
import {
  acceptQuote,
  attachRegisteredVerifactuToSnapshots,
  applyGenericDocumentUpdate,
  buildDocumentPdfSnapshot,
  buildDocumentSnapshotSeal,
  buildDocumentSnapshot,
  deriveLegacySnapshotForReadOnly,
  DocumentIntegrityError,
  DocumentSnapshotIntegrityError,
  getDocumentSnapshotSource,
  hasDocumentSnapshot,
  hashDocumentPdfSnapshot,
  hashDocumentSnapshot,
  hashStrongDocumentPdfSnapshotContent,
  hashStrongDocumentSnapshotContent,
  inspectDocumentSnapshotsIntegrity,
  issueDocument,
  isDocumentIntegrityLocked,
  markDocumentPaid,
  markDocumentSent,
  rejectQuote,
  stableStringifySnapshot,
} from ".";
import { legacyFnv1a32 } from "./snapshot-hash";
import { buildPdfViewModelForDocument } from "./pdf-source";
import { buildDocumentPdf } from "../pdf";
import type {
  BusinessProfile,
  Document,
  DocumentPdfSnapshot,
  DocumentSnapshot,
  IssuerSnapshot,
  VerifactuInfo,
} from "../types";

const NOW = "2026-06-24T10:00:00.000Z";
const LATER = "2026-06-24T12:00:00.000Z";

const issuer: IssuerSnapshot = {
  name: "Punto Racing RC",
  nif: "12345678Z",
  address: "Calle Mayor 1",
  city: "Barcelona",
  postalCode: "08001",
  phone: "600000000",
  email: "hola@example.com",
  iban: "ES0000000000000000000000",
  logoUrl: "logo.png",
  capturedAt: "2026-06-01T10:00:00.000Z",
};

const profile: BusinessProfile = {
  name: issuer.name,
  nif: issuer.nif,
  address: issuer.address,
  city: issuer.city,
  postalCode: issuer.postalCode,
  phone: issuer.phone ?? "",
  email: issuer.email ?? "",
  iban: issuer.iban,
  logoUrl: issuer.logoUrl,
  iva: { rates: [0, 4, 10, 21], defaultRate: 21 },
  vatExempt: false,
  verifactu: { enabled: true, environment: "test", optInVersion: 1 },
  documentTemplate: {
    style: "futuro",
    font: "tecnica",
    accent: "coral",
    density: "compacta",
    bodyFontSize: "normal",
    titleFontSize: "grande",
    issuerFontSize: "pequena",
    totalFontSize: "grande",
    showLogo: true,
    showIssuerBox: true,
    showPaymentBox: true,
  },
  numbering: {
    year: 2026,
    lastSequence: {
      factura: 7,
      factura_rectificativa: 0,
      presupuesto: 2,
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

function invoice(overrides: Partial<Document> = {}): Document {
  return {
    id: "doc-1",
    type: "factura",
    number: "F-2026-0007",
    date: "2026-06-24",
    dueDate: "2026-07-24",
    client: {
      firstName: "Ana",
      lastName: "Garcia",
      name: "Ana Garcia",
      nif: "11111111H",
      email: "ana@example.com",
      phone: "600111222",
      address: "Calle Cliente 2, 08002 Barcelona",
    },
    items: [
      {
        id: "line-1",
        description: "Servicio tecnico",
        quantity: 2,
        unit: "h",
        unitPrice: 50,
        ivaPercent: 21,
      },
    ],
    issuer,
    notes: "Notas visibles",
    paymentTerms: "Transferencia",
    status: "borrador",
    createdAt: "2026-06-24T09:00:00.000Z",
    updatedAt: "2026-06-24T09:00:00.000Z",
    ...overrides,
  };
}

function legacyHash(value: unknown): string {
  return `fnv1a32:${legacyFnv1a32(stableStringifySnapshot(value))}`;
}

function asLegacyDocumentSnapshot(snapshot: DocumentSnapshot): DocumentSnapshot {
  const content = { ...snapshot } as Record<string, unknown>;
  delete content.capturedAt;
  delete content.source;
  delete content.snapshotHash;
  const issuerContent = { ...snapshot.issuer } as Record<string, unknown>;
  delete issuerContent.capturedAt;

  return {
    ...snapshot,
    snapshotHash: legacyHash({
      ...content,
      issuer: issuerContent,
      items: snapshot.items.map((item) => {
        const itemContent = { ...item } as Record<string, unknown>;
        delete itemContent.id;
        return itemContent;
      }),
    }),
  };
}

function asLegacyPdfSnapshot(
  snapshot: DocumentPdfSnapshot,
  documentSnapshotHash: string,
): DocumentPdfSnapshot {
  const content = {
    ...snapshot,
    documentSnapshotHash,
  } as Record<string, unknown>;
  delete content.renderedAt;
  delete content.contentHash;
  return { ...snapshot, contentHash: legacyHash(content) };
}

const LEGACY_FNV_GOLDEN_FIXTURE = {
  documentSnapshot: {
    schemaVersion: 1,
    capturedAt: NOW,
    source: "issue",
    documentType: "factura",
    documentKind: "factura",
    number: "F-2026-0007",
    date: "2026-06-24",
    dueDate: "2026-07-24",
    issuer: {
      name: "",
      nif: "",
      address: "",
      city: "",
      postalCode: "",
      country: "España",
      capturedAt: NOW,
    },
    customer: { name: "José Álvarez 😀", nif: "11111111H" },
    items: [
      {
        id: "line-legacy",
        description: "Reparación — 1 €",
        quantity: 1,
        unitPrice: 100,
        ivaPercent: 21,
        subtotal: 100,
        ivaAmount: 21,
        total: 121,
      },
    ],
    taxSummary: {
      subtotal: 100,
      iva: 21,
      total: 121,
      vatExempt: false,
      byRate: [
        {
          ivaPercent: 21,
          taxableBase: 100,
          ivaAmount: 21,
          total: 121,
        },
      ],
    },
    currency: "EUR",
    numbering: {
      documentKind: "factura",
      number: "F-2026-0007",
      year: 2026,
      format: { template: "F-{year}-{num}", padding: 4 },
    },
    fiscalContext: {
      vatExempt: false,
      iva: { rates: [0, 4, 10, 21], defaultRate: 21 },
      verifactu: { enabled: true, environment: "test" },
    },
    snapshotHash: "fnv1a32:f72943c9",
  } satisfies DocumentSnapshot,
  pdfSnapshot: {
    schemaVersion: 1,
    renderedAt: NOW,
    rendererVersion: "document-pdf-renderer-v1",
    template: {
      style: "clasico",
      font: "moderna",
      accent: "azul",
      density: "normal",
      bodyFontSize: "normal",
      titleFontSize: "normal",
      issuerFontSize: "normal",
      totalFontSize: "normal",
      showLogo: true,
      showIssuerBox: false,
      showPaymentBox: true,
    },
    contentHash: "fnv1a32:368988f9",
  } satisfies DocumentPdfSnapshot,
};

function expectIntegrityError(action: () => unknown) {
  expect(action).toThrow(DocumentIntegrityError);
}

describe("document snapshots", () => {
  it("canonicaliza claves JSON propias sin perder __proto__", () => {
    const value = JSON.parse('{"__proto__":{"x":1},"b":2,"a":1}');
    expect(stableStringifySnapshot(value)).toBe(
      '{"__proto__":{"x":1},"a":1,"b":2}',
    );
  });

  it("issueDocument crea documentSnapshot y pdfSnapshot", () => {
    const issued = issueDocument(invoice(), profile, NOW);

    expect(issued.documentSnapshot).toMatchObject({
      schemaVersion: 1,
      capturedAt: NOW,
      source: "issue",
      documentType: "factura",
      documentKind: "factura",
      number: "F-2026-0007",
      date: "2026-06-24",
      dueDate: "2026-07-24",
      currency: "EUR",
    });
    expect(issued.documentSnapshot?.snapshotHash).toMatch(/^sha256:[a-f0-9]{64}$/);
    expect(issued.pdfSnapshot).toMatchObject({
      schemaVersion: 1,
      renderedAt: NOW,
      rendererVersion: "document-pdf-renderer-v1",
      template: profile.documentTemplate,
    });
    expect(issued.pdfSnapshot?.contentHash).toMatch(/^sha256:[a-f0-9]{64}$/);
    expect(issued.snapshotIntegrityRequired).toBe(true);
    expect(issued.snapshotSeal).toMatchObject({
      version: 1,
      documentId: issued.id,
      documentSnapshotHash: issued.documentSnapshot?.snapshotHash,
      pdfSnapshotHash: issued.pdfSnapshot?.contentHash,
    });
    expect(issued.snapshotSeal?.contextHash).toMatch(
      /^sha256:[a-f0-9]{64}$/,
    );
  });

  it("verifica SHA-256 en snapshots nuevos", () => {
    const issued = issueDocument(invoice(), profile, NOW);
    const integrity = inspectDocumentSnapshotsIntegrity(issued);

    expect(integrity).toMatchObject({
      ok: true,
      documentSnapshot: { status: "verified", algorithm: "sha256" },
      pdfSnapshot: { status: "verified", algorithm: "sha256" },
      issues: [],
    });
  });

  it("mantiene lectura y render compatibles con snapshots FNV-1a legacy", () => {
    const currentDocumentSnapshot = buildDocumentSnapshot(invoice(), profile, {
      capturedAt: NOW,
    });
    const documentSnapshot = asLegacyDocumentSnapshot(currentDocumentSnapshot);
    const currentPdfSnapshot = buildDocumentPdfSnapshot(
      documentSnapshot,
      profile,
      NOW,
    );
    const pdfSnapshot = asLegacyPdfSnapshot(
      currentPdfSnapshot,
      documentSnapshot.snapshotHash,
    );
    const legacy = invoice({
      status: "enviado",
      documentLifecycle: "issued",
      integrityLock: "locked",
      documentSnapshot,
      pdfSnapshot,
    });

    const legacyIntegrity = inspectDocumentSnapshotsIntegrity(legacy);
    expect(legacyIntegrity.issues).toEqual([]);
    expect(legacyIntegrity).toMatchObject({
      ok: true,
      documentSnapshot: { status: "verified", algorithm: "fnv1a32" },
      pdfSnapshot: { status: "verified", algorithm: "fnv1a32" },
    });
    expect(buildDocumentPdf(legacy, profile).getNumberOfPages()).toBe(1);
    expect(legacy.documentSnapshot).toBe(documentSnapshot);
    expect(legacy.pdfSnapshot).toBe(pdfSnapshot);
    const strongSeal = buildDocumentSnapshotSeal(
      legacy.id,
      documentSnapshot,
      pdfSnapshot,
    );
    expect(strongSeal.documentSnapshotHash).toMatch(/^fnv1a32:/);
    expect(strongSeal.documentContentHash).toMatch(/^sha256:[a-f0-9]{64}$/);
    expect(strongSeal.pdfContentHash).toMatch(/^sha256:[a-f0-9]{64}$/);
    expect(
      inspectDocumentSnapshotsIntegrity({
        ...legacy,
        snapshotSeal: strongSeal,
        snapshotIntegrityRequired: true,
      }).ok,
    ).toBe(true);
  });

  it("acepta el redondeo histórico solo en snapshots FNV fraccionarios", () => {
    const current = buildDocumentSnapshot(
      invoice({
        items: [
          {
            id: "legacy-fraction-1",
            description: "Fracción 1",
            quantity: 1,
            unitPrice: 0.014,
            ivaPercent: 21,
          },
        ],
      }),
      profile,
      { capturedAt: NOW },
    );
    const documentSnapshot = asLegacyDocumentSnapshot({
      ...current,
      taxSummary: {
        ...current.taxSummary,
        subtotal: 0.01,
        iva: 0,
        total: 0.02,
      },
    });
    const pdfSnapshot = asLegacyPdfSnapshot(
      buildDocumentPdfSnapshot(documentSnapshot, profile, NOW),
      documentSnapshot.snapshotHash,
    );
    const legacy = invoice({
      status: "enviado",
      documentLifecycle: "issued",
      integrityLock: "locked",
      documentSnapshot,
      pdfSnapshot,
    });

    const integrity = inspectDocumentSnapshotsIntegrity(legacy);
    expect(integrity.issues).toEqual([]);
    expect(integrity.documentSnapshot).toMatchObject({
      status: "verified",
      algorithm: "fnv1a32",
    });
  });

  it("conserva el redondeo negativo asimétrico únicamente al verificar FNV", () => {
    const current = buildDocumentSnapshot(
      invoice({
        items: [
          {
            id: "legacy-negative-half-cent",
            description: "Fracción negativa histórica",
            quantity: 0.5,
            unitPrice: -0.05,
            ivaPercent: 21,
          },
        ],
      }),
      profile,
      { capturedAt: NOW },
    );
    const legacyLine = {
      ...current.items[0],
      subtotal: -0.02,
      ivaAmount: -0.01,
      total: -0.03,
    };
    const documentSnapshot = asLegacyDocumentSnapshot({
      ...current,
      items: [legacyLine],
      taxSummary: {
        subtotal: -0.02,
        iva: -0.01,
        total: -0.03,
        vatExempt: false,
        byRate: [
          {
            ivaPercent: 21,
            taxableBase: -0.02,
            ivaAmount: -0.01,
            total: -0.03,
          },
        ],
      },
    });
    const pdfSnapshot = asLegacyPdfSnapshot(
      buildDocumentPdfSnapshot(documentSnapshot, profile, NOW),
      documentSnapshot.snapshotHash,
    );

    const integrity = inspectDocumentSnapshotsIntegrity(
      invoice({
        status: "enviado",
        documentLifecycle: "issued",
        integrityLock: "locked",
        documentSnapshot,
        pdfSnapshot,
      }),
    );

    expect(integrity.issues).toEqual([]);
    expect(integrity.documentSnapshot.algorithm).toBe("fnv1a32");
  });

  it("verifica un fixture FNV literal producido por la versión histórica", () => {
    const legacy = invoice({
      status: "enviado",
      documentLifecycle: "issued",
      integrityLock: "locked",
      documentSnapshot: LEGACY_FNV_GOLDEN_FIXTURE.documentSnapshot,
      pdfSnapshot: LEGACY_FNV_GOLDEN_FIXTURE.pdfSnapshot,
    });

    const integrity = inspectDocumentSnapshotsIntegrity(legacy);
    expect(integrity.issues).toEqual([]);
    expect(integrity).toMatchObject({
      ok: true,
      documentSnapshot: { status: "verified", algorithm: "fnv1a32" },
      pdfSnapshot: { status: "verified", algorithm: "fnv1a32" },
    });
    expect(buildDocumentPdf(legacy, profile).getNumberOfPages()).toBe(1);
  });

  it("el sello detecta reemplazo o ausencia aunque el hash interno sea válido", () => {
    const issued = issueDocument(invoice(), profile, NOW);
    const other = issueDocument(
      invoice({ notes: "Otro documento autoconsistente" }),
      profile,
      NOW,
    );

    const swapped = {
      ...issued,
      documentSnapshot: other.documentSnapshot,
      pdfSnapshot: other.pdfSnapshot,
    };
    const missing = {
      ...issued,
      documentSnapshot: undefined,
      pdfSnapshot: undefined,
    };

    expect(inspectDocumentSnapshotsIntegrity(swapped).issues).toEqual(
      expect.arrayContaining([
        "document_strong_hash_mismatch",
        "pdf_strong_hash_mismatch",
        "document_seal_mismatch",
        "pdf_seal_mismatch",
      ]),
    );
    expect(inspectDocumentSnapshotsIntegrity(missing).issues).toEqual([
      "document_snapshot_missing",
      "pdf_snapshot_missing",
    ]);
    expect(() => buildDocumentPdf(swapped, profile)).toThrow(
      DocumentSnapshotIntegrityError,
    );
    expect(() => buildDocumentPdf(missing, profile)).toThrow(
      DocumentSnapshotIntegrityError,
    );
  });

  it("liga el paquete completo a la identidad y metadatos del documento", () => {
    const issued = issueDocument(invoice({ id: "invoice-a" }), profile, NOW);
    const other = issueDocument(invoice({ id: "invoice-b" }), profile, NOW);
    const bundleSwap: Document = {
      ...issued,
      documentSnapshot: other.documentSnapshot,
      pdfSnapshot: other.pdfSnapshot,
      snapshotSeal: other.snapshotSeal,
    };
    const sourceDrift: Document = {
      ...issued,
      documentSnapshot: {
        ...issued.documentSnapshot!,
        source: "legacy_backfill",
      },
    };

    expect(inspectDocumentSnapshotsIntegrity(bundleSwap).issues).toContain(
      "document_seal_identity_mismatch",
    );
    expect(inspectDocumentSnapshotsIntegrity(sourceDrift).issues).toContain(
      "snapshot_context_mismatch",
    );
    expect(() => buildDocumentPdf(bundleSwap, profile)).toThrow(
      DocumentSnapshotIntegrityError,
    );
    expect(() => buildDocumentPdf(sourceDrift, profile)).toThrow(
      DocumentSnapshotIntegrityError,
    );
  });

  it("el sello fuerte cubre IDs de línea y timestamp de render", () => {
    const issued = issueDocument(invoice(), profile, NOW);
    const changedLineId: Document = {
      ...issued,
      documentSnapshot: {
        ...issued.documentSnapshot!,
        items: [
          { ...issued.documentSnapshot!.items[0], id: "linea-duplicada" },
        ],
      },
    };
    const changedRenderTime: Document = {
      ...issued,
      pdfSnapshot: {
        ...issued.pdfSnapshot!,
        renderedAt: LATER,
      },
    };

    expect(
      inspectDocumentSnapshotsIntegrity(changedLineId).documentSnapshot.status,
    ).toBe("verified");
    expect(inspectDocumentSnapshotsIntegrity(changedLineId).issues).toContain(
      "document_strong_hash_mismatch",
    );
    expect(
      inspectDocumentSnapshotsIntegrity(changedRenderTime).pdfSnapshot.status,
    ).toBe("verified");
    expect(
      inspectDocumentSnapshotsIntegrity(changedRenderTime).issues,
    ).toContain("pdf_strong_hash_mismatch");
  });

  it("bloquea el uso y la emisión si el snapshot documental fue alterado", () => {
    const issued = issueDocument(invoice(), profile, NOW);
    const tamperedSnapshot = {
      ...issued.documentSnapshot!,
      number: "F-2026-9999",
    };
    const tampered = { ...issued, documentSnapshot: tamperedSnapshot };

    const integrity = inspectDocumentSnapshotsIntegrity(tampered);
    expect(integrity.ok).toBe(false);
    expect(integrity.issues).toContain("document_hash_mismatch");
    expect(() => buildDocumentPdf(tampered, profile)).toThrow(
      DocumentSnapshotIntegrityError,
    );
    expect(() =>
      issueDocument(
        invoice({ documentSnapshot: tamperedSnapshot, pdfSnapshot: undefined }),
        profile,
        NOW,
      ),
    ).toThrow("ya está emitido");
  });

  it("bloquea la fuente PDF si cambia la plantilla congelada", () => {
    const issued = issueDocument(invoice(), profile, NOW);
    const tampered = {
      ...issued,
      pdfSnapshot: {
        ...issued.pdfSnapshot!,
        template: {
          ...issued.pdfSnapshot!.template,
          accent: "azul" as const,
        },
      },
    };

    const integrity = inspectDocumentSnapshotsIntegrity(tampered);
    expect(integrity.ok).toBe(false);
    expect(integrity.issues).toContain("pdf_hash_mismatch");
    expect(() => buildPdfViewModelForDocument(tampered, profile)).toThrow(
      DocumentSnapshotIntegrityError,
    );
  });

  it("rechaza semántica fiscal incoherente aunque todos los hashes coincidan", () => {
    const issued = issueDocument(invoice(), profile, NOW);
    const documentSnapshot = {
      ...issued.documentSnapshot!,
      schemaVersion: 99,
      items: [
        {
          ...issued.documentSnapshot!.items[0],
          subtotal: 999,
          total: 1020,
        },
      ],
      taxSummary: {
        ...issued.documentSnapshot!.taxSummary,
        subtotal: 999,
        total: 1020,
        byRate: [
          {
            ...issued.documentSnapshot!.taxSummary.byRate[0],
            taxableBase: 999,
            total: 1020,
          },
        ],
      },
      snapshotHash: "",
    };
    documentSnapshot.snapshotHash = hashDocumentSnapshot(documentSnapshot);
    const pdfSnapshot = {
      ...issued.pdfSnapshot!,
      contentHash: "",
    };
    pdfSnapshot.contentHash = hashDocumentPdfSnapshot({
      ...pdfSnapshot,
      documentSnapshotHash: documentSnapshot.snapshotHash,
    });
    const tampered: Document = {
      ...issued,
      documentSnapshot,
      pdfSnapshot,
      snapshotSeal: {
        ...issued.snapshotSeal!,
        documentSnapshotHash: documentSnapshot.snapshotHash,
        pdfSnapshotHash: pdfSnapshot.contentHash,
        documentContentHash:
          hashStrongDocumentSnapshotContent(documentSnapshot),
        pdfContentHash: hashStrongDocumentPdfSnapshotContent(
          pdfSnapshot,
          hashStrongDocumentSnapshotContent(documentSnapshot),
        ),
      },
    };

    const integrity = inspectDocumentSnapshotsIntegrity(tampered);
    expect(integrity.issues).toContain(
      "document_snapshot_semantic_invalid",
    );
    expect(integrity.documentSnapshot.status).toBe("verified");
    expect(integrity.pdfSnapshot.status).toBe("verified");
  });

  it("rechaza tipos runtime inválidos aunque se recalculen todos los hashes", () => {
    const issued = issueDocument(invoice(), profile, NOW);
    const documentSnapshot = {
      ...issued.documentSnapshot!,
      customer: {
        ...issued.documentSnapshot!.customer,
        email: { value: "objeto-no-válido" } as unknown as string,
      },
      items: [
        {
          ...issued.documentSnapshot!.items[0],
          unit: { value: "h" } as unknown as string,
        },
      ],
      snapshotHash: "",
    };
    documentSnapshot.snapshotHash = hashDocumentSnapshot(documentSnapshot);
    const pdfSnapshot = { ...issued.pdfSnapshot!, contentHash: "" };
    pdfSnapshot.contentHash = hashDocumentPdfSnapshot({
      ...pdfSnapshot,
      documentSnapshotHash: documentSnapshot.snapshotHash,
    });
    const malformed: Document = {
      ...issued,
      documentSnapshot,
      pdfSnapshot,
      snapshotSeal: {
        ...issued.snapshotSeal!,
        documentSnapshotHash: documentSnapshot.snapshotHash,
        pdfSnapshotHash: pdfSnapshot.contentHash,
        documentContentHash:
          hashStrongDocumentSnapshotContent(documentSnapshot),
        pdfContentHash: hashStrongDocumentPdfSnapshotContent(
          pdfSnapshot,
          hashStrongDocumentSnapshotContent(documentSnapshot),
        ),
      },
    };

    const integrity = inspectDocumentSnapshotsIntegrity(malformed);
    expect(integrity.documentSnapshot.status).toBe("verified");
    expect(integrity.issues).toContain(
      "document_snapshot_semantic_invalid",
    );
  });

  it("issueDocument no reemite ni vuelve a sellar snapshots existentes", () => {
    const existingDocumentSnapshot = buildDocumentSnapshot(invoice(), profile, {
      capturedAt: NOW,
      source: "legacy_backfill",
    });
    const existingPdfSnapshot = buildDocumentPdfSnapshot(
      existingDocumentSnapshot,
      profile,
      NOW,
    );

    expect(() =>
      issueDocument(
        invoice({
          documentSnapshot: existingDocumentSnapshot,
          pdfSnapshot: existingPdfSnapshot,
        }),
        profile,
        LATER,
      ),
    ).toThrow("ya está emitido");
  });

  it("snapshot conserva issuer existente", () => {
    const issued = issueDocument(invoice(), profile, NOW);

    expect(issued.documentSnapshot?.issuer).toEqual(issuer);
    expect(issued.issuer).toEqual(issuer);
  });

  it("snapshot captura issuer desde profile si falta", () => {
    const issued = issueDocument(invoice({ issuer: undefined }), profile, NOW);

    expect(issued.documentSnapshot?.issuer).toMatchObject({
      name: profile.name,
      nif: profile.nif,
      address: profile.address,
      capturedAt: NOW,
    });
    expect(issued.issuer).toEqual(issued.documentSnapshot?.issuer);
  });

  it("snapshot captura cliente, lineas, paymentTerms y notes", () => {
    const issued = issueDocument(invoice(), profile, NOW);
    const snapshot = issued.documentSnapshot;

    expect(snapshot?.customer).toEqual(invoice().client);
    expect(snapshot?.items).toEqual([
      {
        id: "line-1",
        description: "Servicio tecnico",
        quantity: 2,
        unit: "h",
        unitPrice: 50,
        ivaPercent: 21,
        subtotal: 100,
        ivaAmount: 21,
        total: 121,
      },
    ]);
    expect(snapshot?.paymentTerms).toBe("Transferencia");
    expect(snapshot?.notes).toBe("Notas visibles");
  });

  it("snapshot captura desglose de IVA y totales", () => {
    const issued = issueDocument(invoice(), profile, NOW);

    expect(issued.documentSnapshot?.taxSummary).toEqual({
      subtotal: 100,
      iva: 21,
      total: 121,
      vatExempt: false,
      byRate: [
        {
          ivaPercent: 21,
          taxableBase: 100,
          ivaAmount: 21,
          total: 121,
        },
      ],
    });
  });

  it("suma totales y desglose desde las mismas líneas redondeadas", () => {
    const issued = issueDocument(
      invoice({
        items: [
          {
            id: "fraction-1",
            description: "Fracción 1",
            quantity: 1,
            unitPrice: 0.025,
            ivaPercent: 21,
          },
          {
            id: "fraction-2",
            description: "Fracción 2",
            quantity: 1,
            unitPrice: 0.025,
            ivaPercent: 21,
          },
        ],
      }),
      profile,
      NOW,
    );
    const snapshot = issued.documentSnapshot!;
    const lineSubtotalTotal = snapshot.items.reduce(
      (sum, item) => sum + item.subtotal,
      0,
    );
    const lineIvaTotal = snapshot.items.reduce(
      (sum, item) => sum + item.ivaAmount,
      0,
    );
    const byRateBase = snapshot.taxSummary.byRate.reduce(
      (sum, row) => sum + row.taxableBase,
      0,
    );

    expect(snapshot.taxSummary.subtotal).toBe(lineSubtotalTotal);
    expect(snapshot.taxSummary.iva).toBe(lineIvaTotal);
    expect(byRateBase).toBe(lineSubtotalTotal);
    expect(snapshot.taxSummary.total).toBe(
      snapshot.items.reduce((sum, item) => sum + item.total, 0),
    );
  });

  it("una anulación nueva invierte exactamente una media centésima", () => {
    const original = buildDocumentSnapshot(
      invoice({
        items: [
          {
            id: "half-cent-original",
            description: "Fracción",
            quantity: 0.5,
            unitPrice: 0.05,
            ivaPercent: 21,
          },
        ],
      }),
      profile,
      { capturedAt: NOW },
    );
    const cancellation = buildDocumentSnapshot(
      invoice({
        number: "FR-2026-0001",
        items: [
          {
            id: "half-cent-cancellation",
            description: "Fracción",
            quantity: 0.5,
            unitPrice: -0.05,
            ivaPercent: 21,
          },
        ],
      }),
      profile,
      { capturedAt: NOW },
    );

    expect(cancellation.items[0]).toMatchObject({
      subtotal: -original.items[0].subtotal,
      ivaAmount: -original.items[0].ivaAmount,
      total: -original.items[0].total,
    });
    expect(cancellation.taxSummary).toMatchObject({
      subtotal: -original.taxSummary.subtotal,
      iva: -original.taxSummary.iva,
      total: -original.taxSummary.total,
    });
  });

  it("buildDocumentSnapshot captura rectification si existe", () => {
    const rectification = {
      originalDocumentId: "original-1",
      originalNumber: "F-2026-0001",
      originalDate: "2026-05-01",
      reason: "Error en el importe",
      type: "correccion" as const,
    };

    const snapshot = buildDocumentSnapshot(
      invoice({ rectification }),
      profile,
      { capturedAt: NOW },
    );

    expect(snapshot.documentKind).toBe("factura_rectificativa");
    expect(snapshot.rectification).toEqual(rectification);
  });

  it("snapshotHash es estable para el mismo contenido aunque cambie capturedAt", () => {
    const first = issueDocument(invoice({ issuer: undefined }), profile, NOW);
    const second = issueDocument(invoice({ issuer: undefined }), profile, LATER);

    expect(first.documentSnapshot?.snapshotHash).toBe(
      second.documentSnapshot?.snapshotHash,
    );
  });

  it("snapshotHash cambia si cambia contenido documental relevante", () => {
    const first = issueDocument(invoice(), profile, NOW);
    const second = issueDocument(
      invoice({ notes: "Otra nota visible" }),
      profile,
      NOW,
    );

    expect(first.documentSnapshot?.snapshotHash).not.toBe(
      second.documentSnapshot?.snapshotHash,
    );
  });

  it("stableStringifySnapshot no depende del orden de propiedades", () => {
    const left = stableStringifySnapshot({ b: 2, a: { d: 4, c: 3 } });
    const right = stableStringifySnapshot({ a: { c: 3, d: 4 }, b: 2 });

    expect(left).toBe(right);
  });

  it("hashDocumentSnapshot calcula el mismo hash que el snapshot generado", () => {
    const snapshot = buildDocumentSnapshot(invoice(), profile, {
      capturedAt: NOW,
    });

    expect(hashDocumentSnapshot(snapshot)).toBe(snapshot.snapshotHash);
  });

  it("snapshotHash no cambia si solo cambian campos operativos", () => {
    const issued = issueDocument(invoice(), profile, NOW);
    const operationalOnly = buildDocumentSnapshot(
      invoice({
        status: "pagado",
        documentLifecycle: "issued",
        integrityLock: "locked",
        deliveryStatus: "sent",
        paymentStatus: "paid",
        acceptanceStatus: "accepted",
        issuedAt: NOW,
        sentAt: LATER,
        paidAt: LATER,
        acceptedAt: LATER,
        updatedAt: LATER,
      }),
      profile,
      { capturedAt: LATER },
    );

    expect(operationalOnly.snapshotHash).toBe(
      issued.documentSnapshot?.snapshotHash,
    );
  });

  it("hashDocumentPdfSnapshot no depende de renderedAt", () => {
    const documentSnapshot = buildDocumentSnapshot(invoice(), profile, {
      capturedAt: NOW,
    });
    const first = buildDocumentPdfSnapshot(documentSnapshot, profile, NOW);
    const second = buildDocumentPdfSnapshot(documentSnapshot, profile, LATER);

    expect(first.contentHash).toBe(second.contentHash);
    expect(
      hashDocumentPdfSnapshot({
        ...first,
        documentSnapshotHash: documentSnapshot.snapshotHash,
      }),
    ).toBe(first.contentHash);
  });

  it("incluye VeriFactu existente en el snapshot sin generar registros nuevos", () => {
    const verifactu: VerifactuInfo = {
      recordHash: "A".repeat(64),
      previousHash: "B".repeat(64),
      recordTimestamp: "2026-06-24T09:55:00.000Z",
      qrUrl: "https://example.test/qr",
      csv: "CSV-DE-PRUEBA",
      status: "test_registered",
      recordType: "alta",
      environment: "test",
      tipoFactura: "F1",
      cuotaTotal: "21.00",
      importeTotal: "121.00",
    };

    const withVerifactu = issueDocument(
      invoice({
        verifactu,
        verifactuPersistence: "server_confirmed",
      }),
      profile,
      NOW,
    );
    const withoutVerifactu = issueDocument(
      invoice({ verifactu: undefined }),
      profile,
      NOW,
    );

    expect(withVerifactu.documentSnapshot?.verifactu).toEqual(verifactu);
    expect(withVerifactu.documentSnapshot?.snapshotHash).not.toBe(
      withoutVerifactu.documentSnapshot?.snapshotHash,
    );
  });

  it("sella VeriFactu registrado después de emitir y conserva el QR en el PDF", () => {
    const issued = issueDocument(
      invoice({
        documentLifecycle: "draft",
        integrityLock: "unlocked",
        rectification: {
          originalDocumentId: "invoice-original",
          originalNumber: "F-2026-0001",
          originalDate: "2026-06-01",
          reason: "Error en datos",
          type: "correccion",
        },
      }),
      profile,
      NOW,
    );
    const previousSnapshotHash = issued.documentSnapshot?.snapshotHash;
    const previousPdfHash = issued.pdfSnapshot?.contentHash;
    const verifactu: VerifactuInfo = {
      recordHash: "C".repeat(64),
      previousHash: "B".repeat(64),
      recordTimestamp: "2026-06-24T10:01:00.000Z",
      qrUrl: "https://example.test/qr-rectificativa",
      csv: "CSV-RECTIFICATIVA",
      status: "test_registered",
      recordType: "alta",
      environment: "test",
      tipoFactura: "R4",
      cuotaTotal: "21.00",
      importeTotal: "121.00",
    };

    const sealed = attachRegisteredVerifactuToSnapshots({
      ...issued,
      verifactu,
      verifactuPersistence: "server_confirmed",
    });
    const view = buildPdfViewModelForDocument(sealed, profile);

    expect(sealed.documentSnapshot?.verifactu).toEqual(verifactu);
    expect(sealed.documentSnapshot?.snapshotHash).not.toBe(previousSnapshotHash);
    expect(sealed.pdfSnapshot?.contentHash).not.toBe(previousPdfHash);
    expect(
      hashDocumentPdfSnapshot({
        ...sealed.pdfSnapshot!,
        documentSnapshotHash: sealed.documentSnapshot!.snapshotHash,
      }),
    ).toBe(sealed.pdfSnapshot?.contentHash);
    expect(view.doc.verifactu?.qrUrl).toBe(verifactu.qrUrl);
    expect(view.doc.verifactu?.csv).toBe(verifactu.csv);
    expect(
      attachRegisteredVerifactuToSnapshots({ ...sealed, verifactu }),
    ).toEqual(sealed);
    expect(() =>
      attachRegisteredVerifactuToSnapshots({
        ...sealed,
        verifactu: { ...verifactu, recordHash: "D".repeat(64) },
      }),
    ).toThrow("no supera la comprobación de integridad");
  });

  it("no permite adjuntar VeriFactu a presupuesto ni recibo", () => {
    const verifactu: VerifactuInfo = {
      recordHash: "A".repeat(64),
      previousHash: "",
      recordTimestamp: "2026-06-24T10:01:00.000Z",
      qrUrl: "https://example.test/qr",
      status: "test_registered",
      recordType: "alta",
      environment: "test",
    };

    for (const [type, number] of [
      ["presupuesto", "P-2026-0009"],
      ["recibo", "R-2026-0009"],
    ] as const) {
      const issued = issueDocument(
        invoice({ type, number, verifactu: undefined }),
        profile,
        NOW,
      );
      expect(() =>
        attachRegisteredVerifactuToSnapshots({
          ...issued,
          verifactu,
          verifactuPersistence: "server_confirmed",
        }),
      ).toThrow("no supera la comprobación de integridad");
    }
  });

  it("cambiar profile despues de emitir no cambia snapshot", () => {
    const mutableProfile = structuredClone(profile);
    const issued = issueDocument(
      invoice({ issuer: undefined }),
      mutableProfile,
      NOW,
    );

    mutableProfile.name = "Nombre cambiado";
    mutableProfile.address = "Otra direccion";

    expect(issued.documentSnapshot?.issuer.name).toBe(profile.name);
    expect(issued.documentSnapshot?.issuer.address).toBe(profile.address);
  });

  it("cambiar cliente maestro despues de emitir no cambia snapshot", () => {
    const draft = invoice();
    const issued = issueDocument(draft, profile, NOW);

    draft.client.name = "Cliente cambiado";
    draft.client.address = "Otra calle";

    expect(issued.documentSnapshot?.customer.name).toBe("Ana Garcia");
    expect(issued.documentSnapshot?.customer.address).toBe(
      "Calle Cliente 2, 08002 Barcelona",
    );
  });

  it("cambiar plantilla despues de emitir no cambia pdfSnapshot", () => {
    const mutableProfile = structuredClone(profile);
    const issued = issueDocument(invoice(), mutableProfile, NOW);

    mutableProfile.documentTemplate = {
      ...mutableProfile.documentTemplate!,
      style: "clasico",
      accent: "azul",
    };

    expect(issued.pdfSnapshot?.template).toEqual(profile.documentTemplate);
  });

  it("updateDocument no puede modificar campos protegidos de emitidos", () => {
    const issued = issueDocument(invoice(), profile, NOW);
    const existingSnapshot = issued.documentSnapshot!;
    const existingPdfSnapshot = issued.pdfSnapshot!;
    const rectification = {
      originalDocumentId: "original-1",
      originalNumber: "F-2026-0001",
      originalDate: "2026-05-01",
      reason: "Cambio forzado",
      type: "correccion" as const,
    };
    const attempts: Array<[string, Document]> = [
      [
        "documentSnapshot",
        {
          ...issued,
          documentSnapshot: {
            ...existingSnapshot,
            number: "F-2026-9999",
          },
        },
      ],
      [
        "pdfSnapshot",
        {
          ...issued,
          pdfSnapshot: {
            ...existingPdfSnapshot,
            rendererVersion: "otro-renderer",
          },
        },
      ],
      [
        "snapshotHash",
        {
          ...issued,
          documentSnapshot: {
            ...existingSnapshot,
            snapshotHash: "fnv1a32:00000000",
          },
        },
      ],
      ["number", { ...issued, number: "F-2026-9999" }],
      [
        "client",
        { ...issued, client: { ...issued.client, name: "Otro cliente" } },
      ],
      [
        "items",
        {
          ...issued,
          items: [
            {
              ...issued.items[0],
              description: "Otra linea",
            },
          ],
        },
      ],
      ["issuer", { ...issued, issuer: { ...issuer, name: "Otro emisor" } }],
      ["date", { ...issued, date: "2026-06-25" }],
      ["dueDate", { ...issued, dueDate: "2026-08-24" }],
      ["notes", { ...issued, notes: "Otra nota" }],
      ["paymentTerms", { ...issued, paymentTerms: "Bizum" }],
      ["rectification", { ...issued, rectification }],
    ];

    for (const [, manipulated] of attempts) {
      expectIntegrityError(() =>
        applyGenericDocumentUpdate(issued, manipulated),
      );
    }
  });

  it("markDocumentSent no modifica snapshots", () => {
    const issued = issueDocument(invoice(), profile, NOW);
    const sent = markDocumentSent(issued, LATER);

    expect(sent.documentSnapshot).toBe(issued.documentSnapshot);
    expect(sent.pdfSnapshot).toBe(issued.pdfSnapshot);
  });

  it("markDocumentPaid no modifica snapshots", () => {
    const issued = issueDocument(invoice(), profile, NOW);
    const paid = markDocumentPaid(issued, LATER);

    expect(paid.documentSnapshot).toBe(issued.documentSnapshot);
    expect(paid.pdfSnapshot).toBe(issued.pdfSnapshot);
  });

  it("acceptQuote no modifica snapshots", () => {
    const quote = issueDocument(
      invoice({
        type: "presupuesto",
        number: "P-2026-0002",
        verifactu: undefined,
      }),
      profile,
      NOW,
    );
    const accepted = acceptQuote(quote, LATER);

    expect(accepted.documentSnapshot).toBe(quote.documentSnapshot);
    expect(accepted.pdfSnapshot).toBe(quote.pdfSnapshot);
  });

  it("rejectQuote no modifica snapshots", () => {
    const quote = issueDocument(
      invoice({
        type: "presupuesto",
        number: "P-2026-0002",
        verifactu: undefined,
      }),
      profile,
      NOW,
    );
    const rejected = rejectQuote(quote, LATER);

    expect(rejected.documentSnapshot).toBe(quote.documentSnapshot);
    expect(rejected.pdfSnapshot).toBe(quote.pdfSnapshot);
  });

  it("aceptación y rechazo usan el tipo canónico y verifican integridad", () => {
    const issuedInvoice = issueDocument(invoice(), profile, NOW);
    const disguised: Document = {
      ...issuedInvoice,
      type: "presupuesto",
    };
    expect(() => acceptQuote(disguised, LATER)).toThrow(
      "no es válida para este tipo de documento",
    );
    expect(() => rejectQuote(disguised, LATER)).toThrow(
      "no es válida para este tipo de documento",
    );

    const quote = issueDocument(
      invoice({
        type: "presupuesto",
        number: "P-2026-0003",
        verifactu: undefined,
      }),
      profile,
      NOW,
    );
    const corrupt: Document = {
      ...quote,
      documentSnapshot: {
        ...quote.documentSnapshot!,
        number: "P-ALTERADO",
      },
    };
    expect(() => acceptQuote(corrupt, LATER)).toThrow(
      "no supera la comprobación de integridad",
    );
    expect(() => rejectQuote(corrupt, LATER)).toThrow(
      "no supera la comprobación de integridad",
    );
  });

  it("operaciones repetidas no modifican snapshots ni hashes", () => {
    const issued = issueDocument(invoice(), profile, NOW);
    const sent = markDocumentSent(markDocumentSent(issued, LATER), LATER);
    const paid = markDocumentPaid(markDocumentPaid(issued, LATER), LATER);
    const quote = issueDocument(
      invoice({
        type: "presupuesto",
        number: "P-2026-0002",
        verifactu: undefined,
      }),
      profile,
      NOW,
    );
    const accepted = acceptQuote(acceptQuote(quote, LATER), LATER);
    const rejected = rejectQuote(rejectQuote(quote, LATER), LATER);

    for (const current of [sent, paid]) {
      expect(current.documentSnapshot).toBe(issued.documentSnapshot);
      expect(current.pdfSnapshot).toBe(issued.pdfSnapshot);
      expect(current.documentSnapshot?.snapshotHash).toBe(
        issued.documentSnapshot?.snapshotHash,
      );
      expect(current.pdfSnapshot?.contentHash).toBe(
        issued.pdfSnapshot?.contentHash,
      );
    }

    expect(accepted.documentSnapshot).toBe(quote.documentSnapshot);
    expect(accepted.pdfSnapshot).toBe(quote.pdfSnapshot);
    expect(accepted.documentSnapshot?.snapshotHash).toBe(
      quote.documentSnapshot?.snapshotHash,
    );
    expect(rejected.documentSnapshot).toBe(quote.documentSnapshot);
    expect(rejected.pdfSnapshot).toBe(quote.pdfSnapshot);
    expect(rejected.documentSnapshot?.snapshotHash).toBe(
      quote.documentSnapshot?.snapshotHash,
    );
  });

  it("documento legacy emitido sin snapshot sigue bloqueado", () => {
    const legacy = invoice({
      status: "enviado",
      documentSnapshot: undefined,
      pdfSnapshot: undefined,
    });

    expect(hasDocumentSnapshot(legacy)).toBe(false);
    expect(isDocumentIntegrityLocked(legacy)).toBe(true);
    expectIntegrityError(() => applyGenericDocumentUpdate(legacy, legacy));
  });

  it("documento legacy borrador sin snapshot sigue editable", () => {
    const legacyDraft = invoice({
      status: "borrador",
      documentSnapshot: undefined,
      pdfSnapshot: undefined,
    });

    expect(hasDocumentSnapshot(legacyDraft)).toBe(false);
    expect(isDocumentIntegrityLocked(legacyDraft)).toBe(false);
    expect(() =>
      applyGenericDocumentUpdate(legacyDraft, {
        ...legacyDraft,
        notes: "Borrador legacy editable",
      }),
    ).not.toThrow();
  });

  it("deriveLegacySnapshotForReadOnly crea snapshot no destructivo con source legacy_backfill", () => {
    const legacy = invoice({ status: "enviado", documentSnapshot: undefined });
    const snapshot = deriveLegacySnapshotForReadOnly(legacy, profile, NOW);

    expect(snapshot.source).toBe("legacy_backfill");
    expect(getDocumentSnapshotSource({ ...legacy, documentSnapshot: snapshot })).toBe(
      "legacy_backfill",
    );
    expect(legacy.documentSnapshot).toBeUndefined();
  });

  it("la generacion PDF actual funciona con y sin snapshots", () => {
    const draftPdf = buildDocumentPdf(invoice(), profile);
    const issued = issueDocument(invoice(), profile, NOW);
    const snapshotPdf = buildDocumentPdf(issued, profile);

    expect(draftPdf.getNumberOfPages()).toBe(1);
    expect(snapshotPdf.getNumberOfPages()).toBe(1);
    expect(issued.documentSnapshot).toBeDefined();
    expect(issued.pdfSnapshot).toBeDefined();
  });
});
