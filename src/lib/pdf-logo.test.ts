import { describe, expect, it } from "vitest";
import { formatMoney } from "./calculations";
import { DEFAULT_DOCUMENT_TEMPLATE } from "./document-templates";
import { DEFAULT_PROFILE } from "./types";
import type { Document } from "./types";
import { buildDocumentPdf, pdfVatTotalLines } from "./pdf";
import { logoMimeFormat, pdfLogoDrawSize, resolvePdfLogoUrl } from "./pdf-logo";

const baseDoc: Document = {
  id: "1",
  type: "factura",
  number: "F-2026-0001",
  date: "2026-06-09",
  client: { name: "Cliente" },
  items: [],
  status: "enviado",
  createdAt: "",
  updatedAt: "",
};

describe("resolvePdfLogoUrl", () => {
  it("usa el logo del perfil si el snapshot emitido no lo tenía", () => {
    const profile = {
      ...DEFAULT_PROFILE,
      logoUrl: "data:image/png;base64,abc",
    };
    const doc: Document = {
      ...baseDoc,
      issuer: {
        name: "Emisor",
        nif: "12345678Z",
        address: "",
        city: "",
        postalCode: "",
        capturedAt: "2026-01-01",
      },
    };

    expect(resolvePdfLogoUrl(doc, profile)).toBe("data:image/png;base64,abc");
  });
});

describe("logoMimeFormat", () => {
  it("reconoce formatos habituales de móvil", () => {
    expect(logoMimeFormat("data:image/jpeg;base64,x")).toBe("JPEG");
    expect(logoMimeFormat("data:image/webp;base64,x")).toBe("WEBP");
    expect(logoMimeFormat("data:image/jpg;base64,x")).toBe("JPEG");
  });
});

describe("pdfLogoDrawSize", () => {
  it("mantiene la proporción dentro del bloque del PDF", () => {
    const size = pdfLogoDrawSize({ dataUrl: "x", width: 200, height: 100 });
    expect(size.width).toBe(40);
    expect(size.height).toBe(20);
  });
});

describe("buildDocumentPdf", () => {
  it("resume un único IVA sin repetir base y cuota", () => {
    expect(
      pdfVatTotalLines({
        breakdown: [{ rate: 21, base: 531.5, quota: 111.62 }],
        subtotal: 531.5,
        iva: 111.62,
      }),
    ).toEqual([
      `Base imponible: ${formatMoney(531.5)}`,
      `IVA 21%: ${formatMoney(111.62)}`,
    ]);
  });

  it("mantiene desglose por tipo cuando hay varios IVAs", () => {
    expect(
      pdfVatTotalLines({
        breakdown: [
          { rate: 10, base: 100, quota: 10 },
          { rate: 21, base: 200, quota: 42 },
        ],
        subtotal: 300,
        iva: 52,
      }),
    ).toEqual([
      `IVA 10% — Base: ${formatMoney(100)} · Cuota: ${formatMoney(10)}`,
      `IVA 21% — Base: ${formatMoney(200)} · Cuota: ${formatMoney(42)}`,
      `Base imponible: ${formatMoney(300)}`,
      `IVA total: ${formatMoney(52)}`,
    ]);
  });

  it("genera PDF con una plantilla avanzada", () => {
    const pdf = buildDocumentPdf(
      {
        ...baseDoc,
        items: [
          {
            id: "l1",
            description: "Servicio",
            quantity: 1,
            unitPrice: 100,
            ivaPercent: 21,
          },
        ],
      },
      {
        ...DEFAULT_PROFILE,
        name: "Mi negocio",
        documentTemplate: {
          ...DEFAULT_DOCUMENT_TEMPLATE,
          style: "futuro",
          accent: "coral",
          density: "compacta",
          showLogo: true,
          showIssuerBox: true,
          showPaymentBox: true,
        },
      },
    );

    expect(pdf.getNumberOfPages()).toBe(1);
  });

  it("compacta los datos del emisor en menos líneas", () => {
    const pdf = buildDocumentPdf(
      {
        ...baseDoc,
        items: [
          {
            id: "l1",
            description: "Servicio",
            quantity: 1,
            unitPrice: 100,
            ivaPercent: 21,
          },
        ],
      },
      {
        ...DEFAULT_PROFILE,
        commercialName: "Persianas Almar",
        name: "Alberto Miguel Ibanez de Ocapua Munoz",
        nif: "46402457A",
        address: "Carrer de Valencia, 542",
        postalCode: "08013",
        city: "Barcelona",
        province: "Barcelona",
        country: "Espana",
        phone: "671127258",
        email: "persianasalmar@gmail.com",
        website: "https://www.persialmar.es",
      },
    );
    const output = pdf.output();

    expect(output).toContain(
      "Titular fiscal: Alberto Miguel Ibanez de Ocapua",
    );
    expect(output).toContain("Munoz · NIF: 46402457A");
    expect(output).toContain("Carrer de Valencia, 542 · 08013 Barcelona,");
    expect(output).toContain("Barcelona · Espana");
    expect(output).toContain("Tel: 671127258 · persianasalmar@gmail.com ·");
    expect(output).toContain("https://www.persialmar.es");
  });

  it("genera rectificativa con cliente largo, pago y notas", () => {
    const pdf = buildDocumentPdf(
      {
        ...baseDoc,
        number: "FR-2026-0001",
        client: {
          name: "DOSARTEC OBRAS Y SERVICIOS, S.L. OBRAS Y SERVICIOS",
          nif: "B67023176",
          address: "Avda. d'Andorra nº 6, 08830 Sant Boi Llobregat",
        },
        rectification: {
          originalDocumentId: "1",
          originalNumber: "F-2026-2951",
          originalDate: "2026-07-06",
          reason: "Error en los datos del cliente",
          type: "correccion",
        },
        paymentTerms: "Transferencia bancaria a 30 días",
        notes: "Texto escrito a mano en la factura original",
        items: [
          {
            id: "l1",
            description: "Reparación de Persianas Supergradheremetic",
            quantity: 3,
            unitPrice: 80,
            ivaPercent: 21,
          },
        ],
      },
      DEFAULT_PROFILE,
    );
    const output = pdf.output();

    expect(pdf.getNumberOfPages()).toBe(1);
    expect(output).toContain("DOSARTEC OBRAS Y SERVICIOS");
    expect(output).toContain("Transferencia bancaria");
    expect(output).toContain("Texto escrito a mano");
  });

  it("añade la marca de plan gratis solo cuando se solicita", () => {
    const doc: Document = {
      ...baseDoc,
      items: [
        {
          id: "l1",
          description: "Servicio",
          quantity: 1,
          unitPrice: 100,
          ivaPercent: 21,
        },
      ],
    };
    const freePdf = buildDocumentPdf(doc, DEFAULT_PROFILE, {}, {
      freePlanBranding: true,
    });
    const proPdf = buildDocumentPdf(doc, DEFAULT_PROFILE);

    expect(freePdf.output()).toContain(
      "Factura realizada con facturacion-autonomos.app",
    );
    expect(proPdf.output()).not.toContain(
      "Factura realizada con facturacion-autonomos.app",
    );
  });
});
