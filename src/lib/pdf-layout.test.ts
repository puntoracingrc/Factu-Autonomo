import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import type { jsPDF } from "jspdf";
import { describe, expect, it } from "vitest";
import { formatMoney } from "./calculations";
import { DEFAULT_DOCUMENT_TEMPLATE, documentTemplateDensityPadding, documentTemplatePdfFont, documentTemplatePdfFontSize } from "./document-templates";
import { buildDocumentPdf, type PdfArtifacts } from "./pdf";
import { DEFAULT_PROFILE, type Document, type DocumentTemplateStyle } from "./types";

// Repository-owned icon; the optional local preview path is never used in CI.
const logo: PdfArtifacts = { logo: {
  dataUrl: `data:image/png;base64,${readFileSync(new URL("../../public/icon-128.png", import.meta.url)).toString("base64")}`,
  width: 200, height: 100,
} };
const profile = {
  ...DEFAULT_PROFILE,
  name: "Empresa de ejemplo SL", nif: "B12345678",
  address: "Calle de ejemplo, 12", postalCode: "08001", city: "Barcelona",
  province: "Barcelona", country: "España", email: "empresa@example.com",
  documentTemplate: { ...DEFAULT_DOCUMENT_TEMPLATE },
};
const invoice: Document = {
  id: "pdf-layout-example", type: "factura", number: "F-2026-1009",
  date: "2026-10-07", dueDate: "2026-11-07", status: "borrador",
  client: { name: "Cliente de ejemplo", nif: "12345678Z", address: "Calle de prueba, 20, Barcelona" },
  items: [{ id: "line-1", description: "Servicio de ejemplo", quantity: 1, unitPrice: 80, ivaPercent: 21 }],
  notes: "Trabajo realizado en la vivienda. Gracias por confiar en nosotros.",
  createdAt: "2026-10-07T10:00:00Z", updatedAt: "2026-10-07T10:00:00Z",
};
const examples: Array<{ filename: string; title: string; doc: Document }> = [
  { filename: "factura", title: "FACTURA", doc: invoice },
  { filename: "presupuesto", title: "PRESUPUESTO", doc: { ...invoice, type: "presupuesto", number: "P-2026-0001" } },
  { filename: "recibo", title: "RECIBO", doc: { ...invoice, type: "recibo", number: "R-2026-0001", dueDate: undefined } },
  { filename: "rectificativa", title: "FACTURA RECTIFICATIVA", doc: {
    ...invoice, number: "FR-2026-0001", rectification: {
      originalDocumentId: "original-example", originalNumber: "F-2026-0001",
      originalDate: "2026-10-01", type: "correccion", reason: "Corrección de los datos del cliente",
    },
  } },
];

function textPosition(pdf: jsPDF, prefix: string) {
  const pages = (pdf.internal as typeof pdf.internal & { pages: string[][] }).pages;
  for (let page = 1; page < pages.length; page += 1) {
    for (const command of pages[page]) {
      if (!command.includes(`(${prefix}`)) continue;
      const match = command.match(/(-?[\d.]+) (-?[\d.]+) Td/);
      if (match) return {
        page,
        x: Number(match[1]) / pdf.internal.scaleFactor,
        y: pdf.internal.pageSize.getHeight() - Number(match[2]) / pdf.internal.scaleFactor,
      };
    }
  }
  throw new Error(`PDF text not found: ${prefix}`);
}

// jsPDF's right-aligned text uses unkerned widths (unlike getTextWidth).
function rightAlignedWidth(pdf: jsPDF, text: string) {
  return pdf.getStringUnitWidth(text, {
    font: pdf.getFont(), fontSize: pdf.getFontSize(), doKerning: false,
  }) * pdf.getFontSize() / pdf.internal.scaleFactor;
}

