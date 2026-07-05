import { isFixedExpense } from "@/lib/expense-classification";
import { roundMoney } from "@/lib/calculations";
import {
  getAlreadyLinkedExpensesForWork,
  getExpenseLinkCandidatesForWork,
  getIgnoredExpensesForWork,
} from "@/lib/rentabilidad-real/expense-linking";
import {
  mapExistingExpenseToProfitabilityCost,
  mapExistingExpenseToProfitabilityFixedCost,
  mapExistingInvoiceToProfitabilityIncome,
  mapExistingQuoteToProfitabilityQuote,
  mapExistingRecurringExpenseToProfitabilityFixedCost,
  type ProfitabilityFixedCostSource,
  type ProfitabilityIncomeSource,
  type ProfitabilityQuoteSource,
  type ProfitabilitySourceLink,
} from "@/lib/rentabilidad-real/integrations";
import type { AppData, Document } from "@/lib/types";
import type {
  RentabilidadRealCalculationWarning,
  RentabilidadRealFixedCostAllocationMethod,
  RentabilidadRealWorkCost,
  RentabilidadRealWorkIncome,
  RentabilidadRealWorkProfitabilityInput,
  RentabilidadRealWorkSourceType,
} from "./types";

export interface BuildRentabilidadRealWorkProfitabilityInputParams {
  sourceDocumentId: string;
  fixedCostAllocationMethod?: RentabilidadRealFixedCostAllocationMethod;
  manualAmount?: number;
  monthlyRevenue?: number;
  monthlyJobs?: number;
  workHours?: number;
  monthlyWorkHours?: number;
  selectedFixedCostIds?: string[];
  irpfProvisionPercentage?: number;
  directCostAmountOverrides?: Record<string, number>;
}

