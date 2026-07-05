import { describe, expect, it } from "vitest";
import { calculateInvoiceListProfitability } from "./document-list-profitability";

describe("calculateInvoiceListProfitability", () => {
  it("calcula beneficio real y reserva de impuestos con costes vinculados", () => {
    expect(
      calculateInvoiceListProfitability({
        salesBase: 1000,
        salesIva: 210,
        linkedExpenseBase: 200,
        linkedExpenseIva: 42,
        irpfPercent: 20,
      }),
    ).toEqual({
      realProfit: 800,
      ivaReserve: 168,
      irpfReserve: 160,
      taxReserve: 328,
    });
  });

  it("no reserva IRPF si el beneficio es negativo", () => {
    expect(
      calculateInvoiceListProfitability({
        salesBase: 100,
        salesIva: 21,
        linkedExpenseBase: 150,
        linkedExpenseIva: 31.5,
        irpfPercent: 20,
      }),
    ).toEqual({
      realProfit: -50,
      ivaReserve: 0,
      irpfReserve: 0,
      taxReserve: 0,
    });
  });

  it("respeta perfiles sin IVA", () => {
    expect(
      calculateInvoiceListProfitability({
        salesBase: 1000,
        salesIva: 210,
        linkedExpenseBase: 200,
        linkedExpenseIva: 42,
        irpfPercent: 15,
        vatExempt: true,
      }),
    ).toMatchObject({
      realProfit: 800,
      ivaReserve: 0,
      irpfReserve: 120,
      taxReserve: 120,
    });
  });
});
