import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const source = readFileSync(new URL("./page.tsx", import.meta.url), "utf8");
const scopeSource = readFileSync(
  new URL("../../lib/expense-export-scope.ts", import.meta.url),
  "utf8",
);

describe("expense original export UI", () => {
  it("exports the active month or quarter and preserves supplier filters", () => {
    expect(source).toContain("downloadExpenseOriginalExportArchive");
    expect(source).toContain("expensesForExport");
    expect(source).toContain("currentSupplierFilterLabel");
    expect(source).toContain("Exportar gastos y originales");
    expect(source).toContain("Exportar y enviar al gestor");
    expect(source).toContain('periodKind === "year"');
    expect(source).toContain("un máximo de tres meses");
  });

  it("defaults advisor exports to deductible business expenses", () => {
    expect(source).toContain('useState<ExpenseExportScope>("deductible")');
    expect(source).toContain("EXPENSE_EXPORT_SCOPE_OPTIONS");
    expect(scopeSource).toContain("Solo empresa y deducibles");
    expect(scopeSource).toContain("Todos los gastos de empresa");
    expect(scopeSource).toContain("Todos los gastos");
  });

  it("reuses the saved Gmail, device mail or share preference", () => {
    expect(source).toContain("SendMethodChooserModal");
    expect(source).toContain("DOCUMENT_EMAIL_CONCRETE_METHOD_OPTIONS");
    expect(source).toContain('appPreferences.documentEmailMethod === "ask"');
    expect(source).toContain("saveExpenseEmailMethod");
    expect(source).toContain("reserveExternalShareWindow");
    expect(source).toContain("email.gmailComposeUrl");
    expect(source).toContain("email.mailtoUrl");
    expect(source).toContain("shareFileNatively");
    expect(source).toContain("Adjunta el ZIP antes de enviarlo");
  });
});
