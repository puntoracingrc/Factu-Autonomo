import { describe, expect, it } from "vitest";
import { normalizeProductCatalogItem } from "./purchase-products";
import type { Product } from "./types";

describe("product unit normalization", () => {
  it("unifica und en ud sin perder la identidad ni el aprendizaje del producto", () => {
    const legacyProduct: Product = {
      id: "product-legacy-und",
      key: "motor tubular radio",
      aliases: ["motor radio proveedor"],
      name: "Motor tubular radio",
      family: "Motores",
      subfamily: "Radio",
      sku: "MTR-001",
      unit: "und",
      sales: {
        enabled: true,
        description: "Motor tubular con mando",
        unit: "UND",
        unitPrice: 95,
        ivaPercent: 21,
      },
      purchase: {
        enabled: true,
        description: "Motor tubular proveedor",
        unit: "und",
        listPrice: 70,
        discountPercent: 10,
        netUnitCost: 63,
        ivaPercent: 21,
        supplierId: "supplier-synthetic",
        supplierName: "Proveedor sintético",
        supplierReference: "REF-SYNTH-1",
        purchaseToSaleFactor: 1,
      },
      attributes: [
        { key: "potencia", label: "Potencia", value: "20", unit: "und" },
      ],
      notes: "Fixture sintético sin datos reales",
      source: "detected",
      createdAt: "2026-01-01T00:00:00.000Z",
      updatedAt: "2026-01-02T00:00:00.000Z",
    };

    const normalized = normalizeProductCatalogItem(legacyProduct);

    expect(normalized).toMatchObject({
      id: legacyProduct.id,
      key: legacyProduct.key,
      aliases: legacyProduct.aliases,
      name: legacyProduct.name,
      family: legacyProduct.family,
      subfamily: legacyProduct.subfamily,
      sku: legacyProduct.sku,
      unit: "ud",
      source: "detected",
      sales: {
        description: "Motor tubular con mando",
        unit: "ud",
        unitPrice: 95,
        ivaPercent: 21,
      },
      purchase: {
        description: "Motor tubular proveedor",
        unit: "ud",
        listPrice: 70,
        discountPercent: 10,
        netUnitCost: 63,
        supplierId: "supplier-synthetic",
        supplierName: "Proveedor sintético",
        supplierReference: "REF-SYNTH-1",
        purchaseToSaleFactor: 1,
      },
      attributes: [
        { key: "potencia", label: "Potencia", value: "20", unit: "ud" },
      ],
      notes: legacyProduct.notes,
      createdAt: legacyProduct.createdAt,
      updatedAt: legacyProduct.updatedAt,
    });
    expect(legacyProduct.unit).toBe("und");
    expect(legacyProduct.sales?.unit).toBe("UND");
    expect(legacyProduct.purchase?.unit).toBe("und");
  });
});
