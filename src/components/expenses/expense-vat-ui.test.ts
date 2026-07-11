import { describe, expect, it } from "vitest";
import {
  canAutoSaveScannedExpenseVat,
  canReconcileExpenseAmountWithLineBase,
  countBlockedExpenseVat,
  expenseAmountVatView,
  expensePurchaseLinesVatView,
  expenseVatSourceLabel,
  prepareExpenseVatForSave,
} from "./expense-vat-ui";
import type { Expense, ExpensePurchaseLine } from "@/lib/types";

function line(
  id: string,
  amount: number,
  ivaPercent?: number,
): ExpensePurchaseLine {
  return {
    id,
    description: id,
    quantity: 1,
    unitPrice: amount,
    ivaPercent,
  };
}

describe("expense VAT UI save guard", () => {
  it("prepara y permite autoguardar un mixto conciliado", () => {
    const prepared = prepareExpenseVatForSave({
      amount: 200,
      ivaPercent: 21,
      purchaseLines: [line("21", 100, 21), line("10", 100, 10)],
    });

    expect(prepared.ok).toBe(true);
    expect(prepared.resolution).toMatchObject({
      source: "lines",
      blocked: false,
      base: 200,
      iva: 31,
      total: 231,
    });
    expect(
      canAutoSaveScannedExpenseVat({
        amount: 200,
        ivaPercent: 21,
        purchaseLines: [line("21", 100, 21), line("10", 100, 10)],
      }),
    ).toBe(true);
  });

  it("bloquea un mixto con tipo ausente antes de materializarlo", () => {
    let effects = 0;
    const draft = {
      amount: 200,
      ivaPercent: 21,
      purchaseLines: [
        line("21", 50, 21),
        line("10", 50, 10),
        line("missing", 100),
      ],
    };
    const prepared = prepareExpenseVatForSave(draft);
    if (prepared.ok) effects += 1;

    expect(prepared.ok).toBe(false);
    expect(prepared.resolution.issue).toBe("mixed_vat_missing_rate");
    expect(prepared.purchaseLines[2]?.ivaPercent).toBeUndefined();
    expect(canAutoSaveScannedExpenseVat(draft)).toBe(false);
    expect(effects).toBe(0);
  });

  it("bloquea un mixto descuadrado antes de cualquier efecto", () => {
    let effects = 0;
    const draft = {
      amount: 250,
      ivaPercent: 21,
      purchaseLines: [line("21", 100, 21), line("10", 100, 10)],
    };
    const prepared = prepareExpenseVatForSave(draft);
    if (prepared.ok) effects += 1;

    expect(prepared.ok).toBe(false);
    expect(prepared.resolution.issue).toBe("mixed_vat_base_mismatch");
    expect(canAutoSaveScannedExpenseVat(draft)).toBe(false);
    expect(effects).toBe(0);
  });

  it("materializa el tipo de cabecera y deja un desglose completo gobernado por líneas", () => {
    const prepared = prepareExpenseVatForSave({
      amount: 100,
      ivaPercent: 21,
      purchaseLines: [line("legacy", 100)],
    });

    expect(prepared.ok).toBe(true);
    expect(prepared.purchaseLines[0]?.ivaPercent).toBe(21);
    expect(prepared.resolution.source).toBe("lines");
  });

  it("bloquea cabecera 21 con una línea al 10 y otra sin tipo", () => {
    const draft = {
      amount: 200,
      ivaPercent: 21,
      purchaseLines: [line("10", 100, 10), line("missing", 100)],
    };

    const prepared = prepareExpenseVatForSave(draft);
    expect(prepared.ok).toBe(false);
    expect(prepared.resolution.issue).toBe("mixed_vat_missing_rate");
    expect(prepared.purchaseLines[1]?.ivaPercent).toBeUndefined();
    expect(canAutoSaveScannedExpenseVat(draft)).toBe(false);
  });

  it("mantiene exento el resumen sin reescribir los tipos documentales", () => {
    const purchaseLines = [line("21", 100, 21), line("10", 100, 10)];
    const prepared = prepareExpenseVatForSave(
      {
        amount: 200,
        ivaPercent: 21,
        purchaseLines,
      },
      true,
    );

    expect(prepared.ok).toBe(true);
    expect(prepared.purchaseLines).toBe(purchaseLines);
    expect(prepared.purchaseLines.map((item) => item.ivaPercent)).toEqual([
      21, 10,
    ]);
    expect(prepared.resolution).toMatchObject({
      source: "header",
      iva: 0,
      total: 200,
    });
  });

  it("no autoguarda negativos y conserva su revisión legacy", () => {
    const draft = {
      amount: -100,
      ivaPercent: 21,
      purchaseLines: [line("credit", -100)],
    };

    expect(canAutoSaveScannedExpenseVat(draft)).toBe(false);
    const prepared = prepareExpenseVatForSave(draft);
    expect(prepared.ok).toBe(true);
    expect(prepared.purchaseLines[0]?.ivaPercent).toBeUndefined();
  });

  it("conserva exactamente las líneas de un fijo no deducible", () => {
    const purchaseLines = [
      { ...line("21", 60, 21), supplierReference: "REF-21" },
      { ...line("10", 40, 10), supplierReference: "REF-10" },
    ];
    const prepared = prepareExpenseVatForSave({
      amount: 100,
      ivaPercent: 21,
      purchaseLines,
      businessKind: "fixed",
      deductibility: "non_deductible",
    });

    expect(prepared.ok).toBe(true);
    expect(prepared.purchaseLines).toBe(purchaseLines);
    expect(prepared.purchaseLines.map((item) => ({
      reference: item.supplierReference,
      amount: item.unitPrice,
      ivaPercent: item.ivaPercent,
    }))).toEqual([
      { reference: "REF-21", amount: 60, ivaPercent: 21 },
      { reference: "REF-10", amount: 40, ivaPercent: 10 },
    ]);
    expect(prepared.resolution).toMatchObject({
      source: "header",
      iva: 0,
      total: 100,
    });
  });

  it("no permite conciliar una base contra el importe íntegro no deducible", () => {
    expect(
      canReconcileExpenseAmountWithLineBase({
        businessKind: "fixed",
        deductibility: "non_deductible",
      }),
    ).toBe(false);
    expect(
      canReconcileExpenseAmountWithLineBase({
        origin: "recurring",
        recurringExpenseId: "legacy-template",
        deductibility: "non_deductible",
      }),
    ).toBe(false);
    expect(
      canReconcileExpenseAmountWithLineBase({
        businessKind: "fixed",
        deductibility: "deductible",
      }),
    ).toBe(true);
  });

  it("cuenta los mixtos que deben bloquear una exportación y respeta exentos", () => {
    const expenses = [
      {
        amount: 250,
        ivaPercent: 21,
        purchaseLines: [line("21", 100, 21), line("10", 100, 10)],
      },
      {
        amount: 200,
        ivaPercent: 21,
        purchaseLines: [line("ok-21", 100, 21), line("ok-10", 100, 10)],
      },
    ];

    expect(countBlockedExpenseVat(expenses)).toBe(1);
    expect(countBlockedExpenseVat(expenses, true)).toBe(0);
  });
});

