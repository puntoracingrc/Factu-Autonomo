import { describe, expect, it } from "vitest";
import {
  DEFAULT_PROFILE,
  type BusinessProfile,
  type Document,
} from "@/lib/types";
import {
  buildInvoicePeriodSummaryModel,
  buildInvoicePeriodSummaryPdf,
} from "./invoice-period-summary-pdf";

const PROFILE: BusinessProfile = {
  ...DEFAULT_PROFILE,
  commercialName: "Taller Sintético",
  name: "Empresa Sintética SL",
  nif: "11111111H",
};

function invoice(
  id: string,
  number: string,
  date: string,
  customer: string,
  customerTaxId: string | undefined,
  unitPrice: number,
): Document {
  return {
    id,
    type: "factura",
    number,
    date,
    client: { name: customer, nif: customerTaxId },
    items: [
      {
        id: `${id}-line`,
        description: "Servicio",
        quantity: 1,
        unitPrice,
        ivaPercent: 21,
      },
    ],
    status: "pagado",
    createdAt: `${date}T08:00:00.000Z`,
    updatedAt: `${date}T08:00:00.000Z`,
  };
}

describe("invoice period summary PDF", () => {
  it("construye una relación con cliente, NIF e importes y totaliza al céntimo", () => {
    const model = buildInvoicePeriodSummaryModel(
      [
        invoice(
          "one",
          "F-2026-0001",
          "2026-05-03",
          "Cliente Uno",
          "22222222J",
          100,
        ),
        invoice(
          "two",
          "FR-2026-0001",
          "2026-05-07",
          "Cliente Dos",
          undefined,
          -20,
        ),
      ],
      PROFILE,
      "Mayo 2026",
    );

    expect(model).toMatchObject({
      businessName: "Taller Sintético",
      businessTaxId: "11111111H",
      periodLabel: "Mayo 2026",
      invoiceCount: 2,
      subtotal: 80,
      iva: 16.8,
      total: 96.8,
    });
    expect(model.rows).toEqual([
      expect.objectContaining({
        number: "F-2026-0001",
        customerName: "Cliente Uno",
        customerTaxId: "22222222J",
        total: 121,
      }),
      expect.objectContaining({
        number: "FR-2026-0001",
        customerName: "Cliente Dos",
        customerTaxId: "—",
        total: -24.2,
      }),
    ]);
  });

  it("genera un PDF A4 válido con propiedades del periodo", () => {
    const pdf = buildInvoicePeriodSummaryPdf(
      [
        invoice(
          "one",
          "F-2026-0001",
          "2026-05-03",
          "Cliente Uno",
          "22222222J",
          100,
        ),
      ],
      PROFILE,
      "Mayo 2026",
      new Date("2026-07-16T10:00:00.000Z"),
    );
    const bytes = new Uint8Array(pdf.output("arraybuffer"));

    expect(new TextDecoder().decode(bytes.slice(0, 4))).toBe("%PDF");
    expect(pdf.getNumberOfPages()).toBe(1);
    expect(bytes.byteLength).toBeGreaterThan(1_000);
    expect(pdf.output()).toContain("facturacion-autonomos.app");
  });
});
