import { roundMoney } from "@/lib/calculations";
import {
  allocateRentabilidadRealFixedCosts,
  allocatedFiscalDeductibleFixedCosts,
} from "./fixed-cost-allocation";
import { estimateRentabilidadRealTaxReserve } from "./tax-reserve-estimator";
import type {
  RentabilidadRealCalculationWarning,
  RentabilidadRealWorkProfitabilityInput,
  RentabilidadRealWorkProfitabilityResult,
} from "./types";

function sum(items: number[]): number {
  return roundMoney(items.reduce((total, value) => total + value, 0));
}

function marginPercentage(operatingProfit: number, income: number): number {
  if (!Number.isFinite(income) || income <= 0) return 0;
  return roundMoney((operatingProfit / income) * 100);
}

function positiveMoney(value: number | undefined): number {
  if (!Number.isFinite(value) || (value ?? 0) <= 0) return 0;
  return roundMoney(value ?? 0);
}

function uniqueWarnings(
  warnings: RentabilidadRealCalculationWarning[],
): RentabilidadRealCalculationWarning[] {
  const seen = new Set<string>();
  return warnings.filter((warning) => {
    const key = [
      warning.code,
      warning.message,
      warning.sourceLink?.sourceType ?? "",
      warning.sourceLink?.sourceId ?? "",
    ].join(":");
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

export function calculateRentabilidadRealWorkProfitability(
  input: RentabilidadRealWorkProfitabilityInput,
): RentabilidadRealWorkProfitabilityResult {
  const expectedIncomeWithoutIndirectTax = input.quoteSummary?.subtotal;
  const actualIncomeWithoutIndirectTax = input.invoiceSummary?.subtotal;
  const incomeWithoutIndirectTax =
    actualIncomeWithoutIndirectTax ?? expectedIncomeWithoutIndirectTax ?? 0;
  const totalDirectCosts = sum(input.directCosts.map((cost) => cost.amount));
  const fixedCostAllocation = allocateRentabilidadRealFixedCosts({
    ...input.fixedCostAllocationInput,
    workRevenue:
      input.fixedCostAllocationInput.workRevenue ?? incomeWithoutIndirectTax,
  });
  const grossMargin = roundMoney(incomeWithoutIndirectTax - totalDirectCosts);
  const operatingProfit = roundMoney(
    grossMargin - fixedCostAllocation.allocatedFixedCosts,
  );
  const fiscalDeductibleDirectCosts = sum(
    input.directCosts
      .filter((cost) => cost.fiscalDeductible !== false)
      .map((cost) => cost.amount),
  );
  const fiscalDeductibleFixedCosts =
    allocatedFiscalDeductibleFixedCosts(
      input.fixedCostAllocationInput,
      fixedCostAllocation.allocatedFixedCosts,
    );
  const estimatedIrpfBase = roundMoney(
    input.taxReserve?.irpfBase ??
      incomeWithoutIndirectTax -
        fiscalDeductibleDirectCosts -
        fiscalDeductibleFixedCosts,
  );
  const internalAdjustmentsTotal = positiveMoney(input.internalAdjustmentsTotal);
  const internalRealProfit = roundMoney(
    operatingProfit - internalAdjustmentsTotal,
  );
  const vatChargedFromIncome =
    input.taxReserve?.vatChargedFromIncome ??
    input.invoiceSummary?.iva ??
    input.quoteSummary?.iva ??
    0;
  const deductibleVatFromDirectCosts =
    input.taxReserve?.deductibleVatFromDirectCosts ??
    sum(input.directCosts.map((cost) => cost.ivaAmount));
  const taxReserve = estimateRentabilidadRealTaxReserve({
    vatChargedFromIncome,
    deductibleVatFromDirectCosts,
    operatingProfit,
    irpfBase: estimatedIrpfBase,
    irpfProvisionPercentage: input.taxReserve?.irpfProvisionPercentage,
    hasVatData:
      input.taxReserve?.hasVatData ??
      Boolean(input.invoiceSummary || input.quoteSummary),
  });
  const warnings: RentabilidadRealCalculationWarning[] = [
    ...(input.warnings ?? []),
    ...fixedCostAllocation.warnings,
    ...taxReserve.warnings,
  ];

  if (internalAdjustmentsTotal > 0) {
    warnings.push(
      {
        code: "internal_adjustments_reduce_internal_profit_only",
        message:
          "Los ajustes internos no fiscales reducen solo la rentabilidad interna y caja interna.",
        severity: "info",
      },
      {
        code: "internal_adjustments_do_not_change_taxes",
        message:
          "El IVA y la provisión IRPF se calculan con el resultado documentado.",
        severity: "info",
      },
    );
  }

  return {
    sourceType: input.source.sourceType,
    sourceDocumentId: input.source.sourceDocumentId,
    sourceQuoteDocumentId: input.source.sourceQuoteDocumentId,
    quoteSummary: input.quoteSummary,
    invoiceSummary: input.invoiceSummary,
    incomeWithoutIndirectTax: roundMoney(incomeWithoutIndirectTax),
    expectedIncomeWithoutIndirectTax:
      expectedIncomeWithoutIndirectTax === undefined
        ? undefined
        : roundMoney(expectedIncomeWithoutIndirectTax),
    actualIncomeWithoutIndirectTax:
      actualIncomeWithoutIndirectTax === undefined
        ? undefined
        : roundMoney(actualIncomeWithoutIndirectTax),
    directCosts: input.directCosts,
    totalDirectCosts,
    fixedCostCandidates: input.fixedCostCandidates,
    allocatedFixedCosts: fixedCostAllocation.allocatedFixedCosts,
    fixedCostAllocationMethod: fixedCostAllocation.method,
    grossMargin,
    operatingProfit,
    estimatedIrpfBase,
    documentedOperatingProfit: operatingProfit,
    internalAdjustmentsTotal,
    internalRealProfit,
    marginPercentage: marginPercentage(operatingProfit, incomeWithoutIndirectTax),
    estimatedVatToReserve: taxReserve.estimatedVatToReserve,
    estimatedIrpfProvision: taxReserve.estimatedIrpfProvision,
    prudentAvailableCash: taxReserve.prudentAvailableCash,
    internalPrudentAvailableCash: roundMoney(
      taxReserve.prudentAvailableCash - internalAdjustmentsTotal,
    ),
    warnings: uniqueWarnings(warnings),
    sourceLinks: input.sourceLinks ?? [],
    calculationVersion: "work-profitability-v1",
  };
}
