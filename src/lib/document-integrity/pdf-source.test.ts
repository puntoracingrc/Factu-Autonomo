import { describe, expect, it } from "vitest";
import { issueDocument } from "@/lib/document-integrity";
import {
  buildPdfViewModelForDocument,
  documentPdfViewAmounts,
  getDocumentPdfSource,
  isHistoricalPdfRenderRequired,
} from "@/lib/document-integrity/pdf-source";
import {
  DEFAULT_DOCUMENT_TEMPLATE,
} from "@/lib/document-templates";
import { buildDocumentPdf } from "@/lib/pdf";
import type {
  BusinessProfile,
  Document,
  DocumentTemplateSettings,
  IssuerSnapshot,
} from "@/lib/types";

const NOW = "2026-06-24T10:00:00.000Z";

const issuer: IssuerSnapshot = {
  commercialName: "RC Workshop",
  name: "Punto Racing RC",
  nif: "12345678Z",
  address: "Calle Mayor 1",
  city: "Barcelona",
  postalCode: "08001",
  phone: "600000000",
  email: "hola@example.com",
  iban: "ES0000000000000000000000",
  logoUrl: "data:image/png;base64,logo-historico",
  capturedAt: "2026-06-01T10:00:00.000Z",
};

const template: DocumentTemplateSettings = {
  ...DEFAULT_DOCUMENT_TEMPLATE,
  style: "futuro",
  font: "tecnica",
  accent: "coral",
  density: "compacta",
  showLogo: true,
  showIssuerBox: true,
  showPaymentBox: true,
};

