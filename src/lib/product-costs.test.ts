import { describe, expect, it } from "vitest";
import {
  calculatePurchaseNetUnitCost,
  purchaseNetUnitCostInputFromFields,
} from "./product-costs";

function parseAmount(value: string): number | undefined {
  const normalized = value.replace(",", ".").trim();
  if (!normalized) return undefined;
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : undefined;
}

describe("product costs", () => {
  it("calcula coste real desde tarifa proveedor y descuento", () => {
    expect(calculatePurchaseNetUnitCost(150, 20)).toBe(120);
    expect(
      purchaseNetUnitCostInputFromFields("150", "20", parseAmount),
    ).toBe("120,00");
  });

  it("usa descuento cero si solo hay tarifa proveedor", () => {
    expect(calculatePurchaseNetUnitCost(150, undefined)).toBe(150);
    expect(purchaseNetUnitCostInputFromFields("150", "", parseAmount)).toBe(
      "150,00",
    );
  });
});
