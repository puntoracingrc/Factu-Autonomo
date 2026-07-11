import { describe, expect, it } from "vitest";
import {
  acceptQuote,
  attachRegisteredVerifactuToSnapshots,
  applyGenericDocumentUpdate,
  buildDocumentPdfSnapshot,
  buildDocumentSnapshot,
  deriveLegacySnapshotForReadOnly,
  DocumentIntegrityError,
  getDocumentSnapshotSource,
  hasDocumentSnapshot,
  hashDocumentPdfSnapshot,
  hashDocumentSnapshot,
  issueDocument,
  isDocumentIntegrityLocked,
  markDocumentPaid,
  markDocumentSent,
  rejectQuote,
  stableStringifySnapshot,
} from ".";
import { buildPdfViewModelForDocument } from "./pdf-source";
import { buildDocumentPdf } from "../pdf";
import type {
  BusinessProfile,
  Document,
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
  verifactu: { enabled: true, environment: "test" },
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

function expectIntegrityError(action: () => unknown) {
  expect(action).toThrow(DocumentIntegrityError);
}

describe("document snapshots", () => {
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
    expect(issued.documentSnapshot?.snapshotHash).toMatch(/^fnv1a32:/);
    expect(issued.pdfSnapshot).toMatchObject({
      schemaVersion: 1,
      renderedAt: NOW,
      rendererVersion: "document-pdf-renderer-v1",
      template: profile.documentTemplate,
    });
    expect(issued.pdfSnapshot?.contentHash).toMatch(/^fnv1a32:/);
  });

  it("issueDocument respeta snapshots existentes y no los reconstruye", () => {
    const existingDocumentSnapshot = buildDocumentSnapshot(invoice(), profile, {
      capturedAt: NOW,
      source: "legacy_backfill",
    });
    const existingPdfSnapshot = buildDocumentPdfSnapshot(
      existingDocumentSnapshot,
      profile,
      NOW,
    );

    const issued = issueDocument(
      invoice({
        documentSnapshot: existingDocumentSnapshot,
        pdfSnapshot: existingPdfSnapshot,
      }),
      profile,
      LATER,
    );

    expect(issued.documentSnapshot).toBe(existingDocumentSnapshot);
    expect(issued.pdfSnapshot).toBe(existingPdfSnapshot);
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
      recordHash: "hash-alta",
      previousHash: "hash-previo",
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

    const withVerifactu = issueDocument(invoice({ verifactu }), profile, NOW);
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
      recordHash: "hash-rectificativa",
      previousHash: "hash-previo",
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
