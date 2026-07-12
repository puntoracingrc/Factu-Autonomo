import { isFixedExpense } from "@/lib/expense-classification";
import { isDocumentUsableForFinancialCalculations } from "@/lib/document-integrity/legacy-import-attestation";
import { todayISO } from "@/lib/calculations";
import { calculateTaxSummary } from "@/lib/taxes";
import type { AppData, Document } from "@/lib/types";
import {
  mapExistingCustomerAddressToProfitabilityLocation,
  mapExistingProfileAddressToProfitabilityLocation,
  mapExistingSupplierAddressToProfitabilityLocation,
} from "./address-adapter";
import { mapExistingArticleToProfitabilityItem } from "./article-adapter";
import {
  mapExistingExpenseToProfitabilityCost,
  mapExistingProviderScanToProfitabilitySource,
} from "./expense-adapter";
import { mapExistingDataToProfitabilityFixedCosts } from "./fixed-cost-sources";
import { mapExistingInvoiceToProfitabilityIncome } from "./invoice-adapter";
import { mapExistingQuoteToProfitabilityQuote } from "./quote-adapter";
import { mapExistingTaxSummaryToProfitabilityTaxContext } from "./tax-adapter";
import type {
  ProfitabilityDataSourceWarning,
  ProfitabilityInputDraft,
  ProfitabilitySourceLink,
} from "./types";

function compact<T>(items: Array<T | null | undefined>): T[] {
  return items.filter((item): item is T => Boolean(item));
}

function uniqueSourceLinks(
  links: ProfitabilitySourceLink[],
): ProfitabilitySourceLink[] {
  const seen = new Set<string>();
  return links.filter((link) => {
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

function documentById(documents: Document[]): Map<string, Document> {
  return new Map(documents.map((doc) => [doc.id, doc]));
}

export function buildProfitabilityInputDraftFromExistingData(
  data: AppData,
  referenceDate = todayISO(),
): ProfitabilityInputDraft {
  const usableDocuments = data.documents.filter(
    isDocumentUsableForFinancialCalculations,
  );
  const invoices = usableDocuments
    .filter((doc) => doc.type === "factura")
    .map(mapExistingInvoiceToProfitabilityIncome);
  const quotes = usableDocuments
    .filter((doc) => doc.type === "presupuesto")
    .map((quote) =>
      mapExistingQuoteToProfitabilityQuote(quote, usableDocuments),
    );
  const directCostCandidates = data.expenses
    .filter((expense) => !isFixedExpense(expense))
    .map(mapExistingExpenseToProfitabilityCost);
  const fixedCostCandidates = mapExistingDataToProfitabilityFixedCosts(
    data,
    referenceDate,
  );
  const taxContext = mapExistingTaxSummaryToProfitabilityTaxContext(
    calculateTaxSummary(data.documents, data.expenses, {
      irpfPercent: data.profile.irpfPercent,
      vatExempt: data.profile.vatExempt,
      profile: data.profile,
    }),
  );
  const articleCandidates = data.products
    .filter((product) => !product.hidden)
    .map(mapExistingArticleToProfitabilityItem);
  const providerScanCandidates = compact(
    data.expenses.map(mapExistingProviderScanToProfitabilitySource),
  );
  const addressCandidates = compact([
    mapExistingProfileAddressToProfitabilityLocation(data.profile),
    ...data.customers.map(mapExistingCustomerAddressToProfitabilityLocation),
    ...data.suppliers.map(mapExistingSupplierAddressToProfitabilityLocation),
  ]);

  const documentsById = documentById(usableDocuments);
  const warnings: ProfitabilityDataSourceWarning[] = [];

  for (const income of invoices) {
    if (
      income.sourceQuoteDocumentId &&
      !documentsById.has(income.sourceQuoteDocumentId)
    ) {
      warnings.push({
        code: "invoice_source_quote_missing",
        message:
          "Hay una factura que declara venir de un presupuesto que ya no está disponible.",
        severity: "risk",
        source: income.sourceLink,
      });
      continue;
    }

    if (!income.sourceQuoteDocumentId && quotes.length > 0) {
      warnings.push({
        code: "invoice_without_quote_assignment",
        message:
          "Hay una factura sin presupuesto enlazado; Rentabilidad Real la podrá calcular, pero no conocerá el trabajo previsto.",
        severity: "warning",
        source: income.sourceLink,
      });
    }
  }

  for (const quote of quotes) {
    if (!quote.linkedInvoiceId) {
      warnings.push({
        code: "quote_without_invoice_assignment",
        message:
          "Hay un presupuesto sin factura enlazada; servirá como trabajo previsto hasta que se conecte con ingresos reales.",
        severity: "info",
        source: quote.sourceLink,
      });
    }
  }

  for (const cost of directCostCandidates) {
    if (!cost.workDocumentId) {
      warnings.push({
        code: "cost_without_work_assignment",
        message:
          "Hay un gasto directo sin asignar a factura, presupuesto o trabajo.",
        severity: "warning",
        source: cost.sourceLink,
      });
    }
  }

  if (fixedCostCandidates.length > 0) {
    warnings.push({
      code: "fixed_cost_allocation_rule_missing",
      message:
        "Existen gastos fijos, pero falta elegir una regla de reparto para llevarlos a trabajos concretos.",
      severity: "warning",
      source: {
        sourceType: "recurring_expense",
        label: "Gastos fijos",
        href: "/gastos/fijos",
      },
    });
  }

  for (const article of articleCandidates) {
    if (!article.purchaseNetUnitCost) {
      warnings.push({
        code: "article_without_purchase_cost",
        message:
          "Hay un artículo sin coste de compra; podrá venderse, pero no calcular margen real hasta completar su coste.",
        severity: "warning",
        source: article.sourceLink,
      });
    }
  }

  const missingData = [
    invoices.length === 0 ? "facturas emitidas" : null,
    quotes.length === 0 ? "presupuestos" : null,
    directCostCandidates.length === 0 ? "gastos directos asignables" : null,
    fixedCostCandidates.length === 0 ? "gastos fijos o recurrentes" : null,
    articleCandidates.length === 0 ? "artículos o materiales" : null,
    providerScanCandidates.length === 0 ? "escaneos IA de proveedor" : null,
  ].filter((item): item is string => Boolean(item));

  return {
    incomes: invoices,
    quotes,
    directCostCandidates,
    fixedCostCandidates,
    taxContext,
    articleCandidates,
    providerScanCandidates,
    addressCandidates,
    sourceLinks: uniqueSourceLinks([
      ...invoices.map((item) => item.sourceLink),
      ...quotes.map((item) => item.sourceLink),
      ...directCostCandidates.map((item) => item.sourceLink),
      ...fixedCostCandidates.map((item) => item.sourceLink),
      taxContext.sourceLink,
      ...articleCandidates.map((item) => item.sourceLink),
      ...providerScanCandidates.map((item) => item.sourceLink),
      ...addressCandidates.map((item) => item.sourceLink),
    ]),
    warnings,
    missingData,
  };
}
