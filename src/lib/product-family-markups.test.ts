import { describe, expect, it } from "vitest";
import {
  normalizeProductFamilyMarkupPercent,
  normalizeProductFamilyMarkupSettings,
  productFamilyMarkupPercent,
} from "./product-family-markups";

describe("product family markups", () => {
  it("normaliza porcentajes y evita duplicados por familia", () => {
    expect(normalizeProductFamilyMarkupSettings({
      rules: [
        { id: "a", family: "Motores", markupPercent: 30 },
        { id: "b", family: " motores ", markupPercent: 50 },
        { id: "c", family: "", markupPercent: 20 },
      ],
    })).toEqual({
      rules: [{ id: "a", family: "Motores", markupPercent: 30 }],
    });
  });

  it("limita porcentajes fuera de rango", () => {
    expect(normalizeProductFamilyMarkupPercent(-10)).toBe(0);
    expect(normalizeProductFamilyMarkupPercent(350)).toBe(300);
    expect(normalizeProductFamilyMarkupPercent(37.345)).toBe(37.35);
  });

  it("devuelve el incremento configurado para una familia", () => {
    expect(
      productFamilyMarkupPercent("persianas", {
        rules: [{ id: "1", family: "Persianas", markupPercent: 35 }],
      }),
    ).toBe(35);
    expect(productFamilyMarkupPercent("Motores", { rules: [] })).toBe(0);
  });
});