function uniqueSourceLinks(
  links: Array<ProfitabilitySourceLink | undefined>,
): ProfitabilitySourceLink[] {
  const seen = new Set<string>();
  return links.filter((link): link is ProfitabilitySourceLink => {
    if (!link) return false;
    const key = [
      link.sourceType,
      link.sourceId ?? "",
      link.href ?? "",
      link.label,
    ].join(":");
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function workIncomeFromInvoice(
  income: ProfitabilityIncomeSource,
): RentabilidadRealWorkIncome {
  return {
    sourceType: "invoice",
    documentId: income.id,
    number: income.number,
    date: income.date,
    customerName: income.customerName,
    subtotal: income.subtotal,
    iva: income.iva,
    total: income.total,
    sourceLink: income.sourceLink,
  };
}

function workIncomeFromQuote(
  quote: ProfitabilityQuoteSource,
): RentabilidadRealWorkIncome {
  return {
    sourceType: "quote",
    documentId: quote.id,
    number: quote.number,
    date: quote.date,
    customerName: quote.customerName,
    subtotal: quote.subtotal,
    iva: quote.iva,
    total: quote.total,
    sourceLink: quote.sourceLink,
  };
}

function workCostFromDirectCost(
  cost: ReturnType<typeof mapExistingExpenseToProfitabilityCost>,
): RentabilidadRealWorkCost {
  return {
    id: cost.id,
    sourceType: "expense",
    date: cost.date,
    supplierName: cost.supplierName,
    description: cost.description,
    amount: cost.amount,
    ivaAmount: cost.ivaAmount,
    total: cost.total,
    category: cost.category,
    origin: cost.origin,
    workDocumentId: cost.workDocumentId,
    sourceLink: cost.sourceLink,
  };
}

function applyDirectCostAmountOverride(
  cost: RentabilidadRealWorkCost,
  amountOverride: number | undefined,
): RentabilidadRealWorkCost {
  if (
    amountOverride === undefined ||
    !Number.isFinite(amountOverride) ||
    cost.amount <= 0
  ) {
    return cost;
  }

  const appliedAmount = Math.min(
    Math.max(roundMoney(amountOverride), 0),
    cost.amount,
  );
  if (appliedAmount === cost.amount) return cost;

  const ivaRatio = appliedAmount / cost.amount;
  const appliedIvaAmount = roundMoney(cost.ivaAmount * ivaRatio);

  return {
    ...cost,
    amount: appliedAmount,
    ivaAmount: appliedIvaAmount,
    total: roundMoney(appliedAmount + appliedIvaAmount),
    originalAmount: cost.amount,
    originalIvaAmount: cost.ivaAmount,
    originalTotal: cost.total,
    appliedAmountOverride: appliedAmount,
  };
}

function workCostFromFixedCost(
  cost: ProfitabilityFixedCostSource,
): RentabilidadRealWorkCost {
  return {
    id: cost.id,
    sourceType:
      cost.sourceLink.sourceType === "recurring_expense"
        ? "recurring_expense"
        : "expense",
    date: cost.date,
    supplierName: cost.supplierName,
    description: cost.description,
    amount: cost.amount,
    ivaAmount: cost.ivaAmount,
    total: cost.total,
    category: cost.category,
    origin:
      cost.sourceLink.sourceType === "recurring_expense"
        ? "recurring"
        : undefined,
    sourceLink: cost.sourceLink,
  };
}

function findLinkedInvoice(
  documents: Document[],
  quote: Document,
): Document | undefined {
  return documents.find(
    (doc) =>
      doc.type === "factura" &&
      doc.sourceQuoteDocumentId === quote.id,
  );
}

function selectedFixedCostTotal(
  fixedCostCandidates: RentabilidadRealWorkCost[],
  selectedFixedCostIds: string[] | undefined,
): number {
  if (selectedFixedCostIds === undefined) {
    return fixedCostCandidates.reduce((total, cost) => total + cost.amount, 0);
  }

  const selectedIds = new Set(selectedFixedCostIds);
  const costs = fixedCostCandidates.filter((cost) => selectedIds.has(cost.id));

  return costs.reduce((total, cost) => total + cost.amount, 0);
}

function sourceTypeForDocument(doc: Document): RentabilidadRealWorkSourceType {
  return doc.type === "presupuesto" ? "quote" : "invoice";
}

export function buildRentabilidadRealWorkProfitabilityInputFromExistingData(
  data: AppData,
  params: BuildRentabilidadRealWorkProfitabilityInputParams,
): RentabilidadRealWorkProfitabilityInput | null {
  const selectedDocument = data.documents.find(
    (doc) =>
      doc.id === params.sourceDocumentId &&
      (doc.type === "factura" || doc.type === "presupuesto"),
  );
  if (!selectedDocument) return null;

  const warnings: RentabilidadRealCalculationWarning[] = [];
  const quote =
    selectedDocument.type === "presupuesto"
      ? selectedDocument
      : selectedDocument.sourceQuoteDocumentId
        ? data.documents.find(
            (doc) =>
              doc.type === "presupuesto" &&
              doc.id === selectedDocument.sourceQuoteDocumentId,
          )
        : undefined;
  const invoice =
    selectedDocument.type === "factura"
      ? selectedDocument
      : findLinkedInvoice(data.documents, selectedDocument);
  const relatedDocumentIds = new Set(
    [selectedDocument.id, quote?.id, invoice?.id].filter(
      (id): id is string => Boolean(id),
    ),
  );
  const relatedDocumentIdList = Array.from(relatedDocumentIds);

  if (selectedDocument.type === "presupuesto" && !invoice) {
    warnings.push({
      code: "quote_without_invoice",
      message:
        "Este presupuesto todavía no tiene factura vinculada; el cálculo será previsto.",
      severity: "info",
      sourceLink: {
        sourceType: "quote",
        sourceId: selectedDocument.id,
        label: `Presupuesto ${selectedDocument.number}`,
        href: `/presupuestos/${selectedDocument.id}`,
      },
    });
  }

  if (selectedDocument.type === "factura" && !quote) {
    warnings.push({
      code: selectedDocument.sourceQuoteDocumentId
        ? "invoice_source_quote_not_found"
        : "invoice_without_quote",
      message: selectedDocument.sourceQuoteDocumentId
        ? "Esta factura declara un presupuesto origen que no se ha encontrado."
        : "Esta factura no tiene presupuesto vinculado; el cálculo usará solo ingreso real.",
      severity: selectedDocument.sourceQuoteDocumentId ? "risk" : "info",
      sourceLink: {
        sourceType: "invoice",
        sourceId: selectedDocument.id,
        label: `Factura ${selectedDocument.number}`,
        href: `/facturas/${selectedDocument.id}`,
      },
    });
  }

  const linkedExpenses = getAlreadyLinkedExpensesForWork(
    data,
    relatedDocumentIdList,
  );
  const candidateUnlinkedExpenses = getExpenseLinkCandidatesForWork(
    data,
    relatedDocumentIdList,
  );
  const ignoredExpensesWithReasons = getIgnoredExpensesForWork(
    data,
    relatedDocumentIdList,
  );
  const recurringTemplateIds = new Set(
    data.recurringExpenses.map((expense) => expense.id),
  );
  const seenDirectCostIds = new Set<string>();
  const directCosts = data.expenses
    .filter((expense) => !isFixedExpense(expense))
    .filter(
      (expense) =>
        expense.workDocumentId && relatedDocumentIds.has(expense.workDocumentId),
    )
    .filter((expense) => {
      if (seenDirectCostIds.has(expense.id)) return false;
      seenDirectCostIds.add(expense.id);
      return true;
    })
    .map(mapExistingExpenseToProfitabilityCost)
    .map(workCostFromDirectCost)
    .map((cost) =>
      applyDirectCostAmountOverride(
        cost,
        params.directCostAmountOverrides?.[cost.id],
      ),
    );
  const unlinkedDirectCosts = data.expenses.filter(
    (expense) => !isFixedExpense(expense) && !expense.workDocumentId,
  );

  if (directCosts.length === 0) {
    warnings.push({
      code: "no_linked_direct_costs",
      message:
        "No hay gastos enlazados a este presupuesto o factura; el margen puede estar incompleto.",
      severity: "warning",
    });
  }

  if (unlinkedDirectCosts.length > 0) {
    warnings.push({
      code: "unlinked_direct_costs_available",
      message:
        "Hay gastos existentes sin workDocumentId. No se han incluido automáticamente en este cálculo.",
      severity: "info",
      sourceLink: {
        sourceType: "expense",
        label: "Gastos sin enlazar",
        href: "/gastos",
      },
    });
  }

  if (candidateUnlinkedExpenses.length > 0) {
    warnings.push({
      code: "candidate_expenses_not_included",
      message:
        "Hay gastos candidatos sin enlazar que podrían pertenecer a este trabajo.",
      severity: "info",
      sourceLink: {
        sourceType: "expense",
        label: "Gastos candidatos",
        href: "/gastos",
      },
    });
    warnings.push({
      code: "unlinked_expenses_excluded_from_calculation",
      message: "Los gastos sin enlazar no se han incluido en el cálculo.",
      severity: "info",
      sourceLink: {
        sourceType: "expense",
        label: "Gastos sin enlazar",
        href: "/gastos",
      },
    });
  }

  if (ignoredExpensesWithReasons.length > 0) {
    warnings.push({
      code: "fixed_expenses_allocated_by_rule",
      message:
        "Los gastos fijos se imputan por regla de reparto, no como coste directo.",
      severity: "info",
      sourceLink: {
        sourceType: "recurring_expense",
        label: "Gastos fijos",
        href: "/gastos/fijos",
      },
    });
  }

  for (const cost of directCosts) {
    if (cost.origin === "scan") {
      warnings.push({
        code: "scanned_cost_review_recommended",
        message:
          "Este cálculo usa datos procedentes de escaneo IA; conviene revisar el gasto antes de tomar decisiones.",
        severity: "info",
        sourceLink: cost.sourceLink,
      });
    }
  }

  const fixedCostCandidates = [
    ...data.expenses
      .filter(
        (expense) =>
          !expense.recurringExpenseId ||
          !recurringTemplateIds.has(expense.recurringExpenseId),
      )
      .map(mapExistingExpenseToProfitabilityFixedCost)
      .filter((cost): cost is ProfitabilityFixedCostSource => Boolean(cost)),
    ...data.recurringExpenses.map(
      mapExistingRecurringExpenseToProfitabilityFixedCost,
    ),
  ].map(workCostFromFixedCost);
  const totalFixedCostsForPeriod = selectedFixedCostTotal(
    fixedCostCandidates,
    params.selectedFixedCostIds,
  );
  const quoteSummary = quote
    ? workIncomeFromQuote(
        mapExistingQuoteToProfitabilityQuote(quote, data.documents),
      )
    : undefined;
  const invoiceSummary = invoice
    ? workIncomeFromInvoice(mapExistingInvoiceToProfitabilityIncome(invoice))
    : undefined;

  return {
    source: {
      sourceType: sourceTypeForDocument(selectedDocument),
      sourceDocumentId: selectedDocument.id,
      sourceQuoteDocumentId: quote?.id ?? selectedDocument.sourceQuoteDocumentId,
    },
    quoteSummary,
    invoiceSummary,
    directCosts,
    linkedExpenses,
    candidateUnlinkedExpenses,
    ignoredExpensesWithReasons,
    fixedCostCandidates,
    fixedCostAllocationInput: {
      method: params.fixedCostAllocationMethod ?? "none",
      totalFixedCostsForPeriod,
      manualAmount: params.manualAmount,
      monthlyRevenue: params.monthlyRevenue,
      monthlyJobs: params.monthlyJobs,
      workHours: params.workHours,
      monthlyWorkHours: params.monthlyWorkHours,
    },
    taxReserve: {
      irpfProvisionPercentage: params.irpfProvisionPercentage,
    },
    warnings,
    sourceLinks: uniqueSourceLinks([
      quoteSummary?.sourceLink,
      invoiceSummary?.sourceLink,
      ...directCosts.map((cost) => cost.sourceLink),
      ...fixedCostCandidates.map((cost) => cost.sourceLink),
      {
        sourceType: "tax_summary",
        label: "Impuestos",
        href: "/impuestos",
      },
    ]),
  };
}
