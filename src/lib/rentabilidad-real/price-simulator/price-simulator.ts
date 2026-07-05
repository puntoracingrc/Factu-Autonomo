import { roundMoney } from "@/lib/calculations";
import type {
  RentabilidadRealPriceSimulatorInput,
  RentabilidadRealPriceSimulatorResult,
  RentabilidadRealPriceSimulatorWarning,
} from "./types";

function positive(value: number | undefined): number {
  if (!Number.isFinite(value) || (value ?? 0) <= 0) return 0;
  return value ?? 0;
}

function positiveMoney(value: number | undefined): number {
  return roundMoney(positive(value));
}

function percentage(value: number | undefined): number {
  return positive(value) / 100;
}

function divide(numerator: number, denominator: number | undefined): number {
  const safeDenominator = positive(denominator);
  if (safeDenominator <= 0) return 0;
  return roundMoney(numerator / safeDenominator);
}

function targetNetProfitForCalculation(
  input: RentabilidadRealPriceSimulatorInput,
): number {
  const target = positive(input.targetNetProfit);
  if (input.objectiveType === "per_hour") {
    return roundMoney(target * positive(input.estimatedRealHours));
  }
  return roundMoney(target);
}

function monthlyFixedCostsTotal(
  input: RentabilidadRealPriceSimulatorInput,
): number {
  return roundMoney(
    positive(input.monthlyFixedCosts) +
      (input.selfEmployedFeeIncludedInFixedCosts
        ? 0
        : positive(input.selfEmployedFee)),
  );
}

function allocatedFixedCosts(
  input: RentabilidadRealPriceSimulatorInput,
  monthlyFixedCosts: number,
  warnings: RentabilidadRealPriceSimulatorWarning[],
): number {
  if (input.mode === "monthly_revenue") return monthlyFixedCosts;

  if (input.fixedCostAllocationMethod === "none") {
    warnings.push({
      code: "fixed_cost_allocation_missing",
      message:
        "Si no has elegido regla de reparto de gastos fijos, el resultado puede estar incompleto.",
      severity: "warning",
    });
    return 0;
  }

  if (input.fixedCostAllocationMethod === "manual_amount") {
    return positiveMoney(input.manualAllocatedFixedCosts);
  }

  if (input.fixedCostAllocationMethod === "monthly_jobs") {
    const jobsPerMonth = positive(input.jobsPerMonth);
    if (jobsPerMonth <= 0) {
      warnings.push({
        code: "jobs_per_month_missing",
        message:
          "Indica trabajos previstos al mes para repartir gastos fijos por trabajos.",
        severity: "warning",
      });
      return 0;
    }
    return divide(monthlyFixedCosts, jobsPerMonth);
  }

  if (input.fixedCostAllocationMethod === "hours") {
    const monthlyBillableHours = positive(input.monthlyBillableHours);
    const estimatedRealHours = positive(input.estimatedRealHours);
    if (monthlyBillableHours <= 0 || estimatedRealHours <= 0) {
      warnings.push({
        code: "hours_for_fixed_cost_allocation_missing",
        message:
          "Indica horas mensuales facturables y horas reales estimadas para repartir gastos fijos por horas.",
        severity: "warning",
      });
      return 0;
    }
    return roundMoney((monthlyFixedCosts / monthlyBillableHours) * estimatedRealHours);
  }

  if (input.fixedCostAllocationMethod === "revenue_share") {
    const monthlyExpectedRevenue = positive(input.monthlyExpectedRevenue);
    if (monthlyExpectedRevenue <= 0) {
      warnings.push({
        code: "monthly_expected_revenue_missing",
        message:
          "Indica facturación mensual prevista para repartir gastos fijos por facturación.",
        severity: "warning",
      });
      return 0;
    }
    const provisionalRevenue = positive(input.directCosts) + positive(input.targetNetProfit);
    return roundMoney(
      monthlyFixedCosts * Math.min(provisionalRevenue / monthlyExpectedRevenue, 1),
    );
  }

  return 0;
}

function standardWarnings(
  input: RentabilidadRealPriceSimulatorInput,
): RentabilidadRealPriceSimulatorWarning[] {
  const warnings: RentabilidadRealPriceSimulatorWarning[] = [
    {
      code: "irpf_is_provision",
      message: "El IRPF es una provisión, no el impuesto definitivo.",
      severity: "info",
    },
    {
      code: "vat_is_not_profit",
      message: "El IVA no es beneficio.",
      severity: "info",
    },
    {
      code: "advisor_review",
      message: "Este simulador no sustituye a tu gestor.",
      severity: "info",
    },
  ];

  if (positive(input.internalAdjustments) > 0) {
    warnings.push({
      code: "internal_adjustments_do_not_reduce_taxes",
      message: "Los ajustes internos no fiscales no reducen impuestos.",
      severity: "warning",
    });
  }

  if (
    input.mode === "hourly_rate" ||
    input.mode === "closed_project" ||
    input.objectiveType === "per_hour"
  ) {
    warnings.push({
      code: "real_hours_change_effective_rate",
      message:
        "Si tus horas reales superan las previstas, tu tarifa real baja.",
      severity: "warning",
    });
  }

  return warnings;
}

