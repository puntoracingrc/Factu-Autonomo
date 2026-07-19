import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

function source(path: string): string {
  return readFileSync(new URL(path, import.meta.url), "utf8");
}

describe("product expenses/providers polish wiring", () => {
  it("mantiene creacion y edicion visibles para proveedores", () => {
    const page = source("../app/proveedores/page.tsx");
    const newPage = source("../app/proveedores/nuevo/page.tsx");
    const store = source("../context/AppStore.tsx");

    expect(page).toContain("Nuevo proveedor");
    expect(page).toContain("Editar proveedor");
    expect(page).toContain("Guardar cambios");
    expect(page).toContain('value={form.email}');
    expect(newPage).toContain('value={form.email}');
    expect(page).toContain("validateSupplierContact(form)");
    expect(newPage).toContain("validateSupplierContact(form)");
    expect(page).toContain("emailInputRef.current?.focus()");
    expect(newPage).toContain("emailInputRef.current?.focus()");
    expect(store).toContain("expense.supplierId === supplier.id");
    expect(store).toContain("supplierName: supplier.name");
  });

  it("bloquea importes de producto inválidos y conserva el foco del campo", () => {
    const newProductPage = source("../app/productos/nuevo/page.tsx");

    expect(newProductPage).toContain("validateProductNumericInputs({");
    expect(newProductPage).toContain("setFieldErrors(numericValidation.errors)");
    expect(newProductPage).toContain(
      "numericInputRefs.current[firstInvalidField]?.focus()",
    );
    expect(newProductPage).toContain(
      "aria-invalid={Boolean(fieldErrors.salePrice)}",
    );
  });

  it("renombra familia y margen mediante una única transición de datos", () => {
    const productsPage = source("../app/productos/page.tsx");
    const store = source("../context/AppStore.tsx");

    expect(productsPage).toContain("renameProductFamilyInStore(");
    expect(productsPage).toContain("La regla de margen se ha conservado");
    expect(store).toContain("renameProductFamilyInAppData(");
    expect(store).toContain("if (result.ok) setAppData(result.data)");
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
    const appStore = source("../context/AppStore.tsx");

    expect(formPage).toContain("function applyScanResult");
    expect(formPage).toContain("findBestSupplierMatch(data.suppliers");
    expect(formPage).toContain("setSelectedSupplierId(match.supplier.id)");
    expect(formPage).toContain("setSaveSupplier(true)");
    expect(formPage).toContain("const scannedSupplierNif =");
    expect(formPage).toContain(
      "payload.expense.purchaseDocument?.supplierNif ?? payload.supplier.nif",
    );
    expect(formPage).toContain(
      "nif: purchaseDocument.supplierNif ?? supplierNif",
    );
    expect(formPage).toContain(
      "ensureSupplierForExpense(durableExpected.suppliers",
    );
    expect(formPage).toContain("saveScannedExpenseDurably(durableExpense");
    expect(formPage).toContain('title="Tipo de gasto"');
    expect(formPage).toContain(
      'hint="La app lo usa para separar compras, facturas recibidas, tickets y fijos. Puedes corregirlo antes de guardar."',
    );
    expect(formPage).toContain("setBusinessKind(option.value)");
    expect(formPage).toContain('businessKind === "fixed"');
    expect(formPage).toContain('businessKind !== "fixed"');
    expect(formPage).toContain("supplierId: resolved.supplierId");
    expect(formPage).toContain("const created = addSupplier(resolved.create)");
    expect(appStore).toContain("upsertSupplierForExpense(prev.suppliers, input");
    expect(appStore).toContain("buildScannedExpenseDurableTransition");
    expect(appStore).toContain(
      "commitLatestDurableAppData(options.expected, (previous) =>",
    );
    expect(appStore).toContain("suppliers === prev.suppliers");
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
    expect(formPage).toContain("Abono: no actualiza precio");
    expect(formPage).toContain("No actualizar producto desde este abono");
    expect(formPage).toContain("Contraer ficha y volver al listado");
    expect(formPage).toContain("purchaseLineHasCatalogProduct(line, productKeys)");
    expect(formPage).toContain("text-sky-700");
    expect(formPage).not.toContain("Revisa la factura antes de guardar");
  });

  it("aplica el guard de abonos en alta manual, escaneo, lote y buzón", () => {
    const formPage = source("../app/gastos/nuevo/page.tsx");
    const expenses = source("./expenses.ts");
    const purchaseProducts = source("./purchase-products.ts");

    expect(expenses).toContain("expenseCanFeedProductCatalog(expense)");
    expect(purchaseProducts).toContain(
      "expensePurchaseLineCanFeedProductCatalog(expense, line)",
    );
    expect(formPage).toContain("currentExpenseAmount: payload.expense.amount");
    expect(formPage).toContain("currentExpenseAmount: currentAmount");
    expect(
      formPage.match(/expensePurchaseLineIsEligibleForProductCatalog/g),
    ).toHaveLength(8);
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
    expect(listPage).toContain("formatMoney(signedExpenseTotal)");
    expect(listPage).toContain("isExpenseFiscalDeductible(expense)");
    expect(listPage).toContain("expenseFiscalTreatmentLabel(expense)");
  });

  it("identifica abonos y saldos a favor en gastos, proveedores y panel", () => {
    const listPage = source("../app/gastos/page.tsx");
    const suppliersPage = source("../app/proveedores/page.tsx");
    const homeSummary = source(
      "../components/dashboard/HomeBusinessSummary.tsx",
    );

    for (const surface of [listPage, suppliersPage, homeSummary]) {
      expect(surface).toContain("Abono · saldo a favor");
    }
    expect(listPage).toContain('"Saldo a favor" : "Gasto neto"');
    expect(listPage).toContain("El donut solo representa saldos netos positivos");
    expect(listPage).toContain('slice.key === "__otros__"');
    expect(listPage).toContain('`${slice.label} (compras)`');
    expect(listPage).toContain("fixedOptionsByKey");
    expect(listPage).toContain("periodExpenses");
    expect(listPage).toContain(".filter(isFixedExpense)");
    expect(suppliersPage).toContain("Compras netas:");
    expect(suppliersPage).toContain("Math.abs(purchased)");
    expect(homeSummary).toContain("safeSignedDisplayAmount");
    expect(homeSummary).toContain("Math.abs(summary.totalExpenses)");
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
    expect(linesPreview).toContain("formatMoney(line.amounts.base)");
    expect(linesPreview).toContain("formatMoney(line.amounts.iva)");
    expect(linesPreview).toContain("formatMoney(line.amounts.total)");
    expect(linesPreview).toContain("line.ivaOrigin");
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
