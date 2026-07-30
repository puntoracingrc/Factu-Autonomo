import { readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";

function source(path: string) {
  return readFileSync(new URL(path, import.meta.url), "utf8");
}

describe("central expense and profile UI wiring", () => {
  it("routes manual expense writes through the central hook", () => {
    const page = source("../../app/gastos/nuevo/page.tsx");

    expect(page).toContain("useCentralExpenseMutations");
    expect(page).toContain("await createExpense(payload)");
    expect(page).toContain("await updateCentralExpense({");
    expect(page).toContain("updateExpenseFallback({");
  });

  it("routes list deletion through the central hook", () => {
    const page = source("../../app/gastos/page.tsx");

    expect(page).toContain("useCentralExpenseMutations");
    expect(page).toContain("await deleteExpense(expense.id)");
  });

  it("routes scanned and fixed bundles through the atomic central canary", () => {
    const page = source("../../app/gastos/nuevo/page.tsx");
    const hook = source("../../hooks/useCentralExpenseMutations.ts");
    const store = source("../../context/AppStore.tsx");

    expect(hook).toContain("saveCentralExpenseBundleWithCanary");
    expect(hook).toContain("prepareCentralScannedExpenseBundle");
    expect(hook).toContain("prepareCentralFixedExpenseBundle");
    expect(page).toContain("await saveScannedExpenseDurably(durableExpense");
    expect(page).toContain("await saveFixedExpenseWithRecurringTemplate(");
    expect(page).toContain("centralResult.localFailure");
    expect(store).toContain("now: options.now ?? new Date().toISOString()");
  });

  it("waits for the central profile result before showing success", () => {
    const page = source("../../app/configuracion/page.tsx");

    expect(page).toContain("useCentralProfileMutation");
    expect(page).toContain("const result = await updateProfile(");
    expect(page).toContain("if (!result.ok)");
    expect(page).toContain("setSaved(true)");
  });

  it("routes remembered delivery methods through central profile writes", () => {
    const expenses = source("../../app/gastos/page.tsx");
    const documents = source("../../components/documents/DocumentList.tsx");
    const share = source("../../components/documents/DocumentShareActions.tsx");

    for (const component of [expenses, documents, share]) {
      expect(component).toContain("useCentralProfileMutation");
      expect(component).toContain("updateProfile((profile) => ({");
      expect(component).toContain("const result = await");
      expect(component).toContain("if (!result.ok)");
    }
    expect(expenses).not.toContain(
      "const { data, updateProfile } = useAppStore()",
    );
    expect(documents).not.toContain("repairDocumentCustomer, updateProfile");
    expect(share).not.toContain("markDocumentSent, updateProfile");

    expect(
      expenses.indexOf('await handleExpenseArchiveExport("advisor", method)'),
    ).toBeLessThan(expenses.indexOf("await saveExpenseEmailMethod(method)"));
    expect(
      documents.indexOf("await handleExportInvoicePdfs(target, method)"),
    ).toBeLessThan(documents.indexOf("await saveInvoiceEmailMethod(method)"));
    expect(share.indexOf("await runEmail(method)")).toBeLessThan(
      share.indexOf("await saveEmailMethod(method)"),
    );
    expect(share.indexOf("await runWhatsApp(method)")).toBeLessThan(
      share.indexOf("await saveWhatsAppMethod(method)"),
    );
  });

  it("routes document form preferences through latest-profile central writes", () => {
    const documentForm = source("../../components/forms/DocumentForm.tsx");
    const rectificationForm = source(
      "../../components/forms/RectificativaForm.tsx",
    );
    const fiscalSummary = source(
      "../../components/dashboard/FiscalSummaryPanel.tsx",
    );

    for (const component of [documentForm, rectificationForm, fiscalSummary]) {
      expect(component).toContain("useCentralProfileMutation");
      expect(component).toContain("updateProfile((profile) => ({");
      expect(component).toContain("if (!result.ok)");
    }
    expect(documentForm).toContain("savePaymentMethodPreference");
    expect(documentForm).toContain("savePhrasePreference");
    expect(rectificationForm).toContain("savePaymentMethodPreference");
    expect(rectificationForm).toContain("savePhrasePreference");
    expect(
      fiscalSummary.indexOf("await handleExportInvoicePdfs(method)"),
    ).toBeLessThan(
      fiscalSummary.indexOf("await saveAdvisorEmailMethod(method)"),
    );
  });
});
