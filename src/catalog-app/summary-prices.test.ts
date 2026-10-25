import { describe, it, expect } from "vitest";
import { summaryPricesView } from "./summary-prices";
import type { CatalogSummary } from "@/lib/product-catalog-lite/model";
const item: CatalogSummary = {
  id: "synthetic",
  version: 1,
  name: "Prueba",
  sku: "TEST",
  family: "Prueba",
  subfamily: "",
  salePrice: 135.7,
  cost: 67.85,
  unit: "ud",
  purchaseUnit: "ud",
  vat: 21,
  saleUnitCost: 67.85,
  estimatedBenefit: 67.85,
  discountPercent: 50,
};
describe("compact catalogue prices", () => {
  it("presents cost / benefit / final PVP with the VAT basis visible", () => {
    const html = summaryPricesView(item);
    expect(html).toContain("164,20");
    expect(html.match(/67,85/g)).toHaveLength(2);
    expect(html.indexOf(">Coste<")).toBeLessThan(html.indexOf(">Beneficio<"));
    expect(html.indexOf(">Beneficio<")).toBeLessThan(html.indexOf(">PVP<"));
    expect(html).toContain("Coste y beneficio sin IVA");
    expect(html).toContain("PVP con IVA");
  });
  it("uses comparable sale-unit costs for packs and makes losses visible", () => {
    const pack = summaryPricesView({
      ...item,
      purchaseUnit: "caja",
      cost: 100,
      saleUnitCost: 10,
      salePrice: 25,
      estimatedBenefit: 15,
    });
    expect(pack).toContain("10,00");
    expect(pack).toContain("15,00");
    expect(pack).toContain("Por ud");
    expect(pack).not.toContain("100,00");
    expect(summaryPricesView({ ...item, estimatedBenefit: -12 })).toContain(
      "benefit-loss",
    );
  });
  it("does not manufacture missing prices, tax or unit equivalence", () => {
    const missing = summaryPricesView({
      ...item,
      salePrice: null,
      saleUnitCost: null,
      estimatedBenefit: null,
    });
    expect(missing).toContain("67,85");
    expect(missing.match(/>—</g)).toHaveLength(2);
    const units = summaryPricesView({
      ...item,
      purchaseUnit: "caja",
      saleUnitCost: null,
      estimatedBenefit: null,
    });
    expect(units).toContain("Coste por caja · PVP por ud");
    expect(units).toContain(">—<");
    expect(summaryPricesView({ ...item, vat: null })).not.toContain("164,20");
  });
  it("shows the supplier discount without discounting the stored cost twice", () => {
    expect(summaryPricesView(item)).toContain("50 %");
    expect(summaryPricesView(item)).toContain("67,85");
    expect(summaryPricesView({ ...item, discountPercent: 35 })).toContain(
      "35 %",
    );
    expect(summaryPricesView({ ...item, discountPercent: 0 })).toContain("0 %");
    for (const discountPercent of [undefined, null, -1, 101, NaN]) {
      expect(summaryPricesView({ ...item, discountPercent })).toContain(
        "Sin indicar",
      );
    }
  });
  it("escapes units and preserves valid zero amounts", () => {
    expect(
      summaryPricesView({ ...item, unit: '<img src=x onerror="bad()">' }),
    ).not.toContain("<img");
    const zero = summaryPricesView({
      ...item,
      cost: 0,
      saleUnitCost: 0,
      salePrice: 0,
      estimatedBenefit: 0,
    });
    expect(zero.match(/0,00/g)).toHaveLength(3);
    expect(zero).not.toContain(">—<");
  });
});
