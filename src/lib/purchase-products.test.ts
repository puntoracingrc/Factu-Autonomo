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

  it("calcula coste y volumen por M2 cuando el documento trae piezas y total de metros", () => {
    const expenses = [
      expense("1", "2026-07-03", "METALURGICA ARANDES", [
        {
          id: "l1",
          description:
            "MB490 MINIAL: MINI Aluminio Basica (4P.90º) completa Blanco",
          quantity: 2,
          unit: "M2",
          unitPrice: 65,
          discountPercent: 40,
          ivaPercent: 21,
          total: 163.21,
        },
        {
          id: "l2",
          description:
            "MB490 MINIAL: MINI Aluminio Basica (4P.90º) completa Blanco",
          quantity: 2,
          unit: "M2",
          unitPrice: 65,
          discountPercent: 40,
          ivaPercent: 21,
          total: 157.17,
        },
      ]),
    ];

    const [product] = buildPurchaseProductSummaries(expenses);

    expect(product).toMatchObject({
      purchaseCount: 2,
      totalQuantity: 8.21,
      totalBase: 320.38,
      averageUnitPrice: 39,
      lastUnitPrice: 39,
      averagePvp: 65,
      lastPvp: 65,
      averageDiscountPercent: 40,
      lastDiscountPercent: 40,
    });
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
    expect(summary.unit).toBe("m2");
    expect(summary.purchaseCount).toBe(1);
  });

  it("respeta facetas de venta y compra guardadas en el catálogo", () => {
    const [summary] = buildPurchaseProductSummaries(
      [],
      [
        product("Persiana mini aluminio", {
          sku: "MB490",
          unit: "m2",
          pvp: 65,
          cost: 39,
          sales: {
            enabled: true,
            description: "Persiana mini aluminio instalada",
            unit: "m2",
            unitPrice: 95,
            ivaPercent: 21,
          },
          purchase: {
            enabled: true,
            description: "MB490 MINIAL proveedor",
            unit: "M2",
            listPrice: 65,
            discountPercent: 40,
            netUnitCost: 39,
            supplierReference: "MB490",
          },
          calculation: { kind: "area", unit: "m2", roundingDecimals: 2 },
        }),
      ],
    );

    expect(summary).toMatchObject({
      sku: "MB490",
      saleDescription: "Persiana mini aluminio instalada",
      saleUnit: "m2",
      saleUnitPrice: 95,
      purchaseDescription: "MB490 MINIAL proveedor",
      purchaseUnit: "m2",
      purchaseListPrice: 65,
      purchaseDiscountPercent: 40,
      purchaseNetUnitCost: 39,
      purchaseSupplierReference: "MB490",
      calculation: { kind: "area", unit: "m2", roundingDecimals: 2 },
      lastPvp: 65,
      lastUnitPrice: 39,
    });
  });

  it("hereda la referencia del proveedor desde la línea de compra escaneada", () => {
    const [summary] = buildPurchaseProductSummaries([
      expense("e-ref", "2026-06-09", "Metalurgica Arandes", [
        {
          id: "l-ref",
          supplierReference: "SM-502",
          description: "Kit motor G50: Sop.+ Ad. Ø 60 Oct.",
          quantity: 10,
          unit: "JG",
          unitPrice: 7.63,
          discountPercent: 35,
          ivaPercent: 21,
          total: 49.59,
        },
      ]),
    ]);

    expect(summary.purchaseSupplierReference).toBe("SM-502");
    expect(summary.purchaseUnit).toBe("ud");
  });

  it("conserva atributos flexibles del catalogo", () => {
    const [summary] = buildPurchaseProductSummaries(
      [],
      [
        product("Camiseta tecnica", {
          attributes: [
            { key: "talla", label: "Talla", value: "L" },
            { key: "color", label: "Color", value: "Azul" },
            { key: "marca", label: "Marca", value: "" },
          ],
        }),
      ],
    );

    expect(summary.attributes).toEqual([
      { key: "talla", label: "Talla", value: "L", unit: undefined },
      { key: "color", label: "Color", value: "Azul", unit: undefined },
      { key: "marca", label: "Marca", value: "", unit: undefined },
    ]);
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
    const [summary] = buildPurchaseProductSummaries(
      [],
      [
        product("Cinta blanca 14 mm", {
          source: "manual",
          family: "Persianas y accesorios",
          cost: 2.5,
          pvp: 4,
        }),
      ],
    );

    expect(summary).toMatchObject({
      name: "Cinta blanca 14 mm",
      source: "manual",
      purchaseCount: 0,
      lastUnitPrice: 2.5,
      lastPvp: 4,
    });
  });

  it("oculta productos detectados sin borrar compras históricas", () => {
    const expenses = [
      expense("1", "2026-07-01", "Arandes", [
        {
          id: "l1",
          description: "Mosquitera enrollable Blanco",
          quantity: 3,
          unit: "ud",
          unitPrice: 58.3,
          ivaPercent: 21,
        },
      ]),
    ];
    const hidden = product("Mosquitera enrollable Blanco", { hidden: true });

    expect(buildPurchaseProductSummaries(expenses, [hidden])).toEqual([]);
  });

  it("solo crea resumen de producto con líneas marcadas para catálogo", () => {
    const summaries = buildPurchaseProductSummaries([
      expense("1", "2026-07-01", "Arandes", [
        {
          id: "l1",
          description: "Motor vendible",
          catalogProduct: true,
          quantity: 1,
          unit: "ud",
          unitPrice: 95,
          ivaPercent: 21,
        },
        {
          id: "l2",
          description: "Taladro para uso interno",
          catalogProduct: false,
          quantity: 1,
          unit: "ud",
          unitPrice: 180,
          ivaPercent: 21,
        },
      ]),
    ]);

    expect(summaries).toHaveLength(1);
    expect(summaries[0].name).toBe("Motor vendible");
  });

  it("mantiene líneas históricas sin marca para no perder productos existentes", () => {
    const summaries = buildPurchaseProductSummaries([
      expense("1", "2026-07-01", "Arandes", [
        {
          id: "legacy",
          description: "Producto detectado antiguo",
          quantity: 1,
          unit: "ud",
          unitPrice: 25,
          ivaPercent: 21,
        },
      ]),
    ]);

    expect(summaries).toHaveLength(1);
    expect(summaries[0].name).toBe("Producto detectado antiguo");
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
