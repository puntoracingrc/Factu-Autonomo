import { describe, expect, it } from "vitest";
import type { ExpenseInboxItem } from "@/lib/expense-inbox";
import { expenseInboxItemVatView } from "./expense-vat-ui";

function inboxItem(amount = 200): ExpenseInboxItem {
  return {
    id: "inbox",
    receivedAt: "2026-07-11T00:00:00.000Z",
    attachmentFilename: "factura.pdf",
    attachmentContentType: "application/pdf",
    attachmentSize: 1,
    attachmentHash: "hash",
    status: "pending",
    createdAt: "2026-07-11T00:00:00.000Z",
    scanPayload: {
      supplier: { name: "Proveedor" },
      expense: {
        date: "2026-07-11",
        description: "Compra mixta",
        amount,
        ivaPercent: 21,
        category: "Material",
        paymentMethod: "Transferencia",
        purchaseLines: [
          { description: "General", quantity: 1, unitPrice: 100, ivaPercent: 21 },
          { description: "Reducido", quantity: 1, unitPrice: 100, ivaPercent: 10 },
        ],
      },
      confidence: 0.99,
      warnings: [],
    },
  };
}

describe("expenseInboxItemVatView", () => {
  it("muestra el total central y origen de líneas conciliadas", () => {
    const view = expenseInboxItemVatView(inboxItem());

    expect(view?.resolution).toMatchObject({
      source: "lines",
      iva: 31,
      total: 231,
    });
    expect(view?.amountLabel).toContain("231");
    expect(view?.sourceLabel).toBe("IVA por líneas · 21% + 10%");
  });

  it("marca como pendiente un mixto descuadrado", () => {
    const view = expenseInboxItemVatView(inboxItem(250));

    expect(view?.resolution.blocked).toBe(true);
    expect(view?.amountLabel).toContain("total por revisar");
    expect(view?.sourceLabel).toBe("IVA por revisar");
  });

  it("respeta el perfil exento aunque el escaneo conserve tipos", () => {
    const view = expenseInboxItemVatView(inboxItem(), true);

    expect(view?.resolution).toMatchObject({
      source: "header",
      iva: 0,
      total: 200,
    });
    expect(view?.amountLabel).toContain("200");
    expect(view?.sourceLabel).toBe("Perfil exento · IVA 0%");
  });
});