const profile: BusinessProfile = {
  commercialName: issuer.commercialName,
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
  documentTemplate: template,
  numbering: {
    year: 2026,
    lastSequence: {
      factura: 7,
      factura_rectificativa: 0,
      presupuesto: 2,
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

function changedProfile(): BusinessProfile {
  return {
    ...profile,
    commercialName: "Marca cambiada",
    name: "Negocio cambiado",
    nif: "99999999R",
    address: "Otra calle 99",
    city: "Madrid",
    postalCode: "28001",
    phone: "699999999",
    email: "nuevo@example.com",
    iban: "ES9999999999999999999999",
    logoUrl: "data:image/png;base64,logo-nuevo",
    vatExempt: true,
    documentTemplate: {
      ...DEFAULT_DOCUMENT_TEMPLATE,
      style: "clasico",
      accent: "azul",
      density: "amplia",
      showLogo: false,
      showIssuerBox: false,
      showPaymentBox: false,
    },
  };
}

function mutatedIssuedDocument(issued: Document): Document {
  return {
    ...issued,
    number: "F-2099-9999",
    date: "2099-01-01",
    dueDate: "2099-02-01",
    client: {
      name: "Cliente vivo cambiado",
      nif: "99999999R",
      email: "cambiado@example.com",
      phone: "699999999",
      address: "Direccion cambiada",
    },
    items: [
      {
        id: "line-mutated",
        description: "Linea viva cambiada",
        quantity: 99,
        unitPrice: 999,
        ivaPercent: 0,
      },
    ],
    issuer: {
      ...issuer,
      name: "Emisor vivo cambiado",
      nif: "00000000T",
      logoUrl: "data:image/png;base64,logo-vivo-cambiado",
    },
    notes: "Notas cambiadas",
    paymentTerms: "Bizum cambiado",
    updatedAt: "2099-01-01T00:00:00.000Z",
  };
}

describe("document PDF source", () => {
  it("usa documentSnapshot/pdfSnapshot para facturas emitidas aunque cambien datos vivos", () => {
    const issued = issueDocument(invoice(), profile, NOW);
    const mutated = mutatedIssuedDocument(issued);
    const view = buildPdfViewModelForDocument(mutated, changedProfile());

    expect(getDocumentPdfSource(mutated)).toBe("snapshot");
    expect(view.source).toBe("snapshot");
    expect(view.doc.number).toBe("F-2026-0007");
    expect(view.doc.date).toBe("2026-06-24");
    expect(view.doc.dueDate).toBe("2026-07-24");
    expect(view.doc.client.name).toBe("Ana Garcia");
    expect(view.issuer.commercialName).toBe("RC Workshop");
    expect(view.issuer.name).toBe("Punto Racing RC");
    expect(view.issuer.nif).toBe("12345678Z");
    expect(view.items).toHaveLength(1);
    expect(view.items[0]).toMatchObject({
      description: "Servicio tecnico",
      quantity: 2,
      unitPrice: 50,
      ivaPercent: 21,
      total: 121,
    });
    expect(documentPdfViewAmounts(view)).toEqual({
      subtotal: 100,
      iva: 21,
      total: 121,
    });
    expect(view.template).toEqual(issued.pdfSnapshot?.template);
    expect(view.logoUrl).toBe("data:image/png;base64,logo-historico");
  });

  it("renderizar PDF historico no modifica snapshots ni hashes", () => {
    const issued = issueDocument(invoice(), profile, NOW);
    const beforeDocumentSnapshot = JSON.stringify(issued.documentSnapshot);
    const beforePdfSnapshot = JSON.stringify(issued.pdfSnapshot);
    const snapshotHash = issued.documentSnapshot?.snapshotHash;
    const contentHash = issued.pdfSnapshot?.contentHash;

    const pdf = buildDocumentPdf(mutatedIssuedDocument(issued), changedProfile());

    expect(pdf.getNumberOfPages()).toBe(1);
    expect(JSON.stringify(issued.documentSnapshot)).toBe(beforeDocumentSnapshot);
    expect(JSON.stringify(issued.pdfSnapshot)).toBe(beforePdfSnapshot);
    expect(issued.documentSnapshot?.snapshotHash).toBe(snapshotHash);
    expect(issued.pdfSnapshot?.contentHash).toBe(contentHash);
  });

  it("los borradores siguen usando datos vivos y perfil actual", () => {
    const draft = invoice();
    const changedDraft = {
      ...draft,
      issuer: undefined,
      client: { name: "Cliente borrador cambiado" },
      items: [
        {
          id: "line-draft",
          description: "Servicio borrador nuevo",
          quantity: 3,
          unitPrice: 20,
          ivaPercent: 10,
        },
      ],
    };
    const view = buildPdfViewModelForDocument(changedDraft, changedProfile());

    expect(isHistoricalPdfRenderRequired(changedDraft)).toBe(false);
    expect(view.source).toBe("live");
    expect(view.doc.client.name).toBe("Cliente borrador cambiado");
    expect(view.issuer.commercialName).toBe("Marca cambiada");
    expect(view.issuer.name).toBe("Negocio cambiado");
    expect(view.template).toEqual(changedProfile().documentTemplate);
    expect(documentPdfViewAmounts(view)).toEqual({
      subtotal: 60,
      iva: 0,
      total: 60,
    });
  });

  it("presupuesto y factura nuevos usan el perfil emisor actual", () => {
    const currentProfile = changedProfile();
    const quoteView = buildPdfViewModelForDocument(
      invoice({
        type: "presupuesto",
        number: "P-2026-0003",
        issuer: undefined,
      }),
      currentProfile,
    );
    const invoiceView = buildPdfViewModelForDocument(
      invoice({ issuer: undefined }),
      currentProfile,
    );

    expect(quoteView.source).toBe("live");
    expect(invoiceView.source).toBe("live");
    expect(quoteView.issuer).toMatchObject({
      commercialName: "Marca cambiada",
      name: "Negocio cambiado",
      nif: "99999999R",
      address: "Otra calle 99",
      city: "Madrid",
      postalCode: "28001",
    });
    expect(invoiceView.issuer).toMatchObject(quoteView.issuer);
  });

  it("documento emitido con documentSnapshot pero sin pdfSnapshot usa snapshot documental sin persistir pdfSnapshot", () => {
    const issued = issueDocument(invoice(), profile, NOW);
    const partialLegacy: Document = {
      ...mutatedIssuedDocument(issued),
      pdfSnapshot: undefined,
    };
    const view = buildPdfViewModelForDocument(partialLegacy, changedProfile());

    expect(view.source).toBe("snapshot_without_pdf_settings");
    expect(view.hasOriginalDocumentSnapshot).toBe(true);
    expect(view.hasOriginalPdfSnapshot).toBe(false);
    expect(view.doc.client.name).toBe("Ana Garcia");
    expect(view.template).toEqual(changedProfile().documentTemplate);
    expect(partialLegacy.pdfSnapshot).toBeUndefined();
  });

  it("documento legacy bloqueado sin snapshot usa fallback conservador y no persiste snapshot", () => {
    const legacy: Document = {
      ...invoice({ status: "enviado" }),
      documentSnapshot: undefined,
      pdfSnapshot: undefined,
    };
    const view = buildPdfViewModelForDocument(legacy, changedProfile());

    expect(view.source).toBe("legacy_read_only");
    expect(view.hasOriginalDocumentSnapshot).toBe(false);
    expect(view.documentSnapshot?.source).toBe("legacy_backfill");
    expect(view.doc.client.name).toBe("Ana Garcia");
    expect(legacy.documentSnapshot).toBeUndefined();
    expect(legacy.pdfSnapshot).toBeUndefined();
  });

  it("presupuestos usan fuente viva y recibos emitidos usan snapshot", () => {
    const quote = issueDocument(
      invoice({
        type: "presupuesto",
        number: "P-2026-0002",
        dueDate: undefined,
      }),
      profile,
      NOW,
    );
    const receipt = issueDocument(
      invoice({
        type: "recibo",
        number: "R-2026-0001",
        dueDate: undefined,
      }),
      profile,
      NOW,
    );

    const quoteView = buildPdfViewModelForDocument(
      mutatedIssuedDocument(quote),
      changedProfile(),
    );
    const receiptView = buildPdfViewModelForDocument(
      mutatedIssuedDocument(receipt),
      changedProfile(),
    );

    expect(quoteView.source).toBe("live");
    expect(quoteView.doc.client.name).toBe("Cliente vivo cambiado");
    expect(receiptView.source).toBe("snapshot");
  });
});