function mixedExpense(): Expense {
  return {
    id: "expense",
    date: "2026-07-11",
    supplierName: "Proveedor",
    description: "Compra mixta",
    amount: 200,
    ivaPercent: 21,
    category: "Material",
    paymentMethod: "Transferencia",
    createdAt: "2026-07-11T00:00:00.000Z",
    purchaseLines: [line("21", 100, 21), line("10", 100, 10)],
  };
}

describe("expense VAT presentation models", () => {
  it("expone resumen mixto central con total y tipos de línea", () => {
    const view = expenseAmountVatView(mixedExpense());

    expect(view.resolution).toMatchObject({
      source: "lines",
      base: 200,
      iva: 31,
      total: 231,
    });
    expect(view.ratesLabel).toBe("21% + 10%");
    expect(expenseVatSourceLabel(view.resolution)).toBe(
      "IVA por líneas · 21% + 10%",
    );
  });

  it("expone base, IVA, total, tipo y origen de cada línea", () => {
    const view = expensePurchaseLinesVatView(mixedExpense());

    expect(view.lines.map((item) => ({
      base: item.amounts.base,
      iva: item.amounts.iva,
      total: item.amounts.total,
      rate: item.ivaPercent,
      origin: item.ivaOrigin,
    }))).toEqual([
      { base: 100, iva: 21, total: 121, rate: 21, origin: "línea" },
      { base: 100, iva: 10, total: 110, rate: 10, origin: "línea" },
    ]);
  });

  it("centraliza a cero importes y orígenes de un perfil exento", () => {
    const amountView = expenseAmountVatView(mixedExpense(), true);
    const linesView = expensePurchaseLinesVatView(mixedExpense(), true);

    expect(amountView.resolution).toMatchObject({ iva: 0, total: 200 });
    expect(expenseVatSourceLabel(amountView.resolution, true)).toBe(
      "Perfil exento · IVA 0%",
    );
    expect(linesView.lines.map((item) => ({
      iva: item.amounts.iva,
      total: item.amounts.total,
      rate: item.ivaPercent,
      documentRate: item.documentIvaPercent,
      origin: item.ivaOrigin,
    }))).toEqual([
      { iva: 0, total: 100, rate: 0, documentRate: 21, origin: "perfil exento" },
      { iva: 0, total: 100, rate: 0, documentRate: 10, origin: "perfil exento" },
    ]);
  });

  it("separa el total íntegro no deducible de sus tipos documentales", () => {
    const expense = {
      ...mixedExpense(),
      amount: 100,
      ivaPercent: 21,
      purchaseLines: [line("21", 60, 21), line("10", 40, 10)],
      businessKind: "fixed" as const,
      deductibility: "non_deductible" as const,
    };
    const view = expensePurchaseLinesVatView(expense);

    expect(view.resolution).toMatchObject({
      source: "header",
      iva: 0,
      total: 100,
    });
    expect(view.lines.map((item) => item.ivaPercent)).toEqual([21, 10]);
    expect(expenseVatSourceLabel(view.resolution, false, expense)).toBe(
      "No desgravable · importe íntegro",
    );
  });
});
