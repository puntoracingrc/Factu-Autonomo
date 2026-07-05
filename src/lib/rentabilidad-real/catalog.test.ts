import { describe, expect, it } from "vitest";
import {
  getAvailableRentabilidadRealProducts,
  getComingSoonRentabilidadRealProducts,
  getRentabilidadRealProductBySlug,
  getRentabilidadRealProducts,
  getRentabilidadRealProductsByLevel,
} from "./catalog";

describe("rentabilidad real catalog", () => {
  it("incluye los 7 productos disponibles de primera fase", () => {
    const available = getAvailableRentabilidadRealProducts();

    expect(available).toHaveLength(7);
    expect(available.map((product) => product.id)).toEqual(
      expect.arrayContaining([
        "RR_BASE",
        "RR_TRADES_JOBS",
        "RR_HOURS_PROJECTS",
        "RR_FIXED_COSTS_PRO",
        "RR_ASSETS_LIGHT",
        "RR_PRICE_SIMULATOR",
        "RR_ADVISOR_REVIEW",
      ]),
    );
  });

  it("incluye los 5 productos proximamente", () => {
    const comingSoon = getComingSoonRentabilidadRealProducts();

    expect(comingSoon).toHaveLength(5);
    expect(comingSoon.map((product) => product.id)).toEqual(
      expect.arrayContaining([
        "RR_STOCK_COMMERCE",
        "RR_MODULES_SPECIAL_REGIMES",
        "RR_SIMPLE_SL",
        "RR_SL_EMPLOYEES_PARTNERS",
        "RR_ADVANCED_COMPANY",
      ]),
    );
  });

  it("mantiene slugs unicos", () => {
    const slugs = getRentabilidadRealProducts().map((product) => product.slug);

    expect(new Set(slugs).size).toBe(slugs.length);
  });

  it("busca productos por slug", () => {
    expect(
      getRentabilidadRealProductBySlug("rentabilidad-real-base")?.id,
    ).toBe("RR_BASE");
  });

  it("filtra productos por nivel", () => {
    expect(getRentabilidadRealProductsByLevel(1).map((product) => product.id))
      .toContain("RR_BASE");
    expect(getRentabilidadRealProductsByLevel(4).map((product) => product.id))
      .toContain("RR_ASSETS_LIGHT");
  });
});
