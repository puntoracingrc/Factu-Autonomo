import { describe, expect, it } from "vitest";
import { calculateInvoiceListProfitability } from "./document-list-profitability";

describe("calculateInvoiceListProfitability", () => {
  it("calcula beneficio real y reserva de impuestos con costes vinculados", () => {
    expect(
      calculateInvoiceListProfitability({
        salesBase: 1000,
        salesIva: 210,
        linkedExpenseCost: 200,
        linkedDeductibleExpenseBase: 200,
        linkedDeductibleExpenseIva: 42,
        irpfPercent: 20,
      }),
    ).toEqual({
      realProfit: 800,
      estimatedIrpfBase: 800,
      profitAfterIrpfReserve: 640,
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
        linkedExpenseCost: 150,
        linkedDeductibleExpenseBase: 150,
        linkedDeductibleExpenseIva: 31.5,
        irpfPercent: 20,
      }),
    ).toEqual({
      realProfit: -50,
      estimatedIrpfBase: -50,
      profitAfterIrpfReserve: -50,
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
        linkedExpenseCost: 200,
        linkedDeductibleExpenseBase: 200,
        linkedDeductibleExpenseIva: 42,
        irpfPercent: 15,
        vatExempt: true,
      }),
    ).toMatchObject({
      realProfit: 800,
      estimatedIrpfBase: 800,
      profitAfterIrpfReserve: 680,
      ivaReserve: 0,
      irpfReserve: 120,
      taxReserve: 120,
    });
  });

  it("descuenta el coste no deducible del margen, pero no de las reservas", () => {
    expect(
      calculateInvoiceListProfitability({
        salesBase: 1000,
        salesIva: 210,
        linkedExpenseCost: 321,
        linkedDeductibleExpenseBase: 200,
        linkedDeductibleExpenseIva: 42,
        irpfPercent: 20,
      }),
    ).toEqual({
      realProfit: 679,
      estimatedIrpfBase: 800,
      profitAfterIrpfReserve: 519,
      ivaReserve: 168,
      irpfReserve: 160,
      taxReserve: 328,
    });
  });

  it("reserva IRPF aunque el coste no deducible deje pérdida económica", () => {
    expect(
      calculateInvoiceListProfitability({
        salesBase: 100,
        salesIva: 21,
        linkedExpenseCost: 121,
        linkedDeductibleExpenseBase: 0,
        linkedDeductibleExpenseIva: 0,
        irpfPercent: 20,
      }),
    ).toEqual({
      realProfit: -21,
      estimatedIrpfBase: 100,
      profitAfterIrpfReserve: -41,
      ivaReserve: 21,
      irpfReserve: 20,
      taxReserve: 41,
    });
  });
});
