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

  it("encuentra primero la referencia exacta con espacios, guiones, números y R", () => {
    const variants = ["AL-PRA1-R-FL2", "AL-PRA1", "AL-PRA2-R", "AL-PRA1-R", "PVC-PRA1-R"];
    const products = [
      summary("Centralita radio de ejemplo", { purchaseCount: 20, saleUnitPrice: 100 }),
      ...variants.map((sku) => summary(
        "Suministro y colocación de carpintería practicable con vidrio aislante y descripción muy larga",
        { sku, productId: sku, saleUnitPrice: 0, purchaseCount: 0 },
      )),
    ];
    const index = buildDocumentProductSuggestionIndex(products);
    for (const query of ["AL-PRA1-R", "AL PRA1 R", "al pra1 r", "AL PRA 1 R", "ALPRA1R"]) {
      const results = searchDocumentProductSuggestions(index, query);
      expect(results[0].sku).toBe("AL-PRA1-R");
      expect(results.map((product) => product.sku)).toEqual(["AL-PRA1-R", "AL-PRA1-R-FL2"]);
    }
    expect(searchDocumentProductSuggestions(index, "AL PRA2 R")[0].sku).toBe("AL-PRA2-R");
    expect(searchDocumentProductSuggestions(index, "AL PRA99 R")).toEqual([]);
  });

  it("cubre una matriz sintética de 143 fichas sin perder ninguna referencia ni cambiar su imagen o precio", () => {
    const stems = [
      ...["PRA", "OSC"].flatMap((kind) => [
        ...[1, 2].flatMap((leaves) => ["", "-R", "-FS1", "-FL1", "-R-FL1", "-FL2", "-R-FL2", "-FSL2", "-FSL3"].map((suffix) => `${kind}${leaves}${suffix}`)),
        ...[3, 4].flatMap((leaves) => [`${kind}${leaves}`, `${kind}${leaves}-R`]),
      ]),
      "COR2", "COR2-R", "COR2-F1", "COR2-R-F1", "ABAT1", "ABAT1-R",
      "FIJO1", "FIJO1-R", "FIJO2", "FIJO2-R", "OSP1-F1", "OSP1-R-F1", "OSP1-F2", "OSP2", "OSP2-R", "OSP2-F1",
      ...["A", "O", "P", "C", "F1"].flatMap((kind) => [`BAND-P-${kind}`, `BAND-P-${kind}-R`]),
    ];
    expect(stems).toHaveLength(70);
    const references = [
      ...["AL", "PVC"].flatMap((material) => stems.map((stem) => `${material}-${stem}`)),
      "AL-FIJO-OSC", "PA1", "AG2119B",
    ];
    const products = references.map((sku, i) => summary(
      "Suministro y colocación de una ventana de ejemplo con una descripción suficientemente larga",
      { sku, productId: `synthetic-${i}`, purchaseCount: 0, saleUnitPrice: i + 1,
        imageDataUrl: `data:image/png;base64,synthetic-${i}` },
    ));
    const index = buildDocumentProductSuggestionIndex(products);
    for (const product of products) {
      for (const query of [product.sku!, product.sku!.replace(/-/g, " ")]) {
        const [result] = searchDocumentProductSuggestions(index, query);
        expect(result).toBe(product);
        expect(result.imageDataUrl).toBe(product.imageDataUrl);
        expect(result.saleUnitPrice).toBe(product.saleUnitPrice);
      }
    }
    expect(searchDocumentProductSuggestions(index, "1").length).toBeGreaterThan(0);
    expect(searchDocumentProductSuggestions(index, "")).toEqual([]);
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
