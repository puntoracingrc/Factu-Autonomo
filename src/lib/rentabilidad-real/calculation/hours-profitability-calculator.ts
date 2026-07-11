import { roundMoney } from "@/lib/calculations";
import {
  allocateRentabilidadRealFixedCosts,
  allocatedFiscalDeductibleFixedCosts,
} from "./fixed-cost-allocation";
import { estimateRentabilidadRealTaxReserve } from "./tax-reserve-estimator";
import type {
  RentabilidadRealCalculationWarning,
  RentabilidadRealHoursProfitabilityInput,
  RentabilidadRealHoursProfitabilityResult,
} from "./types";

function amount(value: number | undefined): number {
  return Number.isFinite(value) && (value ?? 0) > 0 ? value ?? 0 : 0;
}

function moneyAmount(value: number | undefined): number {
  return roundMoney(amount(value));
}

function divide(numerator: number, denominator: number): number {
  if (!Number.isFinite(denominator) || denominator <= 0) return 0;
  return roundMoney(numerator / denominator);
}

function percentage(numerator: number, denominator: number): number {
  if (!Number.isFinite(denominator) || denominator <= 0) return 0;
  return roundMoney((numerator / denominator) * 100);
}

function totalRealHours(input: RentabilidadRealHoursProfitabilityInput): number {
  const override = amount(input.totalRealHoursOverride);
  if (override > 0) return override;
  return roundMoney(
    amount(input.realWorkedHours) +
      amount(input.nonBillableHours) +
      amount(input.meetingHours) +
      amount(input.revisionHours) +
      amount(input.adminHours),
  );
}

