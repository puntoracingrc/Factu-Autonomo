import { describe, expect, it } from "vitest";
import {
  EXPENSE_VAT_RECONCILIATION_TOLERANCE,
  expensePurchaseLineCanFeedProductCatalog,
  expensePurchaseLineBaseTotal,
  expensePurchaseLineIsEligibleForProductCatalog,
  expensePurchaseLinesBaseTotal,
  expenseFiscalAmounts,
  expenseTotals,
  expenseTotalsFromBase,
  findDuplicatePurchaseExpense,
  findExpensePurchaseLinePriceAlerts,
  purchaseExpenseDuplicateMatches,
  resolveExpenseVat,
  sanitizeExpensePurchaseDocument,
  sanitizeExpensePurchaseLines,
  summarizeWorkDocumentExpensesById,
  summarizeWorkDocumentExpenses,
} from "./expenses";
import type { Expense } from "./types";

describe("expenseTotalsFromBase", () => {
  it("calcula base 100 e IVA 21 con total 121", () => {
    expect(expenseTotalsFromBase(100, 21)).toEqual({
      base: 100,
      iva: 21,
      total: 121,
      ivaPercent: 21,
    });
  });

  it("separa coste operativo de base e IVA fiscalmente deducibles", () => {
    expect(
      expenseFiscalAmounts({
        amount: 100,
        ivaPercent: 21,
        deductibility: "non_deductible",
      }),
    ).toMatchObject({
      deductible: false,
      registeredBase: 100,
      registeredIvaPercent: 21,
      registeredIva: 21,
      registeredTotal: 121,
      deductibleBase: 0,
      deductibleIva: 0,
      operatingCost: 121,
      vatSource: "header",
      vatIssue: null,
      vatBlocked: false,
    });
  });

  it("calcula IVA mixto desde líneas positivas completas y conciliadas", () => {
    const mixed = {
      amount: 200,
      ivaPercent: 21,
      purchaseLines: [
        {
          id: "line-21",
          description: "Material general",
          quantity: 1,
          unitPrice: 100,
          ivaPercent: 21,
        },
        {
          id: "line-10",
          description: "Material reducido",
          quantity: 1,
          unitPrice: 100,
          ivaPercent: 10,
        },
      ],
    };

    expect(resolveExpenseVat(mixed)).toEqual({
      source: "lines",
      issue: null,
      blocked: false,
      base: 200,
      iva: 31,
      total: 231,
      headerIvaPercent: 21,
      breakdown: [
        { ivaPercent: 21, base: 100, iva: 21, total: 121, lineCount: 1 },
        { ivaPercent: 10, base: 100, iva: 10, total: 110, lineCount: 1 },
      ],
      reconciliationDifference: 0,
    });
    expect(expenseTotals(mixed)).toEqual({
      base: 200,
      iva: 31,
      total: 231,
      ivaPercent: 21,
    });
  });

  it("agrupa bases por tipo y redondea el IVA una sola vez por grupo", () => {
    const resolved = resolveExpenseVat({
      amount: 0.1,
      ivaPercent: 21,
      purchaseLines: [
        { quantity: 1, unitPrice: 0.03, ivaPercent: 21 },
        { quantity: 1, unitPrice: 0.03, ivaPercent: 21 },
        { quantity: 1, unitPrice: 0.04, ivaPercent: 10 },
      ],
    });

    expect(resolved.source).toBe("lines");
    expect(resolved.breakdown).toEqual([
      { ivaPercent: 21, base: 0.06, iva: 0.01, total: 0.07, lineCount: 2 },
      { ivaPercent: 10, base: 0.04, iva: 0, total: 0.04, lineCount: 1 },
    ]);
    expect(resolved.iva).toBe(0.01);
    expect(resolved.total).toBe(0.11);
  });

  it("usa líneas completas de un solo tipo aunque difieran de la cabecera", () => {
    const resolved = resolveExpenseVat({
      amount: 200,
      ivaPercent: 21,
      purchaseLines: [
        { quantity: 1, unitPrice: 100, ivaPercent: 10 },
        { quantity: 1, unitPrice: 100, ivaPercent: 10 },
      ],
    });

    expect(resolved).toMatchObject({
      source: "lines",
      blocked: false,
      iva: 20,
      total: 220,
      headerIvaPercent: 21,
    });
  });

  it("usa líneas completas de un tipo igual al de cabecera", () => {
    const resolved = resolveExpenseVat({
      amount: 200,
      ivaPercent: 21,
      purchaseLines: [
        { quantity: 1, unitPrice: 100, ivaPercent: 21 },
        { quantity: 1, unitPrice: 100, ivaPercent: 21 },
      ],
    });

    expect(resolved).toMatchObject({
      source: "lines",
      blocked: false,
      iva: 42,
      total: 242,
      headerIvaPercent: 21,
    });
  });

  it("mantiene cabecera legacy cuando no existen líneas", () => {
    const resolved = resolveExpenseVat({ amount: 200, ivaPercent: 21 });

    expect(resolved).toMatchObject({
      source: "header",
      blocked: false,
      iva: 42,
      total: 242,
    });
  });

  it("bloquea una línea distinta de cabecera si otra no tiene tipo", () => {
    const resolved = resolveExpenseVat({
      amount: 200,
      ivaPercent: 21,
      purchaseLines: [
        { quantity: 1, unitPrice: 100, ivaPercent: 10 },
        { quantity: 1, unitPrice: 100 },
      ],
    });

    expect(resolved).toMatchObject({
      source: "blocked",
      issue: "mixed_vat_missing_rate",
      blocked: true,
      iva: 42,
      total: 242,
    });
  });

  it("permite cabecera si las líneas incompletas no aportan conflicto", () => {
    const resolved = resolveExpenseVat({
      amount: 200,
      ivaPercent: 21,
      purchaseLines: [
        { quantity: 1, unitPrice: 100, ivaPercent: 21 },
        { quantity: 1, unitPrice: 100 },
      ],
    });

    expect(resolved).toMatchObject({
      source: "header",
      issue: null,
      blocked: false,
      iva: 42,
      total: 242,
    });
  });

  it("bloquea evidencia mixta si falta el tipo de una línea", () => {
    const expense = {
      amount: 300,
      ivaPercent: 21,
      purchaseLines: [
        { quantity: 1, unitPrice: 100, ivaPercent: 21 },
        { quantity: 1, unitPrice: 100, ivaPercent: 10 },
        { quantity: 1, unitPrice: 100 },
      ],
    };
    const resolved = resolveExpenseVat(expense);

    expect(resolved).toMatchObject({
      source: "blocked",
      issue: "mixed_vat_missing_rate",
      blocked: true,
      base: 300,
      iva: 63,
      total: 363,
      reconciliationDifference: 0,
    });
    expect(expenseFiscalAmounts(expense)).toMatchObject({
      registeredBase: 300,
      registeredIva: 63,
      registeredTotal: 363,
      deductibleBase: 300,
      deductibleIva: 0,
      operatingCost: 363,
      vatBlocked: true,
    });
  });

  it("bloquea evidencia mixta con línea malformada", () => {
    const resolved = resolveExpenseVat({
      amount: 200,
      ivaPercent: 21,
      purchaseLines: [
        { quantity: 1, unitPrice: 100, ivaPercent: 21 },
        { quantity: 1, unitPrice: 100, ivaPercent: 10 },
        { quantity: 1, unitPrice: Number.NaN, ivaPercent: 4 },
      ],
    });

    expect(resolved).toMatchObject({
      source: "blocked",
      issue: "mixed_vat_invalid_line",
      blocked: true,
    });
  });

  it("no oculta un segundo tipo explícito aunque esté fuera de rango", () => {
    const resolved = resolveExpenseVat({
      amount: 200,
      ivaPercent: 21,
      purchaseLines: [
        { quantity: 1, unitPrice: 100, ivaPercent: 21 },
        { quantity: 1, unitPrice: 100, ivaPercent: 150 },
      ],
    });

    expect(resolved).toMatchObject({
      source: "blocked",
      issue: "mixed_vat_invalid_line",
      blocked: true,
      iva: 42,
      total: 242,
    });
  });

  it("bloquea tipos mixtos numéricos cargados con un tipo runtime inválido", () => {
    const resolved = resolveExpenseVat({
      amount: 200,
      ivaPercent: 21,
      purchaseLines: [
        { quantity: 1, unitPrice: 100, ivaPercent: 21 },
        {
          quantity: 1,
          unitPrice: 100,
          ivaPercent: "10" as never,
        },
      ],
    });

    expect(resolved).toMatchObject({
      source: "blocked",
      issue: "mixed_vat_invalid_line",
      blocked: true,
    });
  });

  it("no falla y bloquea si un backup mixto contiene una línea nula", () => {
    const resolved = resolveExpenseVat({
      amount: 200,
      ivaPercent: 21,
      purchaseLines: [
        { quantity: 1, unitPrice: 100, ivaPercent: 21 },
        { quantity: 1, unitPrice: 100, ivaPercent: 10 },
        null as never,
      ],
    });

    expect(resolved).toMatchObject({
      source: "blocked",
      issue: "mixed_vat_invalid_line",
      blocked: true,
    });
  });

  it("bloquea evidencia mixta cuando la base de líneas no concilia", () => {
    const resolved = resolveExpenseVat({
      amount: 250,
      ivaPercent: 21,
      purchaseLines: [
        { quantity: 1, unitPrice: 100, ivaPercent: 21 },
        { quantity: 1, unitPrice: 100, ivaPercent: 10 },
      ],
    });

    expect(EXPENSE_VAT_RECONCILIATION_TOLERANCE).toBe(0.02);
    expect(resolved).toMatchObject({
      source: "blocked",
      issue: "mixed_vat_base_mismatch",
      blocked: true,
      reconciliationDifference: -50,
    });
  });

  it("acepta una diferencia de bases dentro de la tolerancia monetaria", () => {
    const resolved = resolveExpenseVat({
      amount: 200,
      ivaPercent: 21,
      purchaseLines: [
        { quantity: 1, unitPrice: 99.98, ivaPercent: 21 },
        { quantity: 1, unitPrice: 100, ivaPercent: 10 },
      ],
    });

    expect(resolved).toMatchObject({
      source: "lines",
      blocked: false,
      reconciliationDifference: -0.02,
      iva: 31,
      total: 231,
    });
  });

  it("conserva cabecera para abonos hasta resolver AUD-P1-13", () => {
    const resolved = resolveExpenseVat({
      amount: -200,
      ivaPercent: 21,
      purchaseLines: [
        { quantity: -1, unitPrice: 100, total: -100, ivaPercent: 21 },
        { quantity: -1, unitPrice: 100, total: -100, ivaPercent: 10 },
      ],
    });

    expect(resolved).toMatchObject({
      source: "header",
      blocked: false,
      base: -200,
      iva: -42,
      total: -242,
    });
  });

  it("fuerza IVA cero para un perfil exento aunque existan líneas mixtas", () => {
    const resolved = resolveExpenseVat(
      {
        amount: 200,
        ivaPercent: 21,
        purchaseLines: [
          { quantity: 1, unitPrice: 100, ivaPercent: 21 },
          { quantity: 1, unitPrice: 100, ivaPercent: 10 },
        ],
      },
      true,
    );

    expect(resolved).toMatchObject({
      source: "header",
      blocked: false,
      base: 200,
      iva: 0,
      total: 200,
      headerIvaPercent: 0,
    });
  });

  it("preserva P1-06 para IVA mixto deducible y no deducible", () => {
    const mixed = {
      amount: 200,
      ivaPercent: 21,
      purchaseLines: [
        { quantity: 1, unitPrice: 100, ivaPercent: 21 },
        { quantity: 1, unitPrice: 100, ivaPercent: 10 },
      ],
    };

    expect(expenseFiscalAmounts(mixed)).toMatchObject({
      registeredBase: 200,
      registeredIva: 31,
      registeredTotal: 231,
      deductibleBase: 200,
      deductibleIva: 31,
      operatingCost: 200,
      vatSource: "lines",
    });
    expect(
      expenseFiscalAmounts({
        ...mixed,
        deductibility: "non_deductible",
      }),
    ).toMatchObject({
      registeredBase: 200,
      registeredIva: 31,
      registeredTotal: 231,
      deductibleBase: 0,
      deductibleIva: 0,
      operatingCost: 231,
      vatSource: "lines",
    });
  });

  it("mantiene el importe íntegro P1-06 para un fijo no deducible sin reescribir líneas", () => {
    const purchaseLines = [
      { quantity: 1, unitPrice: 60, ivaPercent: 21 },
      { quantity: 1, unitPrice: 40, ivaPercent: 10 },
    ];
    const originalLines = purchaseLines.map((line) => ({ ...line }));
    const fixedNonDeductible = {
      amount: 100,
      ivaPercent: 21,
      businessKind: "fixed" as const,
      deductibility: "non_deductible" as const,
      purchaseLines,
    };

    expect(resolveExpenseVat(fixedNonDeductible)).toMatchObject({
      source: "header",
      blocked: false,
      base: 100,
      iva: 0,
      total: 100,
      headerIvaPercent: 0,
    });
    expect(expenseTotals(fixedNonDeductible)).toEqual({
      base: 100,
      iva: 0,
      total: 100,
      ivaPercent: 0,
    });
    expect(expenseFiscalAmounts(fixedNonDeductible)).toMatchObject({
      registeredBase: 100,
      registeredIva: 0,
      registeredTotal: 100,
      deductibleBase: 0,
      deductibleIva: 0,
      operatingCost: 100,
      vatSource: "header",
      vatBlocked: false,
    });
    expect(purchaseLines).toEqual(originalLines);

    expect(
      expenseFiscalAmounts({
        ...fixedNonDeductible,
        businessKind: undefined,
        recurringExpenseId: "legacy-recurring-template",
      }),
    ).toMatchObject({
      registeredTotal: 100,
      registeredIva: 0,
      operatingCost: 100,
      vatSource: "header",
    });

    expect(
      expenseTotals({
        ...fixedNonDeductible,
        businessKind: undefined,
        origin: "recurring",
      }),
    ).toEqual({ base: 100, iva: 0, total: 100, ivaPercent: 0 });
  });

  it("mantiene line-aware un fijo deducible", () => {
    const fixedDeductible = {
      amount: 100,
      ivaPercent: 21,
      businessKind: "fixed" as const,
      deductibility: "deductible" as const,
      purchaseLines: [
        { quantity: 1, unitPrice: 60, ivaPercent: 21 },
        { quantity: 1, unitPrice: 40, ivaPercent: 10 },
      ],
    };

    expect(resolveExpenseVat(fixedDeductible)).toMatchObject({
      source: "lines",
      blocked: false,
      base: 100,
      iva: 16.6,
      total: 116.6,
    });
    expect(expenseFiscalAmounts(fixedDeductible)).toMatchObject({
      registeredTotal: 116.6,
      deductibleBase: 100,
      deductibleIva: 16.6,
      operatingCost: 100,
      vatSource: "lines",
    });
  });

  it("conserva el coste de cabecera en un mixto bloqueado no deducible", () => {
    const fiscal = expenseFiscalAmounts({
      amount: 300,
      ivaPercent: 21,
      deductibility: "non_deductible",
      purchaseLines: [
        { quantity: 1, unitPrice: 100, ivaPercent: 21 },
        { quantity: 1, unitPrice: 100, ivaPercent: 10 },
        { quantity: 1, unitPrice: 100 },
      ],
    });

    expect(fiscal).toMatchObject({
      registeredIva: 63,
      registeredTotal: 363,
      deductibleBase: 0,
      deductibleIva: 0,
      operatingCost: 363,
      vatSource: "blocked",
      vatBlocked: true,
    });
  });

  it("mantiene como deducibles los gastos legacy sin marca", () => {
    expect(
      expenseFiscalAmounts({ amount: 100, ivaPercent: 21 }),
    ).toMatchObject({
      deductible: true,
      deductibleBase: 100,
      deductibleIva: 21,
      operatingCost: 100,
    });
  });

  it("excluye de fiscalidad valores de deducibilidad desconocidos", () => {
    expect(
      expenseFiscalAmounts({
        amount: 100,
        ivaPercent: 21,
        deductibility: "unknown" as never,
      }),
    ).toMatchObject({
      deductible: false,
      deductibleBase: 0,
      deductibleIva: 0,
      operatingCost: 121,
    });
  });

  it("calcula gastos con IVA 0", () => {
    expect(expenseTotalsFromBase(100, 0)).toEqual({
      base: 100,
      iva: 0,
      total: 100,
      ivaPercent: 0,
    });
  });

  it("mantiene importes negativos para abonos o devoluciones", () => {
    expect(expenseTotalsFromBase(-100, 21)).toEqual({
      base: -100,
      iva: -21,
      total: -121,
      ivaPercent: 21,
    });
  });

  it("recalcula total al editar la base", () => {
    const before = expenseTotalsFromBase(100, 21);
    const after = expenseTotalsFromBase(200, 21);

    expect(before.total).toBe(121);
    expect(after.total).toBe(242);
  });

  it("evita NaN en la vista de totales", () => {
    const totals = expenseTotalsFromBase(Number.NaN, Number.NaN);

    expect(totals.base).toBe(0);
    expect(totals.iva).toBe(0);
    expect(totals.total).toBe(0);
    expect(Number.isNaN(totals.total)).toBe(false);
  });

  it("calcula y limpia líneas de compra", () => {
    const lines = sanitizeExpensePurchaseLines([
      {
        id: "line-1",
        description: " Lama persiana ",
        quantity: 2,
        unit: " ud ",
        unitPrice: 30,
        discountPercent: 10,
        ivaPercent: 21,
      },
      {
        id: "line-2",
        description: "Sin precio",
        quantity: 1,
        unitPrice: 0,
        ivaPercent: 21,
      },
    ]);

    expect(lines).toHaveLength(1);
    expect(lines[0]).toMatchObject({
      description: "Lama persiana",
      unit: "ud",
    });
    expect(expensePurchaseLineBaseTotal(lines[0])).toBe(54);
    expect(expensePurchaseLinesBaseTotal(lines)).toBe(54);
  });

  it("conserva líneas negativas de abonos de proveedor", () => {
    const lines = sanitizeExpensePurchaseLines([
      {
        id: "line-return",
        description: "Material devuelto",
        quantity: -2,
        unitPrice: 30,
        ivaPercent: 21,
        total: -60,
      },
    ]);

    expect(lines).toHaveLength(1);
    expect(lines[0]).toMatchObject({
      description: "Material devuelto",
      quantity: -2,
      total: -60,
    });
    expect(expensePurchaseLineBaseTotal(lines[0])).toBe(-60);
  });

  it("solo deja alimentar Productos a compras positivas con líneas positivas", () => {
    const positiveLine = {
      id: "positive-line",
      description: "Motor G50",
      catalogProduct: true,
      quantity: 1,
      unitPrice: 100,
    };
    const negativeLine = {
      ...positiveLine,
      id: "negative-line",
      quantity: -1,
      total: -100,
    };

    expect(
      expensePurchaseLineCanFeedProductCatalog(
        { amount: 100 },
        positiveLine,
      ),
    ).toBe(true);
    expect(
      expensePurchaseLineCanFeedProductCatalog(
        { amount: -100 },
        positiveLine,
      ),
    ).toBe(false);
    expect(
      expensePurchaseLineCanFeedProductCatalog(
        { amount: 100 },
        negativeLine,
      ),
    ).toBe(false);
    expect(
      expensePurchaseLineIsEligibleForProductCatalog(
        { amount: 100 },
        positiveLine,
      ),
    ).toBe(true);
    expect(
      expensePurchaseLineCanFeedProductCatalog(
        { amount: 100 },
        { ...positiveLine, catalogProduct: false },
      ),
    ).toBe(false);
  });

  it("limpia datos de factura de proveedor vacíos", () => {
    expect(sanitizeExpensePurchaseDocument({})).toBeUndefined();
    expect(
      sanitizeExpensePurchaseDocument({
        invoiceNumber: " FD-1 ",
        supplierNif: " B12345678 ",
      }),
    ).toEqual({
      invoiceNumber: "FD-1",
      supplierNif: "B12345678",
    });
  });

  it("detecta facturas de proveedor duplicadas por numero, proveedor e importe", () => {
    const previousExpense: Expense = {
      id: "expense-1",
      date: "2026-06-16",
      supplierName: "METALURGICA ARANDES S.L.",
      description: "Compra de materiales y componentes metalicos",
      amount: 386.45,
      ivaPercent: 21,
      category: "Material",
      paymentMethod: "Transferencia",
      purchaseDocument: {
        invoiceNumber: "FD/224811",
        supplierNif: "B60470374",
      },
      createdAt: "2026-06-16T10:00:00.000Z",
    };

    expect(
      purchaseExpenseDuplicateMatches(
        {
          invoiceNumber: " fd/224811 ",
          supplierName: "metalurgica arandes s.l.",
          amount: 386.45,
        },
        {
          invoiceNumber: previousExpense.purchaseDocument?.invoiceNumber,
          supplierNif: previousExpense.purchaseDocument?.supplierNif,
          supplierName: previousExpense.supplierName,
          amount: previousExpense.amount,
        },
      ),
    ).toBe(true);
    expect(
      findDuplicatePurchaseExpense([previousExpense], {
        invoiceNumber: "FD/224811",
        supplierNif: "B60470374",
        supplierName: "METALURGICA ARANDES S.L.",
        amount: 386.45,
      }),
    ).toBe(previousExpense);
    expect(
      purchaseExpenseDuplicateMatches(
        {
          invoiceNumber: "FD/224811",
          supplierName: "Metalúrgica Arandes SL",
        },
        {
          invoiceNumber: previousExpense.purchaseDocument?.invoiceNumber,
          supplierName: previousExpense.supplierName,
        },
      ),
    ).toBe(true);
    expect(
      findDuplicatePurchaseExpense(
        [previousExpense],
        {
          invoiceNumber: "FD/224811",
          supplierName: "METALURGICA ARANDES S.L.",
          amount: 386.45,
        },
        { excludeExpenseId: "expense-1" },
      ),
    ).toBeNull();
  });

  it("resume costes vinculados a un trabajo", () => {
    const expenses: Expense[] = [
      {
        id: "expense-1",
        date: "2026-06-01",
        supplierName: "Proveedor Demo",
        description: "Material",
        amount: 120.5,
        ivaPercent: 21,
        category: "Material",
        paymentMethod: "Tarjeta",
        workDocumentId: "document-1",
        createdAt: "2026-06-01T10:00:00.000Z",
      },
      {
        id: "expense-2",
        date: "2026-06-02",
        supplierName: "Proveedor Demo",
        description: "Recambio",
        amount: 30,
        ivaPercent: 21,
        category: "Material",
        paymentMethod: "Tarjeta",
        workDocumentId: "document-1",
        createdAt: "2026-06-02T10:00:00.000Z",
      },
      {
        id: "expense-3",
        date: "2026-06-03",
        supplierName: "Otro proveedor",
        description: "Otro trabajo",
        amount: 80,
        ivaPercent: 21,
        category: "Material",
        paymentMethod: "Tarjeta",
        workDocumentId: "document-2",
        createdAt: "2026-06-03T10:00:00.000Z",
      },
    ];

    expect(summarizeWorkDocumentExpenses(expenses, "document-1")).toEqual({
      count: 2,
      cost: 150.5,
      deductibleBase: 150.5,
      deductibleIva: 31.61,
    });
    expect(summarizeWorkDocumentExpensesById(expenses).get("document-2")).toEqual({
      count: 1,
      cost: 80,
      deductibleBase: 80,
      deductibleIva: 16.8,
    });
  });

  it("mantiene un coste no deducible en margen sin usarlo para reservas", () => {
    const summary = summarizeWorkDocumentExpenses(
      [
        {
          id: "expense-non-deductible",
          date: "2026-06-01",
          supplierName: "Proveedor Demo",
          description: "Coste no desgravable",
          amount: 100,
          ivaPercent: 21,
          deductibility: "non_deductible",
          category: "Otros",
          paymentMethod: "Tarjeta",
          workDocumentId: "document-1",
          createdAt: "2026-06-01T10:00:00.000Z",
        },
      ],
      "document-1",
    );

    expect(summary).toEqual({
      count: 1,
      cost: 121,
      deductibleBase: 0,
      deductibleIva: 0,
    });
  });

  it("propaga el IVA mixto a los resúmenes de gastos vinculados", () => {
    const mixedLines = [
      {
        id: "linked-21",
        description: "Material general",
        quantity: 1,
        unitPrice: 100,
        ivaPercent: 21,
      },
      {
        id: "linked-10",
        description: "Material reducido",
        quantity: 1,
        unitPrice: 100,
        ivaPercent: 10,
      },
    ];
    const expenses: Expense[] = [
      {
        id: "linked-mixed",
        date: "2026-07-11",
        supplierName: "Proveedor",
        description: "Compra mixta",
        amount: 200,
        ivaPercent: 21,
        category: "Material",
        paymentMethod: "Tarjeta",
        purchaseLines: mixedLines,
        workDocumentId: "work-mixed",
        createdAt: "2026-07-11T10:00:00.000Z",
      },
      {
        id: "linked-mixed-nondeductible",
        date: "2026-07-11",
        supplierName: "Proveedor",
        description: "Compra mixta no deducible",
        amount: 200,
        ivaPercent: 21,
        deductibility: "non_deductible",
        category: "Material",
        paymentMethod: "Tarjeta",
        purchaseLines: mixedLines,
        workDocumentId: "work-mixed-nondeductible",
        createdAt: "2026-07-11T10:00:00.000Z",
      },
    ];

    expect(summarizeWorkDocumentExpenses(expenses, "work-mixed")).toEqual({
      count: 1,
      cost: 200,
      deductibleBase: 200,
      deductibleIva: 31,
    });
    expect(
      summarizeWorkDocumentExpensesById(expenses).get(
        "work-mixed-nondeductible",
      ),
    ).toEqual({
      count: 1,
      cost: 231,
      deductibleBase: 0,
      deductibleIva: 0,
    });
  });

  it("avisa si una línea escaneada sube mucho respecto a compras anteriores", () => {
    const previousExpense: Expense = {
      id: "expense-1",
      date: "2026-06-01",
      supplierId: "supplier-1",
      supplierName: "Proveedor Demo",
      description: "Compra anterior",
      amount: 50,
      ivaPercent: 21,
      category: "Material",
      paymentMethod: "Tarjeta",
      purchaseLines: [
        {
          id: "previous-line",
          description: "Lama persiana blanca",
          quantity: 1,
          unitPrice: 10,
          discountPercent: 10,
        },
      ],
      createdAt: "2026-06-01T10:00:00.000Z",
    };

    const alerts = findExpensePurchaseLinePriceAlerts({
      currentLines: [
        {
          id: "current-line",
          description: "Lama persiana blanca",
          quantity: 1,
          unitPrice: 13,
          discountPercent: 0,
        },
      ],
      currentExpenseAmount: 13,
      expenses: [previousExpense],
      supplierId: "supplier-1",
    });

    expect(alerts).toHaveLength(1);
    expect(alerts[0]).toMatchObject({
      description: "Lama persiana blanca",
      previousUnitPrice: 10,
      currentUnitPrice: 13,
      priceChangePercent: 30,
      discountChangePoints: -10,
    });
  });

  it("no avisa por cambios pequeños de precio o por otros proveedores", () => {
    const previousExpense: Expense = {
      id: "expense-1",
      date: "2026-06-01",
      supplierId: "supplier-1",
      supplierName: "Proveedor Demo",
      description: "Compra anterior",
      amount: 50,
      ivaPercent: 21,
      category: "Material",
      paymentMethod: "Tarjeta",
      purchaseLines: [
        {
          id: "previous-line",
          description: "Lama persiana blanca",
          quantity: 1,
          unitPrice: 10,
          discountPercent: 10,
        },
      ],
      createdAt: "2026-06-01T10:00:00.000Z",
    };

    expect(
      findExpensePurchaseLinePriceAlerts({
        currentLines: [
          {
            id: "current-line",
            description: "Lama persiana blanca",
            quantity: 1,
            unitPrice: 10.5,
            discountPercent: 8,
          },
        ],
        currentExpenseAmount: 10.5,
        expenses: [previousExpense],
        supplierId: "supplier-1",
      }),
    ).toHaveLength(0);

    expect(
      findExpensePurchaseLinePriceAlerts({
        currentLines: [
          {
            id: "current-line",
            description: "Lama persiana blanca",
            quantity: 1,
            unitPrice: 13,
          },
        ],
        currentExpenseAmount: 13,
        expenses: [previousExpense],
        supplierId: "supplier-2",
      }),
    ).toHaveLength(0);
  });

  it("no avisa de precio en líneas que no alimentan catálogo", () => {
    const previousExpense: Expense = {
      id: "expense-1",
      date: "2026-06-01",
      supplierId: "supplier-1",
      supplierName: "Proveedor Demo",
      description: "Compra anterior",
      amount: 50,
      ivaPercent: 21,
      category: "Material",
      paymentMethod: "Tarjeta",
      purchaseLines: [
        {
          id: "previous-line",
          description: "Taladro para uso interno",
          catalogProduct: false,
          quantity: 1,
          unitPrice: 100,
        },
      ],
      createdAt: "2026-06-01T10:00:00.000Z",
    };

    const alerts = findExpensePurchaseLinePriceAlerts({
      currentLines: [
        {
          id: "current-line",
          description: "Taladro para uso interno",
          catalogProduct: false,
          quantity: 1,
          unitPrice: 150,
        },
      ],
      currentExpenseAmount: 150,
      expenses: [previousExpense],
      supplierId: "supplier-1",
    });

    expect(alerts).toHaveLength(0);
  });

  it("no usa abonos documentales como precio actual ni referencia histórica", () => {
    const positiveLine = {
      id: "line",
      description: "Motor G50",
      catalogProduct: true,
      quantity: 1,
      unitPrice: 130,
    };
    const historicalCredit: Expense = {
      id: "credit",
      date: "2026-06-01",
      supplierId: "supplier-1",
      supplierName: "Proveedor Demo",
      description: "Abono con línea positiva",
      amount: -100,
      ivaPercent: 21,
      category: "Material",
      paymentMethod: "Transferencia",
      purchaseLines: [{ ...positiveLine, unitPrice: 100 }],
      createdAt: "2026-06-01T10:00:00.000Z",
    };
    const historicalPurchase: Expense = {
      ...historicalCredit,
      id: "purchase",
      description: "Compra válida",
      amount: 100,
    };

    expect(
      findExpensePurchaseLinePriceAlerts({
        currentLines: [positiveLine],
        currentExpenseAmount: 130,
        expenses: [historicalCredit],
        supplierId: "supplier-1",
      }),
    ).toEqual([]);
    expect(
      findExpensePurchaseLinePriceAlerts({
        currentLines: [positiveLine],
        currentExpenseAmount: -130,
        expenses: [historicalPurchase],
        supplierId: "supplier-1",
      }),
    ).toEqual([]);
  });
});
