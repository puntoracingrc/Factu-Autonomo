import { describe, expect, it } from "vitest";
import { productSummaryToDocumentDraftLine } from "./product-document-draft";
import { purchaseProductKey } from "./purchase-products";
import type { PurchaseProductSummary } from "./purchase-products";

describe("product document draft", () => {
  it("prepara una línea de venta usando PVP antes que coste", () => {
    const line = productSummaryToDocumentDraftLine(
      summary("Panel blanco", {
        lastPvp: 30,
        averagePvp: 28,
        lastUnitPrice: 18,
        averageUnitPrice: 17,
        ivaPercent: 21,
      }),
    );

    expect(line).toMatchObject({
      productName: "Panel blanco",
      basePrice: 30,
      priceSource: "pvp",
      line: {
        description: "Panel blanco",
        quantity: 1,
        unitPrice: 30,
        ivaPercent: 21,
      },
    });
  });

  it("conserva el origen coste para mostrar aviso cuando no hay PVP", () => {
    const line = productSummaryToDocumentDraftLine(
      summary("Servicio sin tarifa", {
        lastPvp: 0,
        averagePvp: 0,
        lastUnitPrice: 42,
        averageUnitPrice: 40,
      }),
    );

    expect(line.priceSource).toBe("cost");
    expect(line.basePrice).toBe(42);
    expect(line.line.unitPrice).toBe(42);
  });
});

function summary(
  name: string,
  patch: Partial<PurchaseProductSummary> = {},
): PurchaseProductSummary {
  return {
    key: purchaseProductKey(name),
    aliases: [],
    name,
    family: "Demo",
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
    suppliers: [],
    ...patch,
  };
}
