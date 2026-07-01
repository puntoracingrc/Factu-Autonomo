import { describe, expect, it } from "vitest";
import { buildPurchaseProductSummaries, inferPurchaseProductFamily } from "./purchase-products";
import type { Document, Expense } from "./types";

describe("purchase products", () => {
  it("agrupa líneas escaneadas y conserva proveedor, precio, descuento y PVP detectado", () => {
    const expenses = [
      expense("1", "2026-07-01", "Arandes", [
        {
          id: "l1",
          description: "Motor G50 Radio SH",
          quantity: 2,
          unit: "ud",
          unitPrice: 30,
          discountPercent: 10,
          ivaPercent: 21,
        },
      ]),
      expense("2", "2026-07-10", "Arandes", [
        {
          id: "l2",
          description: "Motor G50 Radio SH",
          quantity: 1,
          unit: "ud",
          unitPrice: 36,
          discountPercent: 5,
          ivaPercent: 21,
        },
      ]),
    ];
    const documents = [
      document("factura", "2026-07-12", "Motor G50 Radio SH", 75),
      document("presupuesto", "2026-07-14", "Motor G50 Radio SH", 80),
    ];

    const [product] = buildPurchaseProductSummaries(expenses, documents);

    expect(product).toMatchObject({
      name: "Motor G50 Radio SH",
      family: "Motores y electrónica",
      purchaseCount: 2,
      totalQuantity: 3,
      averageUnitPrice: 33,
      lastUnitPrice: 36,
      averageDiscountPercent: 7.5,
      lastDiscountPercent: 5,
      pvpAverage: 77.5,
      pvpLast: 80,
      pvpCount: 2,
    });
    expect(product.usualSupplier?.supplierName).toBe("Arandes");
    expect(product.totalBase).toBe(88.2);
  });

  it("clasifica familias habituales sin bloquear productos desconocidos", () => {
    expect(inferPurchaseProductFamily("Cinta 14 mm x 6 m")).toBe(
      "Persianas y accesorios",
    );
    expect(inferPurchaseProductFamily("Algo raro")).toBe("Sin familia");
  });
});

function expense(
  id: string,
  date: string,
  supplierName: string,
  purchaseLines: Expense["purchaseLines"],
): Expense {
  return {
    id,
    date,
    origin: "scan",
    businessKind: "purchase_invoice",
    supplierName,
    description: supplierName,
    amount: 0,
    ivaPercent: 21,
    category: "Material",
    paymentMethod: "Tarjeta",
    purchaseLines,
    createdAt: `${date}T00:00:00.000Z`,
  };
}

function document(
  type: Document["type"],
  date: string,
  description: string,
  unitPrice: number,
): Document {
  return {
    id: `${type}-${date}`,
    type,
    number: `${type}/1`,
    status: type === "presupuesto" ? "enviado" : "pagado",
    date,
    client: { name: "Cliente" },
    items: [
      {
        id: "line",
        description,
        quantity: 1,
        unit: "ud",
        unitPrice,
        ivaPercent: 21,
      },
    ],
    notes: "",
    createdAt: `${date}T00:00:00.000Z`,
    updatedAt: `${date}T00:00:00.000Z`,
  };
}
