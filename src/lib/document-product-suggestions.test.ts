import { describe, expect, it } from "vitest";
import {
  applyDocumentProductToLine,
  buildDocumentProductSuggestionIndex,
  documentProductSaleUnitPriceInfo,
  priceWithDocumentProductMarkup,
  searchDocumentProductSuggestions,
} from "./document-product-suggestions";
import { inferPurchaseProductFamily, purchaseProductKey } from "./purchase-products";
import type { LineItem } from "./types";
import type { PurchaseProductSummary } from "./purchase-products";

describe("document product suggestions", () => {
  it("busca por nombre, familia y proveedor sin renderizar todo el catálogo", () => {
    const products = [
      summary("Panel blanco PC43", {
        family: "Persianas y accesorios",
        usualSupplier: supplier("METALURGICA ARANDES S.L."),
      }),
      ...Array.from({ length: 50 }, (_, index) =>
        summary(`Producto sin relacion ${index}`, {
          family: "Otros",
          usualSupplier: supplier("Proveedor Demo"),
        }),
      ),
    ];

    const results = searchDocumentProductSuggestions(
      buildDocumentProductSuggestionIndex(products),
      "arandes panel",
      3,
    );

    expect(results).toHaveLength(1);
    expect(results[0].name).toBe("Panel blanco PC43");
  });

  it("usa el PVP de tarifa antes que el coste con descuento", () => {
    const product = summary("Motor G50 Radio", {
      lastPvp: 30,
      averagePvp: 28,
      lastUnitPrice: 18,
      averageUnitPrice: 17,
    });

    expect(documentProductSaleUnitPriceInfo(product)).toEqual({
      unitPrice: 30,
      source: "pvp",
    });
  });

  it("avisa cuando solo puede proponer el coste porque no hay PVP", () => {
    const product = summary("Servicio puntual", {
      lastPvp: 0,
      averagePvp: 0,
      lastUnitPrice: 42,
      averageUnitPrice: 40,
    });

    expect(documentProductSaleUnitPriceInfo(product)).toEqual({
      unitPrice: 42,
      source: "cost",
    });
  });

  it("rellena una línea editable con precio base y permite aplicar incremento", () => {
    const product = summary("Cinta 14 mm", {
      unit: "RL",
      ivaPercent: 21,
      lastPvp: 10,
    });
    const currentLine: LineItem = {
      id: "line-1",
      description: "cin",
      quantity: 2,
      unit: "ud",
      unitPrice: 0,
      ivaPercent: 10,
    };

    const applied = applyDocumentProductToLine(product, currentLine, {
      defaultIva: 21,
      vatExempt: false,
    });

    expect(applied).toMatchObject({
      basePrice: 10,
      priceSource: "pvp",
      line: {
        description: "Cinta 14 mm",
        quantity: 2,
        unit: "RL",
        unitPrice: 10,
        ivaPercent: 21,
      },
    });
    expect(priceWithDocumentProductMarkup(applied.basePrice, 20)).toBe(12);
  });
});

function supplier(supplierName: string) {
  return {
    supplierName,
    count: 1,
    totalBase: 10,
    lastPurchaseDate: "2026-07-01",
  };
}

function summary(
  name: string,
  patch: Partial<PurchaseProductSummary> = {},
): PurchaseProductSummary {
  return {
    key: purchaseProductKey(name),
    aliases: [],
    name,
    family: inferPurchaseProductFamily(name),
    source: "detected",
    unit: "ud",
    purchaseCount: 1,
    totalQuantity: 1,
    totalBase: 10,
    averageUnitPrice: 8,
    lastUnitPrice: 8,
    minUnitPrice: 8,
    maxUnitPrice: 8,
    averagePvp: 10,
    lastPvp: 10,
    averageDiscountPercent: 20,
    lastDiscountPercent: 20,
    ivaPercent: 21,
    lastPurchaseDate: "2026-07-01",
    usualSupplier: supplier("Proveedor"),
    suppliers: [supplier("Proveedor")],
    ...patch,
  };
}
