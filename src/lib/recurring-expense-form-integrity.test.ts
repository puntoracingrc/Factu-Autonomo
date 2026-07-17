import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

function source(relativePath: string): string {
  return readFileSync(new URL(relativePath, import.meta.url), "utf8");
}

describe("recurring expense form integrity", () => {
  it("normaliza la duración por ocurrencias al cargar y guardar desde Gastos", () => {
    const expenseForm = source("../app/gastos/nuevo/page.tsx");

    expect(expenseForm).toMatch(
      /normalizeRecurringOccurrenceCount\(\s*recurringTemplate\.duration\.count,?\s*\)\s*\?\?\s*1/,
    );
    expect(expenseForm).toMatch(
      /normalizeRecurringOccurrenceCount\(Number\(fixedOccurrenceCount\)\)\s*\?\?\s*1/,
    );
    expect(expenseForm).not.toContain(
      "count: Math.max(1, Number(fixedOccurrenceCount) || 1)",
    );
  });

  it("usa la vigencia compartida en el resumen y estado de Gastos fijos", () => {
    const fixedExpenseForm = source("../app/gastos/fijos/page.tsx");

    expect(fixedExpenseForm).toMatch(
      /isRecurringExpenseApplicableOn\(item, today\)/,
    );
    expect(fixedExpenseForm).toMatch(/recurringExpenseStatusOn\(item, today\)/);
  });

  it("permite guardar todas las reglas anuales que ofrece el formulario", () => {
    const fixedExpenseForm = source("../app/gastos/fijos/page.tsx");
    const newExpenseForm = source("../app/gastos/nuevo/page.tsx");

    for (const formSource of [fixedExpenseForm, newExpenseForm]) {
      expect(formSource).not.toMatch(
        /frequency === "annual"\s*&&\s*[^\n]+DueKind === "end_of_month"/,
      );
      expect(formSource).toContain("Día 1 del mes de vencimiento");
      expect(formSource).toContain("Día 15 del mes de vencimiento");
      expect(formSource).toContain("Último día del mes de vencimiento");
      expect(formSource).toContain("Día concreto del mes de vencimiento");
    }
    expect(newExpenseForm).not.toMatch(
      /fixedFrequency === "annual"\s*&&\s*fixedDueKind === "end_of_month"/,
    );
    expect(newExpenseForm).not.toMatch(
      /nextFrequency === "annual"[\s\S]{0,180}setFixedDueKind\("day_of_month"\)/,
    );
    expect(newExpenseForm).toContain('fixedFrequency === "annual" && (');
    expect(newExpenseForm).toContain('fixedDueKind === "day_of_month" && (');
    expect(newExpenseForm).not.toContain('"Mes y día"');
    expect(fixedExpenseForm).toContain(
      "dueMonth: String(recurringAnnualDueMonth(item))",
    );
    expect(newExpenseForm).toContain(
      "setFixedDueMonth(String(recurringAnnualDueMonth(recurringTemplate)))",
    );
  });

  it("previsualiza y bloquea cambios sobre ocurrencias ya materializadas", () => {
    const fixedExpenseForm = source("../app/gastos/fijos/page.tsx");
    const appStore = source("../context/AppStore.tsx");

    expect(fixedExpenseForm).toContain("previewRecurringExpenseChangeToData");
    expect(fixedExpenseForm).toContain('preview.status === "manual_review"');
    expect(fixedExpenseForm).toContain("Vista previa bloqueada");
    expect(fixedExpenseForm).toContain("ningún gasto creado se borra");
    expect(fixedExpenseForm).toContain("precondition: preview.precondition");
    expect(fixedExpenseForm).toContain("expected: data");
    expect(fixedExpenseForm).toContain('result.reason === "stale_preview"');
    expect(fixedExpenseForm).toContain("setRecurringExpenseEnabled");
    expect(fixedExpenseForm).not.toContain("updateRecurringExpense");
    expect(appStore).toContain("expectedPrecondition: approval.precondition");
    expect(appStore).toContain("commitDurableAppData(approval.expected");
    expect(appStore).toMatch(
      /setRecurringExpenseEnabled:\s*\(\s*id: string,\s*enabled: boolean,\s*expected: AppData/,
    );
    expect(appStore).not.toContain(
      "updateRecurringExpense: (item: RecurringExpense)",
    );
  });

  it("identifica como no desgravable cualquier estado fiscal no reconocido", () => {
    const fixedExpenseForm = source("../app/gastos/fijos/page.tsx");

    expect(fixedExpenseForm).toContain("isExpenseFiscalDeductible");
    expect(fixedExpenseForm).toContain("!isExpenseFiscalDeductible(item)");
    expect(fixedExpenseForm).not.toContain(
      'item.deductibility === "non_deductible"',
    );
  });

  it("publica memoria solo después de un save durable aplicado", () => {
    const appStore = source("../context/AppStore.tsx");
    const commitStart = appStore.indexOf("const commitDurableAppData");
    const appliedGate = appStore.indexOf(
      'if (result.status !== "applied") return result;',
      commitStart,
    );
    const publishRef = appStore.indexOf(
      "dataRef.current = result.data",
      commitStart,
    );
    const publishReact = appStore.indexOf("setData(result.data)", commitStart);

    expect(commitStart).toBeGreaterThan(-1);
    expect(appliedGate).toBeGreaterThan(commitStart);
    expect(publishRef).toBeGreaterThan(appliedGate);
    expect(publishReact).toBeGreaterThan(publishRef);
    expect(appStore).toContain("durablyPersistedDataRef.current === data");
    expect(appStore).toContain("durableStorageBaselineRef");
    expect(appStore).toContain(
      "storageBaseline: durableStorageBaselineRef.current",
    );
    expect(appStore).toContain("durableStorageBaselineAfterSave");
    expect(appStore).toContain(
      "saveData(candidate, { expected: storageExpected })",
    );
    expect(appStore).toContain("const persisted = loadData();");
    expect(appStore).toContain("syncRecurringExpenses(persisted)");
    expect(
      appStore.match(
        /durableStorageBaselineRef\.current\.status === "indeterminate"/g,
      )?.length,
    ).toBeGreaterThanOrEqual(4);
    expect(appStore).toContain(
      'if (baseline.status !== "known") return baseline;',
    );
    expect(appStore).toContain("durableBaselineContainsFixedExpenseBundle");
    expect(appStore).toContain("() => inspected.transition");
  });

  it("mantiene abierto Gastos fijos ante bloqueo o estado indeterminado", () => {
    const fixedExpenseForm = source("../app/gastos/fijos/page.tsx");
    const saveStart = fixedExpenseForm.indexOf("function handleSave()");
    const indeterminateGate = fixedExpenseForm.indexOf(
      'result.status === "indeterminate"',
      saveStart,
    );
    const blockedGate = fixedExpenseForm.indexOf(
      'result.status === "blocked"',
      saveStart,
    );
    const close = fixedExpenseForm.indexOf("closeForm();", saveStart);

    expect(indeterminateGate).toBeGreaterThan(saveStart);
    expect(blockedGate).toBeGreaterThan(indeterminateGate);
    expect(close).toBeGreaterThan(blockedGate);
    expect(fixedExpenseForm).toContain('role="alert"');
    expect(fixedExpenseForm).toContain("El formulario sigue abierto");
    expect(fixedExpenseForm).toContain("storageStateUnknown");
    expect(fixedExpenseForm).toContain("disabled={storageStateUnknown}");
    const panelStart = fixedExpenseForm.indexOf("<ResponsiveEntityPanel");
    const panelAlert = fixedExpenseForm.indexOf('role="alert"', panelStart);
    expect(panelAlert).toBeGreaterThan(panelStart);
    expect(fixedExpenseForm).toMatch(
      /setRecurringExpenseEnabled\(\s*item\.id,\s*!item\.enabled,\s*data/,
    );
    expect(fixedExpenseForm).toContain("deleteRecurringExpense(item.id, data)");
  });

  it("hace atómico el bundle fijo del escaneo antes de inbox o navegación", () => {
    const newExpenseForm = source("../app/gastos/nuevo/page.tsx");
    const submitStart = newExpenseForm.indexOf("async function handleSubmit()");
    const scanStatusStart = newExpenseForm.indexOf("function scanReviewStatus");
    const fixedScanReviewGate = newExpenseForm.indexOf(
      'review.payload.expense.businessKind === "fixed"',
      scanStatusStart,
    );
    const scanSaveStart = newExpenseForm.indexOf(
      "function saveScanPayload",
      scanStatusStart,
    );
    const fixedScanSaveGate = newExpenseForm.indexOf(
      'payload.expense.businessKind === "fixed"',
      scanSaveStart,
    );
    const collapseStart = newExpenseForm.indexOf(
      "function collapseActiveScanReview()",
    );
    const collapseFixedGate = newExpenseForm.indexOf(
      'if (businessKind === "fixed") return;',
      collapseStart,
    );
    const openReviewStart = newExpenseForm.indexOf(
      "function openScanReview(review",
    );
    const openReviewFixedGate = newExpenseForm.indexOf(
      'businessKind === "fixed"',
      openReviewStart,
    );
    const replayGate = newExpenseForm.indexOf(
      'fixedOperationInspection.status === "applied"',
      submitStart,
    );
    const replayInbox = newExpenseForm.indexOf(
      "await markInboxItemProcessed()",
      replayGate,
    );
    const totals = newExpenseForm.indexOf(
      "const totals = expenseTotalsFromBase",
      submitStart,
    );
    const supplierGate = newExpenseForm.indexOf(
      "const resolved = hasSupplierName",
      submitStart,
    );
    const durableSave = newExpenseForm.indexOf(
      "saveFixedExpenseWithRecurringTemplate(",
      submitStart,
    );
    const appliedGate = newExpenseForm.indexOf(
      'result.status !== "applied"',
      durableSave,
    );
    const inbox = newExpenseForm.indexOf(
      "await markInboxItemProcessed()",
      durableSave,
    );
    const navigation = newExpenseForm.indexOf('router.push("/gastos")', inbox);

    expect(replayGate).toBeGreaterThan(submitStart);
    expect(fixedScanReviewGate).toBeGreaterThan(scanStatusStart);
    expect(fixedScanReviewGate).toBeLessThan(scanSaveStart);
    expect(fixedScanSaveGate).toBeGreaterThan(scanSaveStart);
    expect(fixedScanSaveGate).toBeLessThan(submitStart);
    expect(collapseFixedGate).toBeGreaterThan(collapseStart);
    expect(collapseFixedGate).toBeLessThan(scanStatusStart);
    expect(openReviewFixedGate).toBeGreaterThan(openReviewStart);
    expect(openReviewFixedGate).toBeLessThan(collapseStart);
    expect(newExpenseForm).toContain(
      "Guarda el gasto fijo desde el formulario o quítalo de la revisión",
    );
    expect(newExpenseForm).toContain(
      "Los gastos fijos necesitan confirmar frecuencia y vencimiento",
    );
    expect(replayInbox).toBeGreaterThan(replayGate);
    expect(totals).toBeGreaterThan(replayInbox);
    expect(supplierGate).toBeGreaterThan(totals);
    expect(durableSave).toBeGreaterThan(supplierGate);
    expect(appliedGate).toBeGreaterThan(durableSave);
    expect(inbox).toBeGreaterThan(appliedGate);
    expect(navigation).toBeGreaterThan(inbox);
    expect(newExpenseForm).toContain("fixedSaveInProgressRef.current");
    expect(newExpenseForm).toContain("fixedSaveOperationId()");
    expect(newExpenseForm).toContain("inspectFixedExpenseBundle");
    const batchSaveStart = newExpenseForm.indexOf(
      "async function handleSaveReadyScans()",
    );
    const batchSaveGate = newExpenseForm.indexOf(
      "if (storageStateUnknown) return;",
      batchSaveStart,
    );
    const singleSaveStart = newExpenseForm.indexOf(
      "async function handleSaveSingleScan",
    );
    const singleSaveGate = newExpenseForm.indexOf(
      "if (storageStateUnknown) return;",
      singleSaveStart,
    );
    expect(batchSaveGate).toBeGreaterThan(batchSaveStart);
    expect(batchSaveGate).toBeLessThan(singleSaveStart);
    expect(singleSaveGate).toBeGreaterThan(singleSaveStart);
    expect(newExpenseForm).toContain(
      'if (activeScanReview && businessKind === "fixed") return;',
    );
    expect(newExpenseForm).toContain(
      'if (review.id === activeScanReview?.id && businessKind === "fixed") return;',
    );
    expect(newExpenseForm).toContain('(!isActive || businessKind !== "fixed")');
    expect(newExpenseForm).toContain("Guardar abajo");
    expect(newExpenseForm).toContain(
      'storageStateUnknown ||\n                  Boolean(activeScanReview && businessKind === "fixed") ||',
    );
    expect(newExpenseForm).toContain("disabled={storageStateUnknown}");
    expect(newExpenseForm).toContain(
      "Boolean(blockingDuplicateExpense) || storageStateUnknown",
    );
    expect(newExpenseForm).toContain(
      "sourceInboxItemId: activeInboxItemId ?? undefined",
    );
    expect(newExpenseForm).toContain(
      "if (activeInboxItemId && !inboxProcessed)",
    );
    expect(newExpenseForm).toContain("if (!response.ok");
    expect(newExpenseForm).toContain(
      "Recarga y exporta una copia de seguridad",
    );
    expect(newExpenseForm).toContain('role="alert"');
  });

  it("documenta el bloqueo durable y el estado incierto sin recomendar borrar datos", () => {
    const manual = source("./manual/sections/gastos.ts");

    expect(manual).toContain(
      "proveedor, gasto y regla recurrente se confirman juntos",
    );
    expect(manual).toContain("el formulario permanece abierto");
    expect(manual).toContain("repite únicamente el cierre del buzón");
    expect(manual).toContain("recarga y exporta una copia");
    expect(manual).not.toMatch(/borra(?:r)? (?:los )?datos/i);
  });
});
