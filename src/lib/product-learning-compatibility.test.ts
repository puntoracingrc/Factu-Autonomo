import { describe, expect, it } from "vitest";
import { productSummaryToDocumentDraftLine } from "./product-document-draft";
import {
  buildPurchaseProductSummaries,
  purchaseProductCatalogKeys,
  purchaseProductKey,
} from "./purchase-products";
import { normalizeLoadedData } from "./storage";
import { EMPTY_DATA, type Expense, type Product } from "./types";

describe("product learning compatibility", () => {
  it("conserva una ficha aprendida y agrupa escaneos historicos y futuros", () => {
    const learnedProduct = product("Panel PC43 acabado blanco", {
      key: purchaseProductKey("Panel Alu Blanco PC43"),
      aliases: [purchaseProductKey("PC43 PANEL BLANCO ALU")],
      family: "Cerramientos",
      subfamily: "Paneles exteriores",
      sku: "PC43-B",
      externalId: "catalog-42",
      supplierId: "supplier-a",
      supplierName: "Proveedor sintetico A",
      sales: {
        enabled: true,
        description: "Panel PC43 blanco instalado",
        unit: "m2",
        unitPrice: 95,
        ivaPercent: 21,
      },
      purchase: {
        enabled: true,
        description: "PC43 PANEL BLANCO ALU",
        unit: "m2",
        listPrice: 65,
        discountPercent: 40,
        netUnitCost: 39,
        ivaPercent: 21,
        supplierId: "supplier-a",
        supplierName: "Proveedor sintetico A",
        supplierReference: "PC43-B",
        purchaseToSaleFactor: 1,
      },
      calculation: { kind: "area", unit: "m2", roundingDecimals: 2 },
      attributes: [
        { key: "acabado", label: "Acabado", value: "Blanco" },
      ],
      notes: "Fixture sintetico de compatibilidad",
    });
    const historicalScan = expense("expense-old", "2026-07-01", [
      {
        id: "line-old",
        description: "Panel Alu Blanco PC43",
        quantity: 2,
        unit: "m2",
        unitPrice: 65,
        discountPercent: 40,
        ivaPercent: 21,
      },
    ]);
    const futureAliasScan = expense("expense-new", "2026-07-15", [
      {
        id: "line-new",
        description: "PC43 PANEL BLANCO ALU",
        catalogProduct: true,
        quantity: 1,
        unit: "m2",
        unitPrice: 70,
        discountPercent: 35,
        ivaPercent: 21,
      },
    ]);

    const loaded = normalizeLoadedData({
      ...EMPTY_DATA,
      products: [learnedProduct],
      expenses: [historicalScan, futureAliasScan],
    });
    const summaries = buildPurchaseProductSummaries(
      loaded.expenses,
      loaded.products,
    );

    expect(loaded.products).toHaveLength(1);
    expect(summaries).toHaveLength(1);
    expect(summaries[0]).toMatchObject({
      productId: "product-learned",
      key: purchaseProductKey("Panel Alu Blanco PC43"),
      aliases: [purchaseProductKey("PC43 PANEL BLANCO ALU")],
      name: "Panel PC43 acabado blanco",
      family: "Cerramientos",
      subfamily: "Paneles exteriores",
      source: "detected",
      sku: "PC43-B",
      externalId: "catalog-42",
      saleUnit: "m2",
      saleDescription: "Panel PC43 blanco instalado",
      saleUnitPrice: 95,
      saleIvaPercent: 21,
      purchaseUnit: "m2",
      purchaseDescription: "PC43 PANEL BLANCO ALU",
      purchaseListPrice: 65,
      purchaseDiscountPercent: 40,
      purchaseNetUnitCost: 39,
      purchaseSupplierReference: "PC43-B",
      purchaseToSaleFactor: 1,
      calculation: { kind: "area", unit: "m2", roundingDecimals: 2 },
      attributes: [
        {
          key: "acabado",
          label: "Acabado",
          value: "Blanco",
          unit: undefined,
        },
      ],
      notes: "Fixture sintetico de compatibilidad",
      purchaseCount: 2,
      totalQuantity: 3,
      totalBase: 123.5,
      averageUnitPrice: 42.25,
      lastUnitPrice: 45.5,
      minUnitPrice: 39,
      maxUnitPrice: 45.5,
      averagePvp: 67.5,
      lastPvp: 70,
      averageDiscountPercent: 37.5,
      lastDiscountPercent: 35,
      lastPurchaseDate: "2026-07-15",
      usualSupplier: {
        supplierId: "supplier-a",
        supplierName: "Proveedor sintetico A",
        count: 2,
        totalBase: 123.5,
        lastPurchaseDate: "2026-07-15",
      },
    });

    const catalogKeys = purchaseProductCatalogKeys(
      loaded.products,
      loaded.expenses,
    );
    expect(catalogKeys.size).toBeGreaterThan(2);
    expect(catalogKeys.has(purchaseProductKey("Panel Alu Blanco PC43"))).toBe(
      true,
    );
    expect(catalogKeys.has(purchaseProductKey("PC43 PANEL BLANCO ALU"))).toBe(
      true,
    );
    expect(catalogKeys.has(purchaseProductKey("PC43-B"))).toBe(true);

    expect(productSummaryToDocumentDraftLine(summaries[0])).toMatchObject({
      productKey: purchaseProductKey("Panel Alu Blanco PC43"),
      productId: "product-learned",
      productName: "Panel PC43 acabado blanco",
      basePrice: 95,
      priceSource: "sale",
      costUnitPrice: 39,
      costIvaPercent: 21,
      line: {
        description: "Panel PC43 blanco instalado",
        quantity: 1,
        unit: "m2",
        unitPrice: 95,
        ivaPercent: 21,
      },
    });
  });

  it("mantiene fichas detectadas antiguas basadas en pvp y coste", () => {
    const legacyProduct = product("Motor tubular aprendido", {
      key: purchaseProductKey("Motor radio GH50"),
      aliases: [purchaseProductKey("Motor tubular GH 50 radio")],
      family: "Automatismos",
      subfamily: "Motores tubulares",
      unit: "UD",
      pvp: 80,
      cost: 48,
      ivaPercent: 21,
      sales: undefined,
      purchase: undefined,
    });
    const newScan = expense("expense-legacy-followup", "2026-07-20", [
      {
        id: "line-legacy-followup",
        description: "Motor tubular GH 50 radio",
        catalogProduct: true,
        quantity: 1,
        unit: "ud",
        unitPrice: 82,
        discountPercent: 40,
        ivaPercent: 21,
      },
    ]);

    const loaded = normalizeLoadedData({
      ...EMPTY_DATA,
      products: [legacyProduct],
      expenses: [newScan],
    });
    const [summary] = buildPurchaseProductSummaries(
      loaded.expenses,
      loaded.products,
    );

    expect(loaded.products[0]).toMatchObject({
      id: "product-learned",
      family: "Automatismos",
      subfamily: "Motores tubulares",
      unit: "ud",
      pvp: 80,
      cost: 48,
      purchase: {
        enabled: true,
        unit: "ud",
        listPrice: 80,
        discountPercent: 40,
        netUnitCost: 48,
      },
    });
    expect(summary).toMatchObject({
      productId: "product-learned",
      name: "Motor tubular aprendido",
      family: "Automatismos",
      subfamily: "Motores tubulares",
      purchaseCount: 1,
      lastPvp: 82,
      lastUnitPrice: 49.2,
    });
    expect(productSummaryToDocumentDraftLine(summary)).toMatchObject({
      productId: "product-learned",
      priceSource: "providerTariff",
      basePrice: 82,
      line: {
        description: "Motor tubular aprendido",
        unit: "ud",
        unitPrice: 82,
      },
    });
  });

  it("mantiene oculto un producto y sus aliases sin borrar sus compras", () => {
    const hiddenProduct = product("Producto retirado", {
      key: purchaseProductKey("Producto detectado original"),
      aliases: [purchaseProductKey("Producto detectado alternativo")],
      hidden: true,
    });
    const originalScan = expense("expense-hidden-original", "2026-07-01", [
      {
        id: "line-hidden-original",
        description: "Producto detectado original",
        quantity: 1,
        unit: "ud",
        unitPrice: 20,
        ivaPercent: 21,
      },
    ]);
    const aliasScan = expense("expense-hidden-alias", "2026-07-02", [
      {
        id: "line-hidden-alias",
        description: "Producto detectado alternativo",
        catalogProduct: true,
        quantity: 1,
        unit: "ud",
        unitPrice: 22,
        ivaPercent: 21,
      },
    ]);

    const loaded = normalizeLoadedData({
      ...EMPTY_DATA,
      products: [hiddenProduct],
      expenses: [originalScan, aliasScan],
    });

    expect(loaded.products).toEqual([
      expect.objectContaining({ id: "product-learned", hidden: true }),
    ]);
    expect(loaded.expenses).toHaveLength(2);
    expect(loaded.expenses.flatMap((expense) => expense.purchaseLines ?? []))
      .toHaveLength(2);
    expect(
      buildPurchaseProductSummaries(loaded.expenses, loaded.products),
    ).toEqual([]);
    expect(
      purchaseProductCatalogKeys(loaded.products, loaded.expenses).has(
        purchaseProductKey("Producto detectado alternativo"),
      ),
    ).toBe(false);
  });
});

function product(name: string, patch: Partial<Product> = {}): Product {
  return {
    id: "product-learned",
    key: purchaseProductKey(name),
    aliases: [],
    name,
    family: "Familia sintetica",
    unit: "ud",
    source: "detected",
    createdAt: "2026-06-01T00:00:00.000Z",
    updatedAt: "2026-06-20T00:00:00.000Z",
    ...patch,
  };
}

function expense(
  id: string,
  date: string,
  purchaseLines: NonNullable<Expense["purchaseLines"]>,
): Expense {
  return {
    id,
    date,
    origin: "scan",
    businessKind: "purchase_invoice",
    supplierId: "supplier-a",
    supplierName: "Proveedor sintetico A",
    description: "Compra sintetica",
    amount: 100,
    ivaPercent: 21,
    category: "Material",
    paymentMethod: "Tarjeta",
    purchaseLines,
    createdAt: `${date}T00:00:00.000Z`,
  };
}
