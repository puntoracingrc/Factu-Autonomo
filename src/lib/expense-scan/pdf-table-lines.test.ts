import { describe, expect, it } from "vitest";
import {
  extractPdfScanHintsFromPdfItems,
  extractStilCondalPurchaseLinesFromPdfItems,
} from "./pdf-table-lines";

function item(page: number, x: number, y: number, text: string) {
  return { page, x, y, text };
}

describe("extractStilCondalPurchaseLinesFromPdfItems", () => {
  it("devuelve texto de filas como ayuda general para la IA", () => {
    const result = extractPdfScanHintsFromPdfItems([
      item(1, 2, 2, "Proveedor Demo"),
      item(1, 1, 12, "Artículo"),
      item(1, 8, 12, "Importe"),
      item(1, 1, 13, "REF-1"),
      item(1, 5, 13, "Producto repetido"),
      item(1, 8, 13, "10,00"),
    ]);

    expect(result.textRows).toContain("Proveedor Demo");
    expect(result.textRows).toContain("REF-1 Producto repetido 10,00");
  });

  it("extrae filas repetidas de una factura Stil Condal sin agruparlas", () => {
    const items = [
      item(1, 2, 2, "STIL CONDAL, S.A."),
      item(1, 2, 7, "Factura n° :"),
      item(1, 6, 7, "FC000000001"),
      item(1, 1, 12, "Artículo"),
      item(1, 21, 12, "Cant."),
      item(1, 35, 12, "Importe"),

      item(1, 0.87, 16.74, "AUTC45"),
      item(1, 3.72, 16.76, "AU"),
      item(1, 4.35, 16.76, "TOBLOCANTE C-45 SOLO LAMAS Blan "),
      item(1, 20.84, 16.74, " 1"),
      item(1, 22.58, 16.74, " 230,2"),
      item(1, 24.22, 16.74, " 256,0"),
      item(1, 26.24, 16.74, " 6,"),
      item(1, 26.68, 16.74, "11"),
      item(1, 28.04, 16.74, " 159,00"),
      item(1, 30.13, 16.74, " 25,00"),
      item(1, 32.11, 16.74, "119,25"),
      item(1, 34.47, 16.74, " 728,62"),

      item(1, 0.87, 20.52, "AUTC45"),
      item(1, 3.72, 20.53, "AU"),
      item(1, 4.35, 20.53, "TOBLOCANTE C-45 SOLO LAMAS Blan "),
      item(1, 20.84, 20.52, " 1"),
      item(1, 22.58, 20.52, " 245,2"),
      item(1, 24.22, 20.52, " 217,0"),
      item(1, 26.22, 20.52, " 5,50"),
      item(1, 28.04, 20.52, " 159,00"),
      item(1, 30.13, 20.52, " 25,00"),
      item(1, 32.11, 20.52, "119,25"),
      item(1, 34.47, 20.52, " 655,88"),

      item(1, 1, 41, " IMPORTE :"),
    ];

    const result = extractStilCondalPurchaseLinesFromPdfItems(items);

    expect(result.lines).toHaveLength(2);
    expect(result.lines[0]).toMatchObject({
      supplierReference: "AUTC45",
      description: "AU TOBLOCANTE C-45 SOLO LAMAS Blan",
      sourceQuantity: 1,
      quantity: 6.11,
      chargeQuantity: 6.11,
      calculationBasis: "m2",
      unit: "M2",
      width: 230.2,
      height: 256,
      unitPrice: 159,
      discountPercent: 25,
      netUnitPrice: 119.25,
      total: 728.62,
      calculationFormula: "m2*netPrice",
      calculationExpectedTotal: 728.62,
      productGroupIndex: 1,
      productRole: "main_product",
    });
    expect(result.lines[1]).toMatchObject({
      supplierReference: "AUTC45",
      sourceQuantity: 1,
      quantity: 5.5,
      calculationBasis: "m2",
      total: 655.88,
      productGroupIndex: 2,
      productRole: "main_product",
    });
  });

  it("clasifica M2, ML y UD según las columnas de medidas", () => {
    const items = [
      item(1, 2, 2, "STIL CONDAL, S.A."),
      item(1, 2, 7, "Factura n° :"),
      item(1, 1, 12, "Artículo"),
      item(1, 35, 12, "Importe"),

      item(1, 0.87, 16, "AUTC45"),
      item(1, 4.35, 16, "AUTOBLOCANTE C-45 SOLO LAMAS Blan"),
      item(1, 20.84, 16, "1"),
      item(1, 22.58, 16, "230,2"),
      item(1, 24.22, 16, "256,0"),
      item(1, 26.24, 16, "6,11"),
      item(1, 28.04, 16, "159,00"),
      item(1, 30.13, 16, "25,00"),
      item(1, 32.11, 16, "119,25"),
      item(1, 34.47, 16, "728,62"),

      item(1, 0.87, 18, "005099004"),
      item(1, 4.35, 18, "GUIA X-25 + C/GOMA BLAN"),
      item(1, 20.84, 18, "2"),
      item(1, 24.22, 18, "251,0"),
      item(1, 26.24, 18, "5,10"),
      item(1, 28.04, 18, "3,96"),
      item(1, 30.13, 18, "25,00"),
      item(1, 32.11, 18, "2,97"),
      item(1, 34.47, 18, "15,15"),

      item(1, 0.87, 20, "007002009"),
      item(1, 4.35, 20, "CAPSULA REG. ALUMINIO 60 OCT. (ZAMAK)"),
      item(1, 20.84, 20, "1"),
      item(1, 26.24, 20, "1,00"),
      item(1, 28.04, 20, "8,83"),
      item(1, 32.11, 20, "8,83"),
      item(1, 34.47, 20, "8,83"),

      item(1, 0.87, 22, "004001012"),
      item(1, 4.35, 22, "EJE METALICO 60 X 0,8 OCTOGONAL"),
      item(1, 20.84, 22, "1"),
      item(1, 24.22, 22, "252,7"),
      item(1, 26.24, 22, "2,55"),
      item(1, 28.04, 22, "8,00"),
      item(1, 30.13, 22, "25,00"),
      item(1, 32.11, 22, "6,00"),
      item(1, 34.47, 22, "15,30"),
      item(1, 1, 41, "TOTAL FACTURA"),
    ];

    const result = extractStilCondalPurchaseLinesFromPdfItems(items);

    expect(result.lines).toHaveLength(4);
    expect(result.lines[0]).toMatchObject({
      sourceQuantity: 1,
      quantity: 6.11,
      chargeQuantity: 6.11,
      calculationBasis: "m2",
      unit: "M2",
      width: 230.2,
      height: 256,
      netUnitPrice: 119.25,
      calculationFormula: "m2*netPrice",
    });
    expect(result.lines[1]).toMatchObject({
      supplierReference: "005099004",
      sourceQuantity: 2,
      quantity: 5.1,
      chargeQuantity: 5.1,
      calculationBasis: "ml",
      unit: "ML",
      length: 251,
      unitPrice: 3.96,
      discountPercent: 25,
      netUnitPrice: 2.97,
      total: 15.15,
      calculationFormula: "ml*netPrice",
      calculationExpectedTotal: 15.15,
      productGroupIndex: 1,
      productRole: "component",
    });
    expect(result.lines[2]).toMatchObject({
      supplierReference: "007002009",
      sourceQuantity: 1,
      quantity: 1,
      chargeQuantity: 1,
      calculationBasis: "unit",
      unit: "UD",
      unitPrice: 8.83,
      netUnitPrice: 8.83,
      total: 8.83,
      calculationFormula: "units*netPrice",
      productGroupIndex: 1,
      productRole: "component",
    });
    expect(result.lines[3]).toMatchObject({
      supplierReference: "004001012",
      sourceQuantity: 1,
      quantity: 2.55,
      chargeQuantity: 2.55,
      calculationBasis: "ml",
      unit: "ML",
      length: 252.7,
      unitPrice: 8,
      discountPercent: 25,
      netUnitPrice: 6,
      total: 15.3,
      calculationFormula: "ml*netPrice",
      calculationExpectedTotal: 15.3,
      productGroupIndex: 1,
      productRole: "component",
    });
  });

  it("une continuaciones de descripción sin crear líneas falsas", () => {
    const items = [
      item(1, 2, 2, "STIL CONDAL, S.A."),
      item(1, 2, 7, "Factura n° :"),
      item(1, 1, 12, "Artículo"),
      item(1, 35, 12, "Importe"),
      item(1, 0.87, 15.95, "105080014"),
      item(1, 3.72, 15.95, "EMISOR"),
      item(1, 4.75, 15.95, " A-OK 6 CANALES PREMIUM BLANCO (AC123-06 "),
      item(1, 20.84, 15.95, " 1"),
      item(1, 26.22, 15.95, " 1,00"),
      item(1, 28.49, 15.95, " 39,48"),
      item(1, 30.13, 15.95, " 25,00"),
      item(1, 32.42, 15.95, " 29,61"),
      item(1, 34.69, 15.95, " 29,61"),
      item(1, 3.72, 16.61, "WHITE) "),
      item(1, 1, 41, "TOTAL FACTURA"),
    ];

    const result = extractStilCondalPurchaseLinesFromPdfItems(items);

    expect(result.lines).toHaveLength(1);
    expect(result.lines[0].description).toBe(
      "EMISOR A-OK 6 CANALES PREMIUM BLANCO (AC123-06 WHITE)",
    );
  });

  it("no pega el pie de página del PDF a la última línea", () => {
    const items = [
      item(1, 2, 2, "STIL CONDAL, S.A."),
      item(1, 2, 7, "Factura n° :"),
      item(1, 1, 12, "Artículo"),
      item(1, 35, 12, "Importe"),
      item(1, 0.87, 15.95, "004001012"),
      item(1, 3.72, 15.95, "EJE"),
      item(1, 4.75, 15.95, "METALICO 60 X 0,8 OCTOGONAL"),
      item(1, 20.84, 15.95, "1"),
      item(1, 28.49, 15.95, "8,00"),
      item(1, 30.13, 15.95, "25,00"),
      item(1, 32.42, 15.95, "6,00"),
      item(1, 34.69, 15.95, "6,00"),
      item(1, 1.4, 22.5, "Av. la Ferreria, 2 08110 MONTCADA I REIXAC"),
      item(1, 1, 41, "TOTAL FACTURA"),
    ];

    const result = extractStilCondalPurchaseLinesFromPdfItems(items);

    expect(result.lines).toHaveLength(1);
    expect(result.lines[0].description).toBe(
      "EJE METALICO 60 X 0,8 OCTOGONAL",
    );
  });
});
