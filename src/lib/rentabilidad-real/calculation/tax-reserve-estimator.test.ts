import { describe, expect, it } from "vitest";
import { estimateRentabilidadRealTaxReserve } from "./tax-reserve-estimator";

describe("estimateRentabilidadRealTaxReserve", () => {
  it("estima IVA como reserva separada e IRPF sobre beneficio positivo", () => {
    const result = estimateRentabilidadRealTaxReserve({
      vatChargedFromIncome: 210,
      deductibleVatFromDirectCosts: 42,
      operatingProfit: 600,
      irpfProvisionPercentage: 20,
      hasVatData: true,
    });

    expect(result.estimatedVatToReserve).toBe(168);
    expect(result.estimatedIrpfProvision).toBe(120);
    expect(result.prudentAvailableCash).toBe(480);
  });

  it("operatingProfit negativo no genera IRPF positivo", () => {
    const result = estimateRentabilidadRealTaxReserve({
      vatChargedFromIncome: 0,
      deductibleVatFromDirectCosts: 21,
      operatingProfit: -100,
      irpfProvisionPercentage: 20,
      hasVatData: true,
    });

    expect(result.estimatedIrpfProvision).toBe(0);
    expect(result.prudentAvailableCash).toBe(-100);
  });

  it("avisa cuando faltan datos de IVA", () => {
    const result = estimateRentabilidadRealTaxReserve({
      vatChargedFromIncome: 0,
      deductibleVatFromDirectCosts: 0,
      operatingProfit: 100,
      hasVatData: false,
    });

    expect(result.warnings.map((warning) => warning.code)).toContain(
      "vat_data_incomplete",
    );
  });
});
