import { describe, expect, it } from "vitest";
import {
  EMPTY_PRODUCT_FORM_DRAFT,
  findProductDuplicateCandidates,
  productFormDraftFromSummary,
  productFormHasChanges,
} from "./product-form";
import {
  clearProductCatalogEditRequest,
  getProductCatalogEditRequest,
  saveProductCatalogEditRequest,
} from "./product-form-navigation";
import {
  buildPurchaseProductSummaries,
  purchaseProductKey,
} from "./purchase-products";
import type { Product } from "./types";

function product(name: string, patch: Partial<Product> = {}): Product {
  return {
    id: `product-${purchaseProductKey(name)}`,
    key: purchaseProductKey(name),
    aliases: [],
    name,
    family: "Familia sintética",
    source: "manual",
    createdAt: "2026-07-01T00:00:00.000Z",
    updatedAt: "2026-07-01T00:00:00.000Z",
    ...patch,
  };
}

describe("product form contract", () => {
  it("crea el mismo borrador para editar una ficha aprendida", () => {
    const learned = product("Motor detectado GH50", {
      source: "detected",
      aliases: [purchaseProductKey("Motor radio GH 50")],
      subfamily: "Motores",
      sales: {
        enabled: true,
        description: "Motor GH50 instalado",
        unit: "ud",
        unitPrice: 120,
        ivaPercent: 21,
      },
      purchase: {
        enabled: true,
        description: "MOTOR GH50 RADIO",
        unit: "ud",
        listPrice: 80,
        discountPercent: 25,
        netUnitCost: 60,
        supplierName: "Proveedor sintético",
        supplierReference: "GH50",
      },
      notes: "Aprendizaje sintético",
    });
    const [summary] = buildPurchaseProductSummaries([], [learned]);

    expect(productFormDraftFromSummary(summary, "Color: Blanco")).toEqual({
      ...EMPTY_PRODUCT_FORM_DRAFT,
      name: "Motor detectado GH50",
      family: "Familia sintética",
      subfamily: "Motores",
      saleDescription: "Motor GH50 instalado",
      salePrice: "120",
      supplierName: "Proveedor sintético",
      supplierReference: "GH50",
      purchaseDescription: "MOTOR GH50 RADIO",
      purchaseListPrice: "80",
      purchaseDiscountPercent: "25",
      purchaseNetUnitCost: "60",
      attributesText: "Color: Blanco",
      notes: "Aprendizaje sintético",
    });
  });

  it("detecta cambios sin normalizar silenciosamente lo escrito", () => {
    expect(
      productFormHasChanges(EMPTY_PRODUCT_FORM_DRAFT, {
        ...EMPTY_PRODUCT_FORM_DRAFT,
        name: " Motor ",
      }),
    ).toBe(true);
    expect(
      productFormHasChanges(
        EMPTY_PRODUCT_FORM_DRAFT,
        EMPTY_PRODUCT_FORM_DRAFT,
      ),
    ).toBe(false);
  });

  it("propone duplicados por clave, alias, SKU o referencia sin fusionarlos", () => {
    const candidates = buildPurchaseProductSummaries(
      [],
      [
        product("Motor tubular GH50", {
          aliases: [purchaseProductKey("Motor radio GH50")],
          sku: "MOT-50",
          purchase: {
            enabled: true,
            supplierReference: "REF-50",
          },
        }),
        product("Central electrónica"),
      ],
    );

    expect(
      findProductDuplicateCandidates(
        {
          ...EMPTY_PRODUCT_FORM_DRAFT,
          name: "Motor radio GH50",
          sku: "mot-50",
          supplierReference: "ref-50",
        },
        candidates,
      ),
    ).toEqual([
      expect.objectContaining({
        name: "Motor tubular GH50",
        reasons: expect.arrayContaining([
          "alias",
          "sku",
          "supplier_reference",
        ]),
      }),
    ]);
    expect(candidates).toHaveLength(2);
  });

  it("transporta una solicitud efímera para abrir una ficha existente", () => {
    const values = new Map<string, string>();
    const storage = {
      getItem: (key: string) => values.get(key) ?? null,
      setItem: (key: string, value: string) => values.set(key, value),
      removeItem: (key: string) => values.delete(key),
    };

    expect(saveProductCatalogEditRequest("product-key", storage)).toBe(true);
    expect(getProductCatalogEditRequest(storage)).toBe("product-key");
    clearProductCatalogEditRequest(storage);
    expect(getProductCatalogEditRequest(storage)).toBeNull();
  });
});
