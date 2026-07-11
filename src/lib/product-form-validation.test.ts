import { describe, expect, it } from "vitest";
import {
  parseOptionalProductNumber,
  validateProductNumericInputs,
} from "./product-form-validation";

const validInputs = {
  salePrice: "120,50",
  saleIvaPercent: "21",
  purchaseListPrice: "100",
  purchaseDiscountPercent: "10,5",
  purchaseNetUnitCost: "89,50",
};

describe("product form numeric validation", () => {
  it("acepta decimales españoles y permite campos opcionales vacíos", () => {
    expect(parseOptionalProductNumber(" 12,50 ")).toBe(12.5);
    expect(parseOptionalProductNumber("")).toBeUndefined();

    const result = validateProductNumericInputs({
      ...validInputs,
      salePrice: "",
      purchaseNetUnitCost: "",
    });

    expect(result.ok).toBe(true);
    expect(result.values.salePrice).toBeUndefined();
    expect(result.values.saleIvaPercent).toBe(21);
  });

  it("bloquea texto o notación no decimal y señala el primer campo", () => {
    const result = validateProductNumericInputs({
      ...validInputs,
      salePrice: "12 euros",
      purchaseListPrice: "1e3",
    });

    expect(result.ok).toBe(false);
    expect(result.firstInvalidField).toBe("salePrice");
    expect(result.errors.salePrice).toContain("precio de venta válido");
    expect(result.errors.purchaseListPrice).toContain("tarifa de proveedor válida");
  });

  it("rechaza importes negativos y porcentajes fuera de rango", () => {
    const result = validateProductNumericInputs({
      ...validInputs,
      salePrice: "-1",
      saleIvaPercent: "101",
      purchaseDiscountPercent: "-0,5",
      purchaseNetUnitCost: "-10",
    });

    expect(result.ok).toBe(false);
    expect(result.errors).toMatchObject({
      salePrice: expect.any(String),
      saleIvaPercent: expect.any(String),
      purchaseDiscountPercent: expect.any(String),
      purchaseNetUnitCost: expect.any(String),
    });
  });
});
