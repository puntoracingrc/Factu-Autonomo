import { describe, expect, it } from "vitest";
import {
  buildPurchaseProductSummaries,
  inferPurchaseProductFamily,
  purchaseProductKey,
} from "./purchase-products";
import type { Expense, Product } from "./types";

describe("purchase products", () => {
  it("agrupa líneas escaneadas y separa coste real de PVP de proveedor", () => {
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

    const [product] = buildPurchaseProductSummaries(expenses);

    expect(product).toMatchObject({
      name: "Motor G50 Radio SH",
      family: "Motores y electrónica",
      purchaseCount: 2,
      totalQuantity: 3,
      averageUnitPrice: 30.6,
      lastUnitPrice: 34.2,
      averagePvp: 33,
      lastPvp: 36,
      averageDiscountPercent: 7.5,
      lastDiscountPercent: 5,
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

  it("respeta una familia editada manualmente para futuros escaneos", () => {
    const expenses = [
      expense("1", "2026-07-01", "Arandes", [
        {
          id: "l1",
          description: "Panel blanco PC43",
          quantity: 1,
          unit: "m2",
          unitPrice: 30.5,
          discountPercent: 40,
          ivaPercent: 21,
        },
      ]),
    ];
    const catalog = [
      product("Panel PC43 editado", {
        key: purchaseProductKey("Panel blanco PC43"),
        family: "Persianas personalizadas",
        unit: "M2",
      }),
    ];

    const [summary] = buildPurchaseProductSummaries(expenses, catalog);

    expect(summary.name).toBe("Panel PC43 editado");
    expect(summary.family).toBe("Persianas personalizadas");
    expect(summary.unit).toBe("M2");
    expect(summary.purchaseCount).toBe(1);
  });

  it("unifica variantes mediante aliases guardados", () => {
    const expenses = [
      expense("1", "2026-07-01", "Arandes", [
        {
          id: "l1",
          description: "Motor G50 Radio SH",
          quantity: 1,
          unit: "ud",
          unitPrice: 30,
          discountPercent: 10,
          ivaPercent: 21,
        },
      ]),
      expense("2", "2026-07-02", "Arandes", [
        {
          id: "l2",
          description: "Motor G50 SH radio",
          quantity: 1,
          unit: "ud",
          unitPrice: 32,
          discountPercent: 10,
          ivaPercent: 21,
        },
      ]),
    ];
    const catalog = [
      product("Motor G50 Radio SH", {
        aliases: [purchaseProductKey("Motor G50 SH radio")],
      }),
    ];

    const summaries = buildPurchaseProductSummaries(expenses, catalog);

    expect(summaries).toHaveLength(1);
    expect(summaries[0].purchaseCount).toBe(2);
    expect(summaries[0].totalQuantity).toBe(2);
  });

  it("muestra productos manuales aunque todavía no tengan compras", () => {
    const [summary] = buildPurchaseProductSummaries([], [
      product("Cinta blanca 14 mm", {
        source: "manual",
        family: "Persianas y accesorios",
        cost: 2.5,
        pvp: 4,
      }),
    ]);

    expect(summary).toMatchObject({
      name: "Cinta blanca 14 mm",
      source: "manual",
      purchaseCount: 0,
      lastUnitPrice: 2.5,
      lastPvp: 4,
    });
  });
});

function product(name: string, patch: Partial<Product> = {}): Product {
  const now = "2026-07-01T00:00:00.000Z";
  return {
    id: `p-${purchaseProductKey(name)}`,
    key: purchaseProductKey(name),
    aliases: [],
    name,
    family: inferPurchaseProductFamily(name),
    unit: "ud",
    source: "detected",
    createdAt: now,
    updatedAt: now,
    ...patch,
  };
}

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
