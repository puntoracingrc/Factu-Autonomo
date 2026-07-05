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

  it("el listado de gastos conserva proveedor, categoria, pago y total", () => {
    const listPage = source("../app/gastos/page.tsx");

    expect(listPage).toContain("expense.supplierName");
    expect(listPage).toContain("expense.category");
    expect(listPage).toContain("expense.paymentMethod");
    expect(listPage).toContain("formatMoney(expenseAmount");
  });

  it("muestra las lineas de compra en el listado de gastos", () => {
    const listPage = source("../app/gastos/page.tsx");

    expect(listPage).toContain("ExpensePurchaseLinesPreview");
    expect(listPage).toContain("Líneas detectadas");
    expect(listPage).toContain("purchaseProductCatalogKeys(data.products");
    expect(listPage).toContain("purchaseLineHasCatalogProduct(line");
    expect(listPage).toContain("artículo creado");
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
