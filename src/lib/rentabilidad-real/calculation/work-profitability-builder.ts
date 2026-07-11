import { isFixedExpense } from "@/lib/expense-classification";
import {
  expenseAllocatedAmountForWorkIds,
  explicitExpenseWorkAllocations,
} from "@/lib/expense-work-allocations";
import { roundMoney } from "@/lib/calculations";
import {
  getAlreadyLinkedExpensesForWork,
  getExpenseLinkCandidatesForWork,
  getIgnoredExpensesForWork,
} from "@/lib/rentabilidad-real/expense-linking";
import {
  isSupersededRentabilidadRealDocument,
  rectificationChainDocumentIds,
  sourceQuoteDocumentIdForRentabilidadInvoice,
} from "@/lib/rentabilidad-real/document-chain";
import {
  mapExistingDataToProfitabilityFixedCosts,
  mapExistingExpenseToProfitabilityCost,
  mapExistingInvoiceToProfitabilityIncome,
  mapExistingQuoteToProfitabilityQuote,
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
    fiscalDeductible: cost.fiscalDeductible,
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
    cost.amount === 0
  ) {
    return cost;
  }

  const appliedAmount = roundMoney(
    Math.sign(cost.amount) *
      Math.min(Math.abs(roundMoney(amountOverride)), Math.abs(cost.amount)),
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
    fiscalDeductible: cost.fiscalDeductible,
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
  return documents
    .filter(
      (doc) =>
        doc.type === "factura" &&
        !isSupersededRentabilidadRealDocument(doc) &&
        sourceQuoteDocumentIdForRentabilidadInvoice(doc, documents) ===
          quote.id,
    )
    .sort((a, b) => b.date.localeCompare(a.date))[0];
}

function selectedFixedCostTotals(
  fixedCostCandidates: RentabilidadRealWorkCost[],
  selectedFixedCostIds: string[] | undefined,
): { operating: number; fiscalDeductible: number } {
  const selectedIds =
    selectedFixedCostIds === undefined
      ? null
      : new Set(selectedFixedCostIds);
  const costs =
    selectedIds === null
      ? fixedCostCandidates
      : fixedCostCandidates.filter((cost) => selectedIds.has(cost.id));

  return costs.reduce(
    (totals, cost) => ({
      operating: totals.operating + cost.amount,
      fiscalDeductible:
        totals.fiscalDeductible +
        (cost.fiscalDeductible === false ? 0 : cost.amount),
    }),
    { operating: 0, fiscalDeductible: 0 },
  );
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
  if (isSupersededRentabilidadRealDocument(selectedDocument)) return null;

  const warnings: RentabilidadRealCalculationWarning[] = [];
  const selectedSourceQuoteDocumentId =
    selectedDocument.type === "factura"
      ? sourceQuoteDocumentIdForRentabilidadInvoice(
          selectedDocument,
          data.documents,
        )
      : undefined;
  const quote =
    selectedDocument.type === "presupuesto"
      ? selectedDocument
      : selectedSourceQuoteDocumentId
        ? data.documents.find(
            (doc) =>
              doc.type === "presupuesto" &&
              doc.id === selectedSourceQuoteDocumentId,
          )
        : undefined;
  const invoice =
    selectedDocument.type === "factura"
      ? selectedDocument
      : findLinkedInvoice(data.documents, selectedDocument);
  const relatedDocumentIds = new Set(
    [
      ...rectificationChainDocumentIds(selectedDocument, data.documents),
      ...(invoice ? rectificationChainDocumentIds(invoice, data.documents) : []),
      quote?.id,
    ].filter(
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
      code: selectedSourceQuoteDocumentId
        ? "invoice_source_quote_not_found"
        : "invoice_without_quote",
      message: selectedSourceQuoteDocumentId
        ? "Esta factura declara un presupuesto origen que no se ha encontrado."
        : "Esta factura no tiene presupuesto vinculado; el cálculo usará solo ingreso real.",
      severity: selectedSourceQuoteDocumentId ? "risk" : "info",
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
  const directCosts = data.expenses
    .filter((expense) => !isFixedExpense(expense))
    .flatMap((expense) => {
      const source = mapExistingExpenseToProfitabilityCost(expense);
      const allocatedAmount = expenseAllocatedAmountForWorkIds(
        expense,
        relatedDocumentIds,
        source.amount,
      );
      if (allocatedAmount === 0) return [];
      const cost = applyDirectCostAmountOverride(
        {
          ...workCostFromDirectCost(source),
          workDocumentId: selectedDocument.id,
        },
        explicitExpenseWorkAllocations(expense).length > 0
          ? allocatedAmount
          : params.directCostAmountOverrides?.[expense.id] ?? allocatedAmount,
      );
      return [cost];
    });
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

  const fixedCostCandidates = mapExistingDataToProfitabilityFixedCosts(
    data,
    selectedDocument.date,
  ).map(workCostFromFixedCost);
  const selectedFixedCosts = selectedFixedCostTotals(
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
      sourceQuoteDocumentId: quote?.id ?? selectedSourceQuoteDocumentId,
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
      totalFixedCostsForPeriod: selectedFixedCosts.operating,
      fiscalDeductibleFixedCostsForPeriod:
        selectedFixedCosts.fiscalDeductible,
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
