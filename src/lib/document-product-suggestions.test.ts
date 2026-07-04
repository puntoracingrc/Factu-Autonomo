import { describe, expect, it } from "vitest";
import {
  applyDocumentProductToLine,
  buildDocumentProductSuggestionIndex,
  documentProductMentionQuery,
  documentProductSaleUnitPriceInfo,
  priceWithDocumentProductMarkup,
  replaceDocumentProductMention,
  searchDocumentProductSuggestions,
} from "./document-product-suggestions";
import { inferPurchaseProductFamily, purchaseProductKey } from "./purchase-products";
import type { LineItem } from "./types";
import type { PurchaseProductSummary } from "./purchase-products";

describe("document product suggestions", () => {
  it("solo activa busqueda de catalogo con @producto", () => {
    expect(documentProductMentionQuery("Instalacion motor Somfy")).toBeNull();
    expect(documentProductMentionQuery("Instalacion @motor Somfy")).toEqual({
      query: "motor Somfy",
      start: 12,
      end: 24,
    });
  });

  it("sustituye la mencion por el producto seleccionado", () => {
    expect(
      replaceDocumentProductMention(
        "Instalacion @motor",
        "Motor Persiana SUPER Gradhermetic",
      ),
    ).toBe("Instalacion Motor Persiana SUPER Gradhermetic");
    expect(replaceDocumentProductMention("@canal", "Canal PVC blanco")).toBe(
      "Canal PVC blanco",
    );
  });

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
      source: "providerTariff",
    });
  });

  it("prioriza el precio de venta del catálogo sobre la tarifa del proveedor", () => {
    const product = summary("Motor G50 Radio", {
      saleUnitPrice: 45,
      lastPvp: 30,
      lastUnitPrice: 18,
    });

    expect(documentProductSaleUnitPriceInfo(product)).toEqual({
      unitPrice: 45,
      source: "sale",
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
      saleUnit: "m2",
      saleDescription: "Cinta blanca instalada",
      ivaPercent: 21,
      saleIvaPercent: 10,
      saleUnitPrice: 12,
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
      basePrice: 12,
      priceSource: "sale",
      line: {
        description: "Cinta blanca instalada",
        quantity: 2,
        unit: "m2",
        unitPrice: 12,
        ivaPercent: 10,
      },
    });
    expect(priceWithDocumentProductMarkup(applied.basePrice, 20)).toBe(14.4);
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