function uniqueWarnings(
  warnings: RentabilidadRealCalculationWarning[],
): RentabilidadRealCalculationWarning[] {
  const seen = new Set<string>();
  return warnings.filter((warning) => {
    const key = `${warning.code}:${warning.message}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

export function calculateRentabilidadRealHoursProfitability(
  input: RentabilidadRealHoursProfitabilityInput,
): RentabilidadRealHoursProfitabilityResult {
  const billedHours = amount(input.billedHours);
  const realHours = totalRealHours(input);
  const totalDirectCosts = roundMoney(
    input.directCosts.reduce((total, cost) => total + cost.amount, 0),
  );
  const fixedCostAllocation = allocateRentabilidadRealFixedCosts({
    ...input.fixedCostAllocationInput,
    workRevenue:
      input.fixedCostAllocationInput.workRevenue ??
      input.incomeWithoutIndirectTax,
    workHours: input.fixedCostAllocationInput.workHours ?? realHours,
  });
  const grossMargin = roundMoney(
    input.incomeWithoutIndirectTax - totalDirectCosts,
  );
  const operatingProfit = roundMoney(
    grossMargin - fixedCostAllocation.allocatedFixedCosts,
  );
  const fiscalDeductibleDirectCosts = roundMoney(
    input.directCosts
      .filter((cost) => cost.fiscalDeductible !== false)
      .reduce((total, cost) => total + cost.amount, 0),
  );
  const fiscalDeductibleFixedCosts =
    allocatedFiscalDeductibleFixedCosts(
      input.fixedCostAllocationInput,
      fixedCostAllocation.allocatedFixedCosts,
    );
  const estimatedIrpfBase = roundMoney(
    input.incomeWithoutIndirectTax -
      fiscalDeductibleDirectCosts -
      fiscalDeductibleFixedCosts,
  );
  const internalAdjustmentsTotal = moneyAmount(input.internalAdjustmentsTotal);
  const internalRealProfit = roundMoney(
    operatingProfit - internalAdjustmentsTotal,
  );
  const taxReserve = estimateRentabilidadRealTaxReserve({
    vatChargedFromIncome: input.vatFromIncome,
    deductibleVatFromDirectCosts: roundMoney(
      input.directCosts.reduce((total, cost) => total + cost.ivaAmount, 0),
    ),
    operatingProfit,
    irpfBase: estimatedIrpfBase,
    irpfProvisionPercentage: input.irpfProvisionPercentage,
    hasVatData: true,
  });
  const unbilledHours = Math.max(realHours - billedHours, 0);
  const warnings: RentabilidadRealCalculationWarning[] = [
    ...(input.warnings ?? []),
    ...fixedCostAllocation.warnings,
    ...taxReserve.warnings,
    {
      code: "manual_hours_input",
      message: "Este cálculo usa horas introducidas manualmente.",
      severity: "info",
    },
    {
      code: "calendar_not_integrated",
      message: "No existe una integración de calendario en esta fase.",
      severity: "info",
    },
  ];

  if (realHours <= 0) {
    warnings.push({
      code: "zero_real_hours",
      message: "Faltan horas reales para calcular la rentabilidad por hora.",
      severity: "warning",
    });
  }

  if (realHours > billedHours && billedHours > 0) {
    warnings.push({
      code: "real_hours_exceed_billed_hours",
      message: "Has dedicado más horas reales que horas facturadas.",
      severity: "warning",
    });
  }

  if (
    billedHours > 0 &&
    realHours > 0 &&
    divide(operatingProfit, realHours) < divide(input.incomeWithoutIndirectTax, billedHours)
  ) {
    warnings.push({
      code: "profit_per_hour_below_apparent_rate",
      message: "Tu beneficio por hora real es inferior a tu tarifa aparente.",
      severity: "warning",
    });
  }

  if (input.directCosts.length === 0) {
    warnings.push({
      code: "no_linked_project_costs",
      message: "No hay gastos enlazados a este proyecto/factura.",
      severity: "info",
    });
  }

  if (internalAdjustmentsTotal > 0) {
    warnings.push(
      {
        code: "internal_adjustments_reduce_hourly_profit",
        message:
          "Los ajustes internos no fiscales reducen tu rentabilidad real por hora, pero no afectan tus impuestos.",
        severity: "info",
      },
      {
        code: "documented_vs_internal_profitability",
        message:
          "Este cálculo diferencia rentabilidad documentada de rentabilidad interna.",
        severity: "info",
      },
    );
  }

  return {
    sourceType: input.sourceType,
    sourceDocumentId: input.sourceDocumentId,
    sourceQuoteDocumentId: input.sourceQuoteDocumentId,
    projectName: input.projectName,
    customerName: input.customerName,
    billingModel: input.billingModel,
    incomeWithoutIndirectTax: roundMoney(input.incomeWithoutIndirectTax),
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
    estimatedVatToReserve: taxReserve.estimatedVatToReserve,
    estimatedIrpfProvision: taxReserve.estimatedIrpfProvision,
    prudentAvailableCash: taxReserve.prudentAvailableCash,
    internalPrudentAvailableCash: roundMoney(
      taxReserve.prudentAvailableCash - internalAdjustmentsTotal,
    ),
    billedHours,
    totalRealHours: realHours,
    billedHourlyRate: divide(input.incomeWithoutIndirectTax, billedHours),
    effectiveHourlyRateBeforeCosts: divide(
      input.incomeWithoutIndirectTax,
      realHours,
    ),
    operatingProfitPerRealHour: divide(operatingProfit, realHours),
    internalRealProfitPerRealHour: divide(internalRealProfit, realHours),
    prudentCashPerRealHour: divide(taxReserve.prudentAvailableCash, realHours),
    internalPrudentCashPerRealHour: divide(
      taxReserve.prudentAvailableCash - internalAdjustmentsTotal,
      realHours,
    ),
    unbilledHours,
    unbilledHoursPercentage: percentage(unbilledHours, realHours),
    marginPercentage: percentage(operatingProfit, input.incomeWithoutIndirectTax),
    warnings: uniqueWarnings(warnings),
    sourceLinks: input.sourceLinks ?? [],
    calculationVersion: "hours-profitability-v1",
  };
}
