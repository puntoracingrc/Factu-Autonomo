import { describe, expect, it } from "vitest";
import type { jsPDF } from "jspdf";
import { buildAnnualSummaryPdf } from "./export-annual-pdf";
import { DEFAULT_PROFILE, type Document, type Expense } from "../types";
import { issueDocument, markDocumentPaid } from "../document-integrity";

const profile = {
  ...DEFAULT_PROFILE,
  name: "Autónomo Test",
  nif: "11111111H",
};

const draftDoc: Document = {
  id: "d1",
  type: "factura",
  number: "F-2026-0001",
  date: "2026-05-10",
  client: { name: "Cliente Test" },
  items: [
    {
      id: "l1",
      description: "Servicio",
      quantity: 1,
      unitPrice: 100,
      ivaPercent: 21,
    },
  ],
  status: "borrador",
  createdAt: "2026-05-10",
  updatedAt: "2026-05-10",
};

const doc = markDocumentPaid(
  issueDocument(draftDoc, profile, "2026-05-10T10:00:00.000Z"),
  "2026-05-10T11:00:00.000Z",
);

const expense: Expense = {
  id: "e1",
  date: "2026-04-02",
  supplierName: "Proveedor",
  description: "Material",
  amount: 50,
  ivaPercent: 21,
  category: "Material",
  paymentMethod: "Tarjeta",
  createdAt: "2026-04-02",
};

function pdfCommands(pdf: jsPDF): string {
  const pages = (
    pdf.internal as unknown as { pages: Array<string[] | null> }
  ).pages;
  return pages.flatMap((page) => page ?? []).join("\n");
}

describe("export annual pdf", () => {
  it("genera un PDF con al menos una página", () => {
    const pdf = buildAnnualSummaryPdf([doc], [expense], profile, 2026);
    expect(pdf.getNumberOfPages()).toBeGreaterThanOrEqual(1);
  });

  it("proyecta el snapshot histórico antes de seleccionar periodo e importes", () => {
    const drifted: Document = {
      ...doc,
      number: "F-LIVE-ALTERADA",
      date: "2027-01-01",
      client: { name: "Cliente alterado" },
      items: [{ ...doc.items[0], unitPrice: 999 }],
    };

    const commands = pdfCommands(
      buildAnnualSummaryPdf([drifted], [], profile, 2026),
    );

    expect(commands).toContain("F-2026-0001");
    expect(commands).toContain("Cliente Test");
    expect(commands).toContain("100,00");
    expect(commands).not.toContain("F-LIVE-ALTERADA");
    expect(commands).not.toContain("Cliente alterado");
    expect(commands).not.toContain("999,00");
  });

  it("excluye evidencia bloqueada y muestra la exclusión en el propio PDF", () => {
    const blocked: Document = {
      ...doc,
      snapshotIntegrity: {
        status: "blocked",
        issues: ["document_hash_mismatch"],
      },
    };

    const commands = pdfCommands(
      buildAnnualSummaryPdf([blocked], [], profile, 2026),
    );

    expect(commands).toContain("ALERTA DE INTEGRIDAD FISCAL");
    expect(commands).toContain("document_hash_mismatch");
    expect(commands).toContain("d1");
    expect(commands).not.toContain("Ventas \\(facturas y recibos\\)");
  });
});
