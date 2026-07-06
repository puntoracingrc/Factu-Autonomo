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
      item(1, 6, 7, "FC121021478"),
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
      quantity: 6.11,
      unit: "M2",
      unitPrice: 159,
      discountPercent: 25,
      total: 728.62,
    });
    expect(result.lines[1]).toMatchObject({
      supplierReference: "AUTC45",
      quantity: 5.5,
      total: 655.88,
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
});
