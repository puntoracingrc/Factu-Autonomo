import { roundMoney } from "@/lib/calculations";
import type {
  RentabilidadRealCalculationWarning,
  RentabilidadRealFixedCostAllocationInput,
  RentabilidadRealFixedCostAllocationResult,
} from "./types";

function positive(value: number | undefined): number {
  return Number.isFinite(value) && (value ?? 0) > 0 ? value ?? 0 : 0;
}

function missingWarning(message: string): RentabilidadRealCalculationWarning {
  return {
    code: "fixed_cost_allocation_incomplete",
    message,
    severity: "warning",
  };
}

export function allocateRentabilidadRealFixedCosts(
  input: RentabilidadRealFixedCostAllocationInput,
): RentabilidadRealFixedCostAllocationResult {
  const totalFixedCostsForPeriod = positive(input.totalFixedCostsForPeriod);
  const warnings: RentabilidadRealCalculationWarning[] = [];

  if (input.method === "none") {
    if (totalFixedCostsForPeriod > 0) {
      warnings.push({
        code: "fixed_cost_allocation_missing",
        message:
          "Hay gastos fijos existentes, pero todavía no tienen regla de reparto para este cálculo.",
        severity: "warning",
      });
    }

    return {
      method: input.method,
      allocatedFixedCosts: 0,
      warnings,
    };
  }

  if (input.method === "manual_amount") {
    return {
      method: input.method,
      allocatedFixedCosts: roundMoney(positive(input.manualAmount)),
      warnings,
    };
  }

  if (totalFixedCostsForPeriod === 0) {
    warnings.push(
      missingWarning("No hay gastos fijos seleccionados para repartir."),
    );
    return {
      method: input.method,
      allocatedFixedCosts: 0,
      warnings,
    };
  }

  if (input.method === "revenue_share") {
    const workRevenue = positive(input.workRevenue);
    const monthlyRevenue = positive(input.monthlyRevenue);
    if (workRevenue === 0 || monthlyRevenue === 0) {
      warnings.push(
        missingWarning(
          "Falta facturación del trabajo o del mes para repartir gastos fijos por facturación.",
        ),
      );
      return {
        method: input.method,
        allocatedFixedCosts: 0,
        warnings,
      };
    }

    return {
      method: input.method,
      allocatedFixedCosts: roundMoney(
        totalFixedCostsForPeriod * (workRevenue / monthlyRevenue),
      ),
      warnings,
    };
  }

  if (input.method === "monthly_jobs") {
    const monthlyJobs = positive(input.monthlyJobs);
    if (monthlyJobs === 0) {
      warnings.push(
        missingWarning(
          "Falta el número de trabajos del mes para repartir gastos fijos.",
        ),
      );
      return {
        method: input.method,
        allocatedFixedCosts: 0,
        warnings,
      };
    }

    return {
      method: input.method,
      allocatedFixedCosts: roundMoney(totalFixedCostsForPeriod / monthlyJobs),
      warnings,
    };
  }

  const workHours = positive(input.workHours);
  const monthlyWorkHours = positive(input.monthlyWorkHours);
  if (workHours === 0 || monthlyWorkHours === 0) {
    warnings.push(
      missingWarning(
        "Faltan horas del trabajo o del mes para repartir gastos fijos por horas.",
      ),
    );
    return {
      method: input.method,
      allocatedFixedCosts: 0,
      warnings,
    };
  }

  return {
    method: input.method,
    allocatedFixedCosts: roundMoney(
      totalFixedCostsForPeriod * (workHours / monthlyWorkHours),
    ),
    warnings,
  };
}
