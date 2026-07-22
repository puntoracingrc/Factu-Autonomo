import { describe, expect, it } from "vitest";
import {
  applyProductCatalogStructureOperation,
  renameProductFamilyInAppData,
} from "./product-catalog-structure";
import {
  buildPurchaseProductSummaries,
  purchaseProductKey,
} from "./purchase-products";
import { EMPTY_DATA, type AppData, type Expense, type Product } from "./types";

function product(name: string, patch: Partial<Product> = {}): Product {
  return {
    id: `product-${purchaseProductKey(name)}`,
    key: purchaseProductKey(name),
    aliases: [],
    name,
    family: "Motores y electrónica",
    subfamily: "Motores tubulares",
    unit: "ud",
    source: "detected",
    createdAt: "2026-07-01T00:00:00.000Z",
    updatedAt: "2026-07-01T00:00:00.000Z",
    ...patch,
  };
}

function expense(
  id: string,
  description: string,
  date = "2026-07-10",
): Expense {
  return {
    id,
    date,
    origin: "scan",
    businessKind: "purchase_invoice",
    supplierName: "Proveedor sintético",
    description: "Compra sintética",
    amount: 100,
    ivaPercent: 21,
    category: "Material",
    paymentMethod: "Tarjeta",
    purchaseLines: [
      {
        id: `${id}-line`,
        description,
        quantity: 1,
        unit: "ud",
        unitPrice: 100,
        discountPercent: 20,
        ivaPercent: 21,
      },
    ],
    createdAt: `${date}T00:00:00.000Z`,
  };
}

function appData(patch: Partial<AppData>): AppData {
  return {
    ...EMPTY_DATA,
    profile: { ...EMPTY_DATA.profile },
    ...patch,
  };
}

function ids() {
  let index = 0;
  return () => `created-product-${++index}`;
}

