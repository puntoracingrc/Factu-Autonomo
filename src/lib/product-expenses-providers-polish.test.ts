import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

function source(path: string): string {
  return readFileSync(new URL(path, import.meta.url), "utf8");
}

describe("product expenses/providers polish wiring", () => {
  it("mantiene creacion y edicion visibles para proveedores", () => {
    const page = source("../app/proveedores/page.tsx");
    const store = source("../context/AppStore.tsx");

    expect(page).toContain("Nuevo proveedor");
    expect(page).toContain("Editar proveedor");
    expect(page).toContain("Guardar cambios");
    expect(store).toContain("expense.supplierId === supplier.id");
    expect(store).toContain("supplierName: supplier.name");
  });

  it("conecta edicion de gastos desde el listado y el formulario", () => {
    const listPage = source("../app/gastos/page.tsx");
    const formPage = source("../app/gastos/nuevo/page.tsx");

    expect(listPage).toContain("expenseEditHref(expense");
    expect(listPage).toContain("Editar");
    expect(formPage).toContain("updateExpense");
    expect(formPage).toContain("Editar gasto");
    expect(formPage).toContain("Sin proveedor");
  });

  it("envia los gastos fijos recurrentes al editor de gastos fijos", async () => {
    const { expenseEditHref } = await import("./expense-links");
    const fixedExpense = {
      id: "expense-1",
      recurringExpenseId: "recurring-1",
    };
    const regularExpense = {
      id: "expense-2",
    };

    expect(
      expenseEditHref(
        fixedExpense as Parameters<typeof expenseEditHref>[0],
        new Set(["recurring-1"]),
      ),
    ).toBe("/gastos/fijos?editar=recurring-1");
    expect(
      expenseEditHref(
        fixedExpense as Parameters<typeof expenseEditHref>[0],
        new Set(),
      ),
    ).toBe("/gastos/nuevo?editar=expense-1");
    expect(
      expenseEditHref(regularExpense as Parameters<typeof expenseEditHref>[0]),
    ).toBe("/gastos/nuevo?editar=expense-2");
  });

  it("mantiene el escaneo conectado al alta/reutilizacion de proveedores", () => {
    const formPage = source("../app/gastos/nuevo/page.tsx");

    expect(formPage).toContain("function applyScanResult");
    expect(formPage).toContain("findBestSupplierMatch(data.suppliers");
    expect(formPage).toContain("setSelectedSupplierId(match.supplier.id)");
    expect(formPage).toContain("setSaveSupplier(true)");
    expect(formPage).toContain("ensureSupplierForExpense(data.suppliers");
    expect(formPage).toContain("const created = addSupplier(resolved.create)");
  });

  it("notifica sin bloquear si un escaneo trae articulos nuevos para Productos", () => {
    const formPage = source("../app/gastos/nuevo/page.tsx");

    expect(formPage).toContain("function scanReviewNotice");
    expect(formPage).toContain("setScanReviewCatalogProductSelection");
    expect(formPage).toContain("newCatalogProductReasonForScanPayload");
    expect(formPage).toContain("artículo");
    expect(formPage).toContain("nuevo");
    expect(formPage).toContain("artículos grises");
    expect(formPage).toContain("Verde: ya cubierto por Productos");
    expect(formPage).toContain("Guardar esta");
    expect(formPage).toContain("Misma tanda");
    expect(formPage).toContain("se unirán al mismo producto");
    expect(formPage).toContain("Contraer ficha y volver al listado");
    expect(formPage).toContain("purchaseLineHasCatalogProduct(line, productKeys)");
    expect(formPage).toContain("text-sky-700");
    expect(formPage).not.toContain("Revisa la factura antes de guardar");
  });

  it("muestra progreso mientras se escanea un lote de facturas", () => {
    const formPage = source("../app/gastos/nuevo/page.tsx");
    const scanCard = source("../components/expenses/ExpenseScanCard.tsx");

    expect(scanCard).toContain("onScanProgress");
    expect(scanCard).toContain("current: index + 1");
    expect(formPage).toContain("setScanProgress");
    expect(formPage).toContain("Escaneando siguiente factura");
    expect(formPage).toContain("scanProgress.current");
    expect(formPage).toContain("scanProgress.total");
    expect(formPage).toContain("scan-progress-thinking");
    expect(formPage).toContain("scan-progress-dot");
  });

  it("marca como listo el escaneo que completa un resumen de proveedor", () => {
    const formPage = source("../app/gastos/nuevo/page.tsx");

    expect(formPage).toContain(
      "providerSummaryUpgradeTargetForScanPayload(review.payload)",
    );
    expect(formPage).toContain("? \"ready\"");
    expect(formPage).toContain(
      "Al guardar, se completará con la factura original y no se duplicará",
    );
  });

  it("muestra los numeros de facturas pendientes de original", () => {
    const listPage = source("../app/gastos/page.tsx");

    expect(listPage).toContain("pendingOriginalInvoiceNumbers");
    expect(listPage).toContain("pendingOriginalInvoicePreview");
    expect(listPage).toContain("Faltan:");
    expect(listPage).toContain("purchaseDocument?.invoiceNumber?.trim()");
  });

  it("el listado de gastos conserva proveedor, categoria, pago y total", () => {
    const listPage = source("../app/gastos/page.tsx");

    expect(listPage).toContain("expense.supplierName");
    expect(listPage).toContain("expense.category");
    expect(listPage).toContain("expense.paymentMethod");
    expect(listPage).toContain("formatMoney(expenseAmount");
  });

  it("muestra las lineas de compra en el listado de gastos", () => {
    const listPage = source("../app/gastos/page.tsx");
    const linesPreview = source(
      "../components/expenses/ExpensePurchaseLinesPreview.tsx",
    );

    expect(listPage).toContain("ExpensePurchaseLinesPreview");
    expect(listPage).toContain("purchaseProductCatalogKeys(data.products");
    expect(linesPreview).toContain("Líneas detectadas");
    expect(linesPreview).toContain("purchaseLineHasCatalogProduct(line");
    expect(linesPreview).toContain("artículo creado");
    expect(linesPreview).toContain("formatMoney(line.base)");
    expect(listPage).not.toContain("EXPENSE_LINE_PREVIEW_LIMIT");
  });

  it("evita claims prohibidos en copy visible de gastos y proveedores", () => {
    const copy = [
      source("../app/gastos/page.tsx"),
      source("../app/gastos/nuevo/page.tsx"),
      source("../app/proveedores/page.tsx"),
    ].join("\n");

    expect(copy).not.toMatch(
      /cumplimiento|declaraci[oó]n oficial|presentaci[oó]n de impuestos|AEAT/i,
    );
  });
});