function uniqueWarnings(
  warnings: RentabilidadRealPriceSimulatorWarning[],
): RentabilidadRealPriceSimulatorWarning[] {
  const seen = new Set<string>();
  return warnings.filter((warning) => {
    if (seen.has(warning.code)) return false;
    seen.add(warning.code);
    return true;
  });
}

export function simulateRentabilidadRealMinimumPrice(
  input: RentabilidadRealPriceSimulatorInput,
): RentabilidadRealPriceSimulatorResult {
  const warnings = standardWarnings(input);
  const directCost = positiveMoney(input.directCosts);
  const internalAdjustments = positiveMoney(input.internalAdjustments);
  const irpfProvisionRate = Math.min(percentage(input.irpfProvisionPercentage), 0.99);
  const vatRate = percentage(input.vatRate);
  const desiredMarginRate = percentage(input.desiredMarginPercentage);
  const targetNetProfit = positiveMoney(input.targetNetProfit);
  const targetForCalculation = targetNetProfitForCalculation(input);
  const fixedMonthlyTotal = monthlyFixedCostsTotal(input);
  const fixedCostAllocation = allocatedFixedCosts(
    input,
    fixedMonthlyTotal,
    warnings,
  );
  const requiredOperatingProfit =
    irpfProvisionRate >= 0.99
      ? 0
      : roundMoney(targetForCalculation / (1 - irpfProvisionRate));
  const minimumPriceWithoutVat = roundMoney(
    directCost + fixedCostAllocation + requiredOperatingProfit,
  );
  const minimumInternalPriceWithoutVat = roundMoney(
    minimumPriceWithoutVat + internalAdjustments,
  );
  const recommendedPriceWithoutVat = roundMoney(
    minimumPriceWithoutVat * (1 + desiredMarginRate),
  );
  const recommendedInternalPriceWithoutVat = roundMoney(
    minimumInternalPriceWithoutVat * (1 + desiredMarginRate),
  );
  const priceWithVat = roundMoney(recommendedPriceWithoutVat * (1 + vatRate));
  const expectedDocumentedProfit = roundMoney(
    recommendedPriceWithoutVat - directCost - fixedCostAllocation,
  );
  const expectedInternalProfitAfterAdjustments = roundMoney(
    expectedDocumentedProfit - internalAdjustments,
  );
  const estimatedIrpfProvision = roundMoney(
    Math.max(expectedDocumentedProfit, 0) * irpfProvisionRate,
  );
  const prudentCash = roundMoney(
    expectedDocumentedProfit - estimatedIrpfProvision,
  );
  const monthlyDirectCostsEstimate = positiveMoney(
    input.monthlyDirectCostsEstimate ?? input.directCosts,
  );
  const requiredMonthlyOperatingProfit =
    irpfProvisionRate >= 0.99
      ? 0
      : roundMoney(targetNetProfit / (1 - irpfProvisionRate));
  const monthlyMinimumRevenue = roundMoney(
    fixedMonthlyTotal + monthlyDirectCostsEstimate + requiredMonthlyOperatingProfit,
  );
  const monthlyInternalMinimumRevenue = roundMoney(
    monthlyMinimumRevenue + internalAdjustments,
  );
  const requiredJobsPerMonth = divide(
    monthlyMinimumRevenue,
    input.averageJobPrice,
  );

  if (input.mode === "monthly_revenue" && positive(input.averageJobPrice) <= 0) {
    warnings.push({
      code: "average_job_price_missing",
      message:
        "Indica precio medio por trabajo para calcular trabajos necesarios al mes.",
      severity: "warning",
    });
  }

  if (
    (input.mode === "hourly_rate" || input.objectiveType === "per_hour") &&
    positive(input.estimatedRealHours) <= 0
  ) {
    warnings.push({
      code: "estimated_real_hours_missing",
      message:
        "Indica horas reales estimadas para calcular la tarifa por hora.",
      severity: "warning",
    });
  }

  return {
    mode: input.mode,
    objectiveType: input.objectiveType,
    targetNetProfit,
    targetNetProfitForCalculation: targetForCalculation,
    requiredOperatingProfit,
    minimumPriceWithoutVat,
    minimumInternalPriceWithoutVat,
    recommendedPriceWithoutVat,
    recommendedInternalPriceWithoutVat,
    priceWithVat,
    directCost,
    fixedCostAllocation,
    monthlyFixedCostsTotal: fixedMonthlyTotal,
    estimatedIrpfProvision,
    expectedDocumentedProfit,
    expectedInternalProfitAfterAdjustments,
    prudentCash,
    minimumHourlyRate: divide(minimumPriceWithoutVat, input.estimatedRealHours),
    recommendedHourlyRate: divide(
      recommendedPriceWithoutVat,
      input.estimatedRealHours,
    ),
    monthlyMinimumRevenue,
    monthlyInternalMinimumRevenue,
    requiredJobsPerMonth,
    warnings: uniqueWarnings(warnings),
    calculationVersion: "price-simulator-v1",
  };
}