describe("product catalog structure", () => {
  it("renombra una subfamilia de forma atómica y conserva el aprendizaje", () => {
    const learned = product("Motor radio GH50", {
      aliases: [purchaseProductKey("Motor tubular GH 50 radio")],
      sku: "GH50",
      sales: {
        enabled: true,
        description: "Motor GH50 instalado",
        unit: "ud",
        unitPrice: 180,
        ivaPercent: 21,
      },
    });
    const originalExpense = expense(
      "expense-original",
      "Motor tubular GH 50 radio",
    );
    const original = appData({
      products: [
        learned,
        product("Marcador", {
          id: "subfamily-marker",
          key: "__subfamily__-motores-tubulares",
          name: "Subfamilia: Motores tubulares",
          hidden: true,
          notes:
            "Marcador interno para recordar una subfamilia creada a mano.",
        }),
      ],
      expenses: [originalExpense],
    });

    const result = applyProductCatalogStructureOperation(
      original,
      {
        type: "rename_subfamily",
        family: "Motores y electrónica",
        sourceSubfamily: "Motores tubulares",
        targetSubfamily: "Motores radio",
      },
      { now: "2026-07-20T00:00:00.000Z", createId: ids() },
    );

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.data.expenses).toBe(original.expenses);
    expect(result.data.products).toHaveLength(2);
    expect(result.data.products[0]).toMatchObject({
      id: learned.id,
      key: learned.key,
      aliases: learned.aliases,
      sku: "GH50",
      source: "manual",
      subfamily: "Motores radio",
      sales: learned.sales,
    });
    expect(result.data.products[1]).toMatchObject({
      id: "subfamily-marker",
      key: "__subfamily__-motores-tubulares",
      name: "Subfamilia: Motores radio",
      subfamily: "Motores radio",
    });

    const futureScan = expense(
      "expense-future",
      "Motor tubular GH 50 radio",
      "2026-07-21",
    );
    const summaries = buildPurchaseProductSummaries(
      [...result.data.expenses, futureScan],
      result.data.products,
    );
    expect(summaries).toHaveLength(1);
    expect(summaries[0]).toMatchObject({
      productId: learned.id,
      key: learned.key,
      aliases: learned.aliases,
      subfamily: "Motores radio",
      purchaseCount: 2,
    });
  });

  it("bloquea una colisión de subfamilia sin cambiar ningún dato", () => {
    const original = appData({
      products: [
        product("Motor uno", { subfamily: "Tubulares" }),
        product("Motor dos", { subfamily: "Radio" }),
      ],
    });

    const result = applyProductCatalogStructureOperation(original, {
      type: "rename_subfamily",
      family: "Motores y electrónica",
      sourceSubfamily: "Tubulares",
      targetSubfamily: "radio",
    });

    expect(result).toMatchObject({ ok: false, code: "collision", data: original });
    expect(original.products.map((item) => item.subfamily)).toEqual([
      "Tubulares",
      "Radio",
    ]);
  });

  it("fusiona familias explícitamente y materializa productos detectados", () => {
    const detectedExpense = expense("expense-detected", "Motor kit silencioso");
    const targetProduct = product("Central de control", {
      id: "target-product",
      family: "Automatismos",
      subfamily: "Centrales",
    });
    const original = appData({
      profile: {
        ...EMPTY_DATA.profile,
        productFamilyMarkups: {
          rules: [
            {
              id: "source-rule",
              family: "Motores y electrónica",
              markupPercent: 25,
            },
          ],
        },
      },
      products: [targetProduct],
      expenses: [detectedExpense],
    });

    const result = applyProductCatalogStructureOperation(
      original,
      {
        type: "merge_families",
        sourceFamily: "Motores y electrónica",
        targetFamily: "Automatismos",
      },
      { now: "2026-07-20T00:00:00.000Z", createId: ids() },
    );

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.ruleMigrated).toBe(true);
    expect(result.data.expenses).toBe(original.expenses);
    expect(result.data.products).toHaveLength(2);
    expect(result.data.products.every((item) => item.family === "Automatismos"))
      .toBe(true);
    expect(result.data.products.find((item) => item.id === "target-product"))
      .toEqual(targetProduct);
    expect(result.data.profile.productFamilyMarkups?.rules).toEqual([
      {
        id: "source-rule",
        family: "Automatismos",
        markupPercent: 25,
      },
    ]);
  });

  it("bloquea la fusión si las dos familias conservan reglas de margen", () => {
    const original = appData({
      profile: {
        ...EMPTY_DATA.profile,
        productFamilyMarkups: {
          rules: [
            { id: "source", family: "Motores", markupPercent: 25 },
            { id: "target", family: "Automatismos", markupPercent: 30 },
          ],
        },
      },
      products: [
        product("Motor", { family: "Motores" }),
        product("Central", { family: "Automatismos" }),
      ],
    });

    const result = applyProductCatalogStructureOperation(original, {
      type: "merge_families",
      sourceFamily: "Motores",
      targetFamily: "Automatismos",
    });

    expect(result).toMatchObject({
      ok: false,
      code: "margin_rule",
      data: original,
    });
    expect(original.profile.productFamilyMarkups?.rules).toHaveLength(2);
  });

  it("retira una familia sin borrar productos ni compras", () => {
    const detectedExpense = expense("expense-detected", "Motor kit compacto");
    const hiddenLearned = product("Motor oculto", {
      id: "hidden-product",
      aliases: [purchaseProductKey("Motor oculto alternativo")],
      hidden: true,
    });
    const marker = product("Marcador familia", {
      id: "family-marker",
      key: "family motores electronica",
      name: "Familia: Motores y electrónica",
      subfamily: undefined,
      hidden: true,
      notes: "Marcador interno para recordar una familia creada a mano.",
    });
    const original = appData({
      products: [hiddenLearned, marker],
      expenses: [detectedExpense],
    });

    const result = applyProductCatalogStructureOperation(
      original,
      { type: "remove_family", family: "Motores y electrónica" },
      { now: "2026-07-20T00:00:00.000Z", createId: ids() },
    );

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.data.expenses).toBe(original.expenses);
    expect(result.data.expenses).toHaveLength(1);
    expect(result.data.products).toHaveLength(2);
    expect(result.data.products.some((item) => item.id === "family-marker"))
      .toBe(false);
    expect(result.data.products).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: "hidden-product",
          aliases: hiddenLearned.aliases,
          family: "Sin familia",
          subfamily: undefined,
          hidden: true,
        }),
        expect.objectContaining({
          id: "created-product-1",
          key: purchaseProductKey("Motor kit compacto"),
          family: "Sin familia",
          subfamily: undefined,
        }),
      ]),
    );
  });

  it("mueve una selección completa en una sola transición", () => {
    const learned = product("Motor aprendido", {
      aliases: [purchaseProductKey("Motor aprendido alias")],
    });
    const detectedExpense = expense("expense-new", "Kit tornillos reforzado");
    const original = appData({
      products: [learned],
      expenses: [detectedExpense],
    });
    const summaries = buildPurchaseProductSummaries(
      original.expenses,
      original.products,
    );

    const result = applyProductCatalogStructureOperation(
      original,
      {
        type: "move_products",
        productKeys: summaries.map((item) => item.key),
        targetFamily: "Instalación",
        targetSubfamily: "Kits",
      },
      { now: "2026-07-20T00:00:00.000Z", createId: ids() },
    );

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.productCount).toBe(2);
    expect(result.data.expenses).toBe(original.expenses);
    expect(result.data.products).toHaveLength(2);
    expect(result.data.products).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: learned.id,
          key: learned.key,
          aliases: learned.aliases,
          family: "Instalación",
          subfamily: "Kits",
        }),
        expect.objectContaining({
          key: purchaseProductKey("Kit tornillos reforzado"),
          family: "Instalación",
          subfamily: "Kits",
        }),
      ]),
    );
  });

  it("fusiona subfamilias solo cuando el destino existe", () => {
    const learned = product("Motor tubular", {
      aliases: [purchaseProductKey("Motor tubular aprendido")],
      subfamily: "Tubulares",
    });
    const original = appData({
      products: [
        learned,
        product("Motor radio", {
          id: "radio-product",
          subfamily: "Radio",
        }),
      ],
      expenses: [expense("expense-tubular", "Motor tubular aprendido")],
    });

    const result = applyProductCatalogStructureOperation(original, {
      type: "merge_subfamilies",
      family: "Motores y electrónica",
      sourceSubfamily: "Tubulares",
      targetSubfamily: "Radio",
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.data.expenses).toBe(original.expenses);
    expect(result.data.products).toHaveLength(2);
    expect(result.data.products[0]).toMatchObject({
      id: learned.id,
      key: learned.key,
      aliases: learned.aliases,
      subfamily: "Radio",
    });
    expect(result.data.products[1]).toEqual(original.products[1]);
  });

  it("retira una subfamilia sin sacar sus productos de la familia", () => {
    const learned = product("Motor tubular", { subfamily: "Tubulares" });
    const original = appData({
      products: [
        learned,
        product("Marcador subfamilia", {
          id: "subfamily-marker-normalized",
          key: "subfamily motores tubulares",
          name: "Subfamilia: Tubulares",
          subfamily: "Tubulares",
          hidden: true,
          notes:
            "Marcador interno para recordar una subfamilia creada a mano.",
        }),
      ],
    });

    const result = applyProductCatalogStructureOperation(original, {
      type: "remove_subfamily",
      family: "Motores y electrónica",
      subfamily: "Tubulares",
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.data.products).toHaveLength(1);
    expect(result.data.products[0]).toMatchObject({
      id: learned.id,
      family: "Motores y electrónica",
      subfamily: undefined,
    });
  });

  it("bloquea retirar una familia con regla de margen", () => {
    const original = appData({
      profile: {
        ...EMPTY_DATA.profile,
        productFamilyMarkups: {
          rules: [
            {
              id: "protected-rule",
              family: "Motores y electrónica",
              markupPercent: 30,
            },
          ],
        },
      },
      products: [product("Motor protegido")],
    });

    const result = applyProductCatalogStructureOperation(original, {
      type: "remove_family",
      family: "Motores y electrónica",
    });

    expect(result).toMatchObject({
      ok: false,
      code: "margin_rule",
      data: original,
    });
    expect(original.products[0].family).toBe("Motores y electrónica");
  });

  it("rechaza una selección obsoleta sin materializar productos", () => {
    const original = appData({ products: [product("Motor vigente")] });

    const result = applyProductCatalogStructureOperation(original, {
      type: "move_products",
      productKeys: [purchaseProductKey("Producto que ya no existe")],
      targetFamily: "Automatismos",
    });

    expect(result).toMatchObject({
      ok: false,
      code: "not_found",
      data: original,
    });
    expect(original.products).toHaveLength(1);
  });

  it("mantiene compatible el contrato público de renombrado de familias", () => {
    const original = appData({
      products: [
        product("Motor aprendido", {
          aliases: [purchaseProductKey("Motor aprendido alias")],
        }),
      ],
    });

    const result = renameProductFamilyInAppData(
      original,
      "Motores y electrónica",
      "Automatismos",
      { now: "2026-07-20T00:00:00.000Z", createId: ids() },
    );

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.data.products[0]).toMatchObject({
      id: original.products[0].id,
      key: original.products[0].key,
      aliases: original.products[0].aliases,
      family: "Automatismos",
      source: "detected",
    });
  });
});
