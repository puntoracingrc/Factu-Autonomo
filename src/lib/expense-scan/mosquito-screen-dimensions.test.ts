import { describe, expect, it } from "vitest";
import { recoverMosquitoScreenDimensionsFromPdf } from "./mosquito-screen-dimensions";
import type { ExpenseScanPurchaseLine } from "./schema";

const header = "REF. DESCRIPCIO UNIT. ALT cm. AMPLE cm. TOTAL PREU € DTE. IMPORT €";
const row = "SYN-SCREEN-1 Mosquitera enrollable azul de prueba 2 120,00 x 80,00 UD 72,50 20% 116,00";
const line: ExpenseScanPurchaseLine = {
  description: "Mosquitera enrollable azul de prueba",
  supplierReference: "SYN-SCREEN-1",
  sourceQuantity: 2,
  quantity: 2,
  chargeQuantity: 2,
  calculationBasis: "unit",
  unit: "UD",
  unitPrice: 72.5,
  discountPercent: 20,
  total: 116,
  ivaPercent: 21,
};

describe("recuperación de medidas ALT y AMPLE en la factura", () => {
  it("lee primero alto y luego ancho sin cambiar la línea facturada", () => {
    const text = [header, "Pedido sintético de prueba", row].join("\n");
    expect(recoverMosquitoScreenDimensionsFromPdf([line], text)).toEqual([
      { ...line, height: 120, width: 80, dimensionUnit: "cm" },
    ]);
  });

  it("se abstiene si falta la unidad de la cabecera o no cuadran los importes", () => {
    expect(recoverMosquitoScreenDimensionsFromPdf([line], row)).toEqual([line]);
    expect(recoverMosquitoScreenDimensionsFromPdf(
      [line], [header, row.replace("116,00", "118,00")].join("\n"),
    )).toEqual([line]);
  });

  it("no presta medidas de otra referencia ni de filas ambiguas", () => {
    expect(recoverMosquitoScreenDimensionsFromPdf(
      [line], [header, row.replace("SYN-SCREEN-1", "SYN-SCREEN-2")].join("\n"),
    )).toEqual([line]);
    expect(recoverMosquitoScreenDimensionsFromPdf(
      [line], [header, row, row.replace("80,00", "90,00")].join("\n"),
    )).toEqual([line]);
    expect(recoverMosquitoScreenDimensionsFromPdf(
      [line, { ...line }], [header, row].join("\n"),
    )).toEqual([line, line]);
  });
});
