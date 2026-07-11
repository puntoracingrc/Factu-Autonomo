import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  buildBackupImportPreview,
  buildBackupRestoreDraft,
  createBackupPayload,
  getBackupRestoreBlocker,
} from "./backup";
import { documentTotals } from "./calculations";
import { issueDocument } from "./document-integrity";
import { buildDocumentPdfBlob } from "./pdf";
import { buildProductPeriodSummary } from "./product-period-summary";
import { buildInvoiceDraftFromQuote } from "./quote-to-invoice";
import { hasClientEmail, hasClientPhone } from "./share";
import { DEFAULT_PROFILE, type AppData, type BusinessProfile, type Document } from "./types";
import { withVerifactuOnDocument } from "./verifactu/store";

const NOW = "2026-06-28T10:00:00.000Z";

const profile: BusinessProfile = {
  ...DEFAULT_PROFILE,
  name: "Taller Beta",
  nif: "12345678Z",
  address: "Calle Prueba 1",
  city: "Madrid",
  postalCode: "28001",
  email: "beta@example.com",
  phone: "600000000",
  verifactu: { enabled: true, environment: "test", optInVersion: 1 },
};

const quote: Document = {
  id: "quote-final-smoke",
  type: "presupuesto",
  number: "P-2026-0001",
  date: "2026-06-28",
  customerId: "customer-final-smoke",
  client: {
    firstName: "Ana",
    lastName: "Garcia",
    name: "Ana Garcia",
    nif: "87654321X",
    email: "ana@example.com",
    phone: "612345678",
  },
  items: [
    {
      id: "quote-line-final-smoke",
      description: "Servicio beta",
      quantity: 1,
      unit: "ud",
      unitPrice: 100,
      ivaPercent: 21,
    },
  ],
  paymentTerms: "Transferencia",
  status: "aceptado",
  documentLifecycle: "issued",
  acceptanceStatus: "accepted",
  paymentStatus: "not_applicable",
  createdAt: NOW,
  updatedAt: NOW,
};

function invoiceFromQuote(): Document {
  const draft = buildInvoiceDraftFromQuote(quote, {
    date: "2026-06-28",
    lineIdFactory: () => "invoice-line-final-smoke",
  });

  return {
    ...draft,
    id: "invoice-final-smoke",
    number: "F-2026-0001",
    createdAt: NOW,
    updatedAt: NOW,
  };
}

function appData(invoice: Document): AppData {
  return {
    profile,
    customers: [
      {
        id: "customer-final-smoke",
        firstName: "Ana",
        lastName: "Garcia",
        name: "Ana Garcia",
        nif: "87654321X",
        email: "ana@example.com",
        phone: "612345678",
        createdAt: NOW,
        updatedAt: NOW,
      },
    ],
    suppliers: [
      {
        id: "supplier-final-smoke",
        name: "Proveedor Beta",
        createdAt: NOW,
      },
    ],
    documents: [quote, invoice],
    expenses: [
      {
        id: "expense-final-smoke",
        date: "2026-06-28",
        supplierId: "supplier-final-smoke",
        supplierName: "Proveedor Beta",
        description: "Material beta",
        amount: 50,
        ivaPercent: 21,
        category: "Material",
        paymentMethod: "Tarjeta",
        createdAt: NOW,
      },
    ],
    recurringExpenses: [],
    userReminders: [],
    products: [],
    counters: {
      factura: 1,
      factura_rectificativa: 0,
      presupuesto: 1,
      recibo: 0,
    },
  };
}

describe("product MVP final smoke", () => {
  it("mantiene flujo documento, PDF/QR y contacto del cliente", async () => {
    const invoice = invoiceFromQuote();
    const issued = issueDocument(invoice, profile, NOW);
    const registered = await withVerifactuOnDocument({
      doc: issued,
      profile,
      chain: null,
    });
    const pdf = await buildDocumentPdfBlob(registered.doc, profile);

    expect(documentTotals(invoice).total).toBe(documentTotals(quote).total);
    expect(hasClientEmail(registered.doc)).toBe(true);
    expect(hasClientPhone(registered.doc)).toBe(true);
    expect(registered.doc.verifactu).toBeUndefined();
    expect(registered.chain).toBeNull();
    expect(pdf.type).toBe("application/pdf");
    expect(pdf.size).toBeGreaterThan(1000);
  });

  it("mantiene dashboard sin NaN y backup/restore con gastos y proveedores", () => {
    const issued = issueDocument(invoiceFromQuote(), profile, NOW);
    const data = appData(issued);
    const summary = buildProductPeriodSummary(data, {
      kind: "month",
      year: 2026,
      month: 6,
      quarter: 2,
    });
    const payload = createBackupPayload(data, NOW);
    const rawText = JSON.stringify(payload);
    const candidate = {
      fileName: "factu-autonomo-backup-2026-06-28.json",
      mimeType: "application/json",
      byteLength: rawText.length,
      rawText,
    };
    const preview = buildBackupImportPreview(candidate);
    const draft = buildBackupRestoreDraft(candidate);

    expect(Number.isNaN(summary.totalBilledIssued)).toBe(false);
    expect(Number.isNaN(summary.totalExpenses)).toBe(false);
    expect(summary.totalBilledIssued).toBe(121);
    expect(summary.totalExpenses).toBe(60.5);
    expect(preview.ok && preview.preview.counts.expenses).toBe(1);
    expect(preview.ok && preview.preview.counts.suppliers).toBe(1);
    expect(draft.ok && draft.draft.data.expenses[0]?.id).toBe(
      "expense-final-smoke",
    );
    expect(
      getBackupRestoreBlocker({
        draftReady: true,
        currentBackupReady: true,
        confirmedReplacement: true,
        confirmedCurrentBackup: true,
      }),
    ).toBeNull();
  });

  it("mantiene acciones principales y copy prudente en superficies MVP", () => {
    const sources = [
      "../app/page.tsx",
      "../components/dashboard/HomeBusinessSummary.tsx",
      "../components/documents/DocumentList.tsx",
      "../components/documents/DocumentPdfShareActions.tsx",
      "../components/documents/PaymentReminderButton.tsx",
      "../components/layout/AppShell.tsx",
      "../components/settings/DataOwnershipCard.tsx",
    ]
      .map((path) => readFileSync(new URL(path, import.meta.url), "utf8"))
      .join("\n");

    expect(sources).toContain("Nueva factura");
    expect(sources).toContain("Nuevo presupuesto");
    expect(sources).toContain("Gastos");
    expect(sources).toContain("Exportar copia");
    expect(sources).toContain("Resumen del negocio");
    expect(sources).toContain("Periodo:");
    expect(sources).toContain("Abrir PDF");
    expect(sources).toContain("Imprimir PDF");
    expect(sources).toContain("PDF");
    expect(sources).toContain("WhatsApp");
    expect(sources).toContain("Hazte Pro");
    expect(sources).toContain("Miembro Pro");
    expect(sources).toContain("Prueba Pro");
    expect(sources).not.toContain("window.print()");
    expect(sources).not.toMatch(
      /IVA a pagar|Modelo 303|Resultado fiscal|cumplimiento garantizado|QR oficial/i,
    );
  });
});
