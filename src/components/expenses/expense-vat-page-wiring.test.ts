import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

function source(path: string): string {
  return readFileSync(new URL(path, import.meta.url), "utf8");
}

function functionBlock(
  contents: string,
  startMarker: string,
  endMarker: string,
): string {
  const start = contents.indexOf(startMarker);
  const end = contents.indexOf(endMarker, start + startMarker.length);
  expect(start).toBeGreaterThanOrEqual(0);
  expect(end).toBeGreaterThan(start);
  return contents.slice(start, end);
}

describe("expense VAT page fail-closed wiring", () => {
  it("valida IVA antes de resolver o crear proveedor en escaneo y formulario", () => {
    const page = source("../../app/gastos/nuevo/page.tsx");
    const scanSave = functionBlock(
      page,
      "function saveScanPayload(",
      "async function handleSaveReadyScans",
    );
    const manualSave = functionBlock(
      page,
      "async function handleSubmit()",
      "\n  return (",
    );

    for (const block of [scanSave, manualSave]) {
      const preparation = block.indexOf("prepareExpenseVatForSave(");
      const blockedReturn = block.indexOf("if (!vatPreparation.ok)");
      const supplierResolution = block.indexOf("ensureSupplierForExpense(");
      const supplierCreation = block.indexOf("addSupplier(");

      expect(preparation).toBeGreaterThanOrEqual(0);
      expect(blockedReturn).toBeGreaterThan(preparation);
      expect(supplierResolution).toBeGreaterThan(blockedReturn);
      expect(supplierCreation).toBeGreaterThan(supplierResolution);
    }
  });

  it("deshabilita el CSV si el filtro contiene IVA pendiente", () => {
    const page = source("../../app/gastos/page.tsx");

    expect(page).toContain("const blockedVatExpenseCount = countBlockedExpenseVat(");
    expect(page).toContain("if (blockedVatExpenseCount > 0) return;");
    expect(page).toContain("disabled={blockedVatExpenseCount > 0}");
    expect(page).toContain("con evidencia fiscal");
  });

  it("no reconcilia un fijo no deducible contra la suma de bases", () => {
    const page = source("../../app/gastos/nuevo/page.tsx");

    expect(page).toContain("canReconcileExpenseAmountWithLineBase(");
    expect(page).toContain("el importe es el coste");
    expect(page).toContain("no se reemplaza por la suma de bases");
  });
});