describe("shared document PDF alignment", () => {
  for (const style of ["clasico", "editorial", "futuro"] as DocumentTemplateStyle[]) {
    for (const example of examples) {
      it(`${example.filename}: title beside logo, metadata and totals right-aligned (${style})`, () => {
        const template = { ...DEFAULT_DOCUMENT_TEMPLATE, style };
        const pdf = buildDocumentPdf(example.doc, { ...profile, documentTemplate: template }, logo);
        const title = textPosition(pdf, example.title);
        const client = textPosition(pdf, "Cliente:");
        const notes = textPosition(pdf, "Notas");
        const noteBody = textPosition(pdf, "Trabajo realizado");
        const concepts = textPosition(pdf, "Concepto");
        expect(notes.page).toBe(client.page);
        expect(notes.y).toBeGreaterThan(client.y);
        expect(noteBody.y).toBeGreaterThan(notes.y);
        expect(concepts.y).toBeGreaterThan(noteBody.y + 8);
        expect(noteBody.x).toBeCloseTo(18);
        expect(pdf.output().match(/\(Trabajo realizado/g)).toHaveLength(1);
        const logoTop = style === "futuro" ? 24 : 14;
        expect(title.x).toBeCloseTo(14);
        expect(title.y).toBeGreaterThan(logoTop);
        expect(title.y).toBeLessThan(logoTop + 20);
        const font = documentTemplatePdfFont(template.font);
        const bodySize = documentTemplatePdfFontSize(template.bodyFontSize, "body");
        pdf.setFont(font, "normal");
        pdf.setFontSize(bodySize + 1);
        for (const text of [`Nº ${example.doc.number}`, "Fecha: 07/10/2026"]) {
          const position = textPosition(pdf, text);
          expect(position.x + rightAlignedWidth(pdf, text)).toBeCloseTo(196);
          expect(position.y).toBeGreaterThan(logoTop + 20);
        }
        const right = 196 - documentTemplateDensityPadding(template.density);
        pdf.setFontSize(bodySize);
        for (const text of [`Base imponible: ${formatMoney(80)}`, `IVA 21%: ${formatMoney(16.8)}`]) {
          expect(textPosition(pdf, text.split(":")[0]).x + rightAlignedWidth(pdf, text)).toBeCloseTo(right);
        }
        pdf.setFont(font, "bold");
        pdf.setFontSize(documentTemplatePdfFontSize(template.totalFontSize, "total"));
        expect(textPosition(pdf, "TOTAL:").x + rightAlignedWidth(pdf, `TOTAL: ${formatMoney(96.8)}`)).toBeCloseTo(right);
        pdf.setFont(font, "normal");
        pdf.setFontSize(style === "futuro" ? bodySize - 0.4 : bodySize);
        expect(textPosition(pdf, "96,80").x + pdf.getTextWidth(formatMoney(96.8))).toBeCloseTo(right);
        pdf.setFont(font, "bold");
        expect(textPosition(pdf, "Total").x + pdf.getTextWidth("Total")).toBeCloseTo(right);
        expect(pdf.getNumberOfPages()).toBe(1);
      });
    }
  }

  it("keeps VAT-exempt totals aligned with the last amount column", () => {
    const pdf = buildDocumentPdf(invoice, { ...profile, vatExempt: true }, logo);
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(12.5);
    expect(textPosition(pdf, "TOTAL:").x + rightAlignedWidth(pdf, `TOTAL: ${formatMoney(80)}`)).toBeCloseTo(193.6);
    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(8.2);
    expect(textPosition(pdf, "Operaci").x + rightAlignedWidth(pdf, "Operación exenta de IVA")).toBeCloseTo(193.6);
  });

  it("right-aligns each tax rate without changing its amounts", () => {
    const pdf = buildDocumentPdf({ ...invoice, items: [
      ...invoice.items,
      { id: "line-2", description: "Segundo servicio", quantity: 1, unitPrice: 100, ivaPercent: 10 },
    ] }, profile, logo);
    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(9.2);
    expect(textPosition(pdf, "Base imponible:").x + rightAlignedWidth(pdf, `Base imponible: ${formatMoney(180)}`)).toBeCloseTo(193.6);
    expect(pdf.output()).toContain("IVA 10%");
    expect(pdf.output()).toContain("IVA 21%");
  });

  it("does not reserve an empty logo band when the logo is absent, hidden or invalid", () => {
    for (const [artifacts, showLogo] of [[{}, true], [logo, false], [{ logo: { dataUrl: "broken", width: 200, height: 100 } }, true]] as const) {
      const pdf = buildDocumentPdf(invoice, { ...profile, documentTemplate: { ...DEFAULT_DOCUMENT_TEMPLATE, showLogo } }, artifacts);
      expect(textPosition(pdf, "FACTURA").y).toBeLessThan(25);
      expect(pdf.getNumberOfPages()).toBe(1);
    }
  });

  it("wraps long numbers inside the right column and keeps the client below metadata", () => {
    const pdf = buildDocumentPdf({ ...invoice, number: "F-2026-" + "1234567890".repeat(8) }, profile, logo);
    const client = textPosition(pdf, "Cliente:");
    const dueDate = textPosition(pdf, "Vencimiento:");
    expect(client.y).toBeGreaterThan(dueDate.y + 5);
  });

  it("moves the full totals block to another page when the table fills the page", () => {
    let checkedPageBreak = false;
    for (let count = 18; count < 45; count += 1) {
      const pdf = buildDocumentPdf({ ...invoice, items: Array.from({ length: count }, (_, i) => ({
        ...invoice.items[0], id: `line-${i}`, description: `Servicio ${i + 1}`, ivaPercent: i % 2 ? 21 : 10,
      })) }, profile, logo, { websiteFooter: true });
      const table = (pdf as jsPDF & { lastAutoTable: { finalY: number; startPageNumber: number; pageNumber: number } }).lastAutoTable;
      if (table.finalY + 10 + 34 <= 281) continue;
      const base = textPosition(pdf, "Base imponible:");
      const total = textPosition(pdf, "TOTAL:");
      expect(base.page).toBe(total.page);
      expect(total.page).toBe(table.startPageNumber + table.pageNumber);
      expect(total.y).toBeLessThan(281);
      checkedPageBreak = true;
      break;
    }
    expect(checkedPageBreak).toBe(true);
  });

  it("keeps large serif and monospace titles inside the left header column", () => {
    for (const font of ["clasica", "tecnica"] as const) {
      const pdf = buildDocumentPdf(examples[3].doc, { ...profile, documentTemplate: {
        ...DEFAULT_DOCUMENT_TEMPLATE, font, titleFontSize: "grande", bodyFontSize: "grande", density: "amplia",
      } }, logo);
      const title = textPosition(pdf, "FACTURA");
      const number = textPosition(pdf, "Nº");
      expect(title.x).toBeCloseTo(14);
      expect(number.y).toBeGreaterThan(title.y);
      expect(pdf.getNumberOfPages()).toBe(1);
    }
  });

  it("changes only presentation, not the source document or company settings", () => {
    const before = JSON.stringify({ invoice, profile });
    buildDocumentPdf(invoice, profile, logo);
    expect(JSON.stringify({ invoice, profile })).toBe(before);
  });

  it("does not add an empty notes box when notes are absent or whitespace", () => {
    for (const notes of [undefined, "", "   "]) {
      const pdf = buildDocumentPdf({ ...invoice, notes }, profile, logo);
      expect(pdf.output()).not.toContain("(Notas)");
      expect(textPosition(pdf, "Concepto").page).toBe(1);
    }
  });

  it("paginates long note boxes before the concepts without losing or repeating text", () => {
    const notes = Array.from({ length: 120 }, (_, i) => `Nota de prueba ${String(i).padStart(3, "0")}`).join("\n");
    const pdf = buildDocumentPdf({ ...invoice, notes }, profile, logo, { websiteFooter: true });
    const lastNote = textPosition(pdf, "Nota de prueba 119");
    const concepts = textPosition(pdf, "Concepto");
    expect(lastNote.page).toBeGreaterThan(1);
    expect(concepts.page > lastNote.page || concepts.y > lastNote.y + 8).toBe(true);
    for (let i = 0; i < 120; i += 1) {
      const prefix = `Nota de prueba ${String(i).padStart(3, "0")}`;
      expect(textPosition(pdf, prefix).y).toBeLessThan(281);
      expect(pdf.output().split(`(${prefix})`).length - 1).toBe(1);
    }
  });

  it.skipIf(!process.env.PDF_LAYOUT_OUTPUT_DIR)("renders four synthetic examples for visual review", () => {
    const outputDir = process.env.PDF_LAYOUT_OUTPUT_DIR!;
    mkdirSync(outputDir, { recursive: true });
    const imageBytes = process.env.PDF_LAYOUT_LOGO_PATH ? readFileSync(process.env.PDF_LAYOUT_LOGO_PATH) : null;
    const previewLogo = imageBytes ? { logo: {
      dataUrl: `data:image/png;base64,${imageBytes.toString("base64")}`,
      width: imageBytes.readUInt32BE(16), height: imageBytes.readUInt32BE(20),
    } } : logo;
    for (const example of examples) {
      const pdf = buildDocumentPdf(example.doc, profile, previewLogo);
      writeFileSync(join(outputDir, `${example.filename}.pdf`), Buffer.from(pdf.output("arraybuffer")));
    }
  });
});
