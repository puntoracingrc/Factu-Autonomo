import { describe, expect, it } from "vitest";
import {
  PRODUCT_ATTRIBUTE_SUGGESTIONS,
  addProductAttributeLine,
  productAttributesFromText,
  productAttributesToText,
} from "./product-attributes";

describe("product attributes", () => {
  it("convierte texto libre en atributos estructurados", () => {
    expect(
      productAttributesFromText(
        "Talla: L\nColor = Blanco\nMarca:\nSin separador",
      ),
    ).toEqual([
      { key: "talla", label: "Talla", value: "L" },
      { key: "color", label: "Color", value: "Blanco" },
      { key: "marca", label: "Marca", value: "" },
    ]);
  });

  it("evita duplicar sugerencias ya añadidas", () => {
    expect(addProductAttributeLine("Talla: L", "Talla")).toBe("Talla: L");
    expect(addProductAttributeLine("Talla: L", "Color")).toBe(
      "Talla: L\nColor: ",
    );
  });

  it("incluye campos generales y de persianas", () => {
    expect(PRODUCT_ATTRIBUTE_SUGGESTIONS).toContain("Talla");
    expect(PRODUCT_ATTRIBUTE_SUGGESTIONS).toContain("GTIN/EAN");
    expect(PRODUCT_ATTRIBUTE_SUGGESTIONS).toContain("Lama");
    expect(PRODUCT_ATTRIBUTE_SUGGESTIONS).toContain("Motor");
  });

  it("serializa atributos para editar en textarea", () => {
    expect(
      productAttributesToText([
        { key: "largo", label: "Largo", value: "6", unit: "ml" },
        { key: "color", label: "Color", value: "Blanco" },
        { key: "marca", label: "Marca", value: "" },
      ]),
    ).toBe("Largo: 6 ml\nColor: Blanco\nMarca: ");
  });
});
