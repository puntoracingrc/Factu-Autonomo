import { describe, expect, it } from "vitest";
import {
  normalizeProductFamilyMarkupPercent,
  normalizeProductFamilyMarkupSettings,
  productFamilyMarkupPercent,
  renameProductFamilyInAppData,
} from "./product-family-markups";
import { EMPTY_DATA, type AppData, type Expense, type Product } from "./types";

function product(overrides: Partial<Product>): Product {
  return {
    id: "product-1",
    key: "motor-radio",
    aliases: [],
    name: "Motor radio",
    family: "Motores",
    unit: "ud",
    source: "manual",
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
    ...overrides,
  };
}

function dataWithProducts(products: Product[]): AppData {
  return {
    ...EMPTY_DATA,
    profile: {
      ...EMPTY_DATA.profile,
      productFamilyMarkups: {
        rules: [{ id: "rule-motors", family: "Motores", markupPercent: 30 }],
      },
    },
    products,
  };
}

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

  it("renombra productos y regla de margen en una sola copia de AppData", () => {
    const original = dataWithProducts([
      product({}),
      product({
        id: "family-marker",
        key: "__family__-motores",
        name: "Familia: Motores",
        hidden: true,
      }),
    ]);

    const result = renameProductFamilyInAppData(
      original,
      "Motores",
      "Automatismos",
      { now: "2026-07-11T01:30:00.000Z", createId: () => "created-id" },
    );

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.data).not.toBe(original);
    expect(original.products.every((entry) => entry.family === "Motores")).toBe(
      true,
    );
    expect(
      result.data.products.every((entry) => entry.family === "Automatismos"),
    ).toBe(true);
    expect(result.data.products[1].name).toBe("Familia: Automatismos");
    expect(result.data.profile.productFamilyMarkups?.rules).toEqual([
      {
        id: "rule-motors",
        family: "Automatismos",
        markupPercent: 30,
      },
    ]);
    expect(result.ruleMigrated).toBe(true);
  });

  it("rechaza una colisión sin cambiar productos ni perder reglas", () => {
    const original = dataWithProducts([
      product({}),
      product({
        id: "product-2",
        key: "persiana",
        name: "Persiana",
        family: "Persianas",
      }),
    ]);
    original.profile.productFamilyMarkups = {
      rules: [
        { id: "rule-motors", family: "Motores", markupPercent: 30 },
        { id: "rule-shutters", family: "Persianas", markupPercent: 18 },
      ],
    };

    const result = renameProductFamilyInAppData(
      original,
      "Motores",
      "persianas",
    );

    expect(result).toMatchObject({ ok: false, code: "collision", data: original });
    expect(original.products.map((entry) => entry.family)).toEqual([
      "Motores",
      "Persianas",
    ]);
    expect(original.profile.productFamilyMarkups.rules).toHaveLength(2);
  });

  it("crea el aprendizaje de catálogo para un producto aún solo detectado", () => {
    const detectedExpense: Expense = {
      id: "expense-1",
      date: "2026-07-10",
      origin: "scan",
      businessKind: "purchase_invoice",
      supplierName: "Proveedor prueba",
      description: "Compra de prueba",
      amount: 100,
      ivaPercent: 21,
      category: "Material",
      paymentMethod: "Tarjeta",
      purchaseLines: [
        {
          id: "line-1",
          description: "Motor radio prueba",
          quantity: 1,
          unit: "ud",
          unitPrice: 100,
          discountPercent: 10,
          ivaPercent: 21,
        },
      ],
      createdAt: "2026-07-10T00:00:00.000Z",
    };
    const original: AppData = {
      ...EMPTY_DATA,
      profile: {
        ...EMPTY_DATA.profile,
        productFamilyMarkups: {
          rules: [
            {
              id: "rule-detected",
              family: "Motores y electrónica",
              markupPercent: 25,
            },
          ],
        },
      },
      expenses: [detectedExpense],
      products: [],
    };

    const result = renameProductFamilyInAppData(
      original,
      "Motores y electrónica",
      "Automatismos",
      {
        now: "2026-07-11T01:30:00.000Z",
        createId: () => "learned-product",
      },
    );

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.productCount).toBe(1);
    expect(result.data.products).toHaveLength(1);
    expect(result.data.products[0]).toMatchObject({
      id: "learned-product",
      name: "Motor radio prueba",
      family: "Automatismos",
      source: "manual",
    });
    expect(result.data.profile.productFamilyMarkups?.rules[0]).toMatchObject({
      family: "Automatismos",
      markupPercent: 25,
    });
  });
});
