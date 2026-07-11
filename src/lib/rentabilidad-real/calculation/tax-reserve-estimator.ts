import { roundMoney } from "@/lib/calculations";
import type {
  RentabilidadRealCalculationWarning,
  RentabilidadRealTaxReserveInput,
  RentabilidadRealTaxReserveResult,
} from "./types";

export const DEFAULT_RENTABILIDAD_REAL_IRPF_PROVISION_PERCENTAGE = 20;

function normalizePercentage(value: number | undefined): number {
  if (!Number.isFinite(value)) {
    return DEFAULT_RENTABILIDAD_REAL_IRPF_PROVISION_PERCENTAGE;
  }
  return Math.min(100, Math.max(0, value ?? 0));
}

function normalizeAmount(value: number | undefined): number {
  return Number.isFinite(value) ? value ?? 0 : 0;
}

export function estimateRentabilidadRealTaxReserve(
  input: RentabilidadRealTaxReserveInput,
): RentabilidadRealTaxReserveResult {
  const irpfProvisionPercentage = normalizePercentage(
    input.irpfProvisionPercentage,
  );
  const estimatedVatToReserve = roundMoney(
    normalizeAmount(input.vatChargedFromIncome) -
      normalizeAmount(input.deductibleVatFromDirectCosts),
  );
  const operatingProfit = normalizeAmount(input.operatingProfit);
  const irpfBase = normalizeAmount(input.irpfBase ?? operatingProfit);
  const estimatedIrpfProvision =
    irpfBase > 0
      ? roundMoney(irpfBase * (irpfProvisionPercentage / 100))
      : 0;
  const warnings: RentabilidadRealCalculationWarning[] = [
    {
      code: "vat_estimate_not_final",
      message:
        "El IVA estimado a reservar es orientativo y no sustituye el cálculo fiscal definitivo.",
      severity: "info",
    },
    {
      code: "irpf_estimate_not_final",
      message:
        "El IRPF final depende de tu renta anual, comunidad autónoma, retenciones y circunstancias personales.",
      severity: "info",
    },
  ];

  if (!input.hasVatData) {
    warnings.push({
      code: "vat_data_incomplete",
      message:
        "Faltan datos completos de IVA repercutido o soportado para estimar la reserva con precisión.",
      severity: "warning",
    });
  }

  return {
    estimatedVatToReserve,
    estimatedIrpfProvision,
    prudentAvailableCash: roundMoney(
      operatingProfit - estimatedIrpfProvision,
    ),
    irpfProvisionPercentage,
    warnings,
  };
}
