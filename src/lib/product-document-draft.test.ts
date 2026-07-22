import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  consumeDocumentProductPickedLine,
  consumeDocumentProductReturnDraft,
  getDocumentProductPickRequest,
  mergeProductCalculationIntoMeasurementDraft,
  productSummaryToDocumentDraftLine,
  productSummaryToPickedLine,
  saveDocumentProductPickedLine,
  saveDocumentProductPickRequest,
  saveDocumentProductReturnDraft,
} from "./product-document-draft";
import { purchaseProductKey } from "./purchase-products";
import type { PurchaseProductSummary } from "./purchase-products";
import type { LineItem } from "./types";

function installSessionStorageStub() {
  const store = new Map<string, string>();
  vi.stubGlobal("window", {
    sessionStorage: {
      getItem: (key: string) => store.get(key) ?? null,
      setItem: (key: string, value: string) => {
        store.set(key, value);
      },
      removeItem: (key: string) => {
        store.delete(key);
      },
    },
  });
}

describe("product document draft", () => {
  beforeEach(() => {
    installSessionStorageStub();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("prepara una línea usando la faceta de venta antes que proveedor o coste", () => {
    const line = productSummaryToDocumentDraftLine(
      summary("Panel blanco", {
        saleDescription: "Panel blanco vendido",
        saleUnit: "m2",
        saleUnitPrice: 45,
        saleIvaPercent: 10,
        calculation: {
          kind: "area" as const,
          unit: "m2",
          roundingDecimals: 3,
        },
        lastPvp: 30,
        averagePvp: 28,
        lastUnitPrice: 18,
        averageUnitPrice: 17,
        ivaPercent: 21,
        productId: "product-panel",
      }),
    );

    expect(line).toMatchObject({
      productKey: "panel blanco",
      productId: "product-panel",
      productName: "Panel blanco",
      basePrice: 45,
      priceSource: "sale",
      costUnitPrice: 18,
      costIvaPercent: 21,
      calculation: { kind: "area", unit: "m2", roundingDecimals: 3 },
      line: {
        description: "Panel blanco vendido",
        quantity: 1,
        unit: "m2",
        unitPrice: 45,
        ivaPercent: 10,
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
    expect(line.calculation).toEqual({ kind: "none", unit: "ud" });
  });

  it("guarda y consume el borrador de vuelta a una línea de documento", () => {
    const item = lineItem({ id: "line-2", description: "Motor radio" });
    const saved = saveDocumentProductReturnDraft({
      source: "document",
      documentType: "presupuesto",
      returnPath: "/presupuestos/nuevo",
      targetLineId: item.id,
      createdAt: "2026-07-04T00:00:00.000Z",
      form: {
        clientForm: { firstName: "Teresa" },
        selectedCustomerId: "customer-1",
        date: "2026-07-04",
        dueDate: "",
        notes: "Notas",
        salesTerms: "Validez de 30 días",
        paymentTerms: "",
        status: "borrador",
        documentIvaPercent: 21,
        items: [item],
        lineProductPricing: {},
        lineAreaDrafts: {},
      },
    });

    expect(saved).toBe(true);
    const consumed = consumeDocumentProductReturnDraft("presupuesto");
    expect(consumed?.targetLineId).toBe("line-2");
    expect(consumed?.form.salesTerms).toBe("Validez de 30 días");
    expect(consumed?.form.items[0]).toMatchObject({
      id: "line-2",
      description: "Motor radio",
    });
    expect(consumeDocumentProductReturnDraft("presupuesto")).toBeNull();
  });

  it("prepara una selección de producto para volver al documento", () => {
    const request = {
      source: "document" as const,
      documentType: "factura" as const,
      returnPath: "/facturas/nuevo",
      targetLineId: "line-1",
      createdAt: "2026-07-04T00:00:00.000Z",
      mode: "edit" as const,
      productKey: "panel blanco",
      productId: "product-panel",
      prefill: {
        name: "Panel",
        calculation: {
          kind: "area" as const,
          unit: "m2",
          roundingDecimals: 3,
        },
      },
    };

    expect(saveDocumentProductPickRequest(request)).toBe(true);
    expect(getDocumentProductPickRequest()).toMatchObject({
      targetLineId: "line-1",
      mode: "edit",
      productKey: "panel blanco",
      productId: "product-panel",
      prefill: {
        name: "Panel",
        calculation: { kind: "area", unit: "m2", roundingDecimals: 3 },
      },
    });

    const picked = productSummaryToPickedLine(
      summary("Panel blanco", { productId: "product-panel" }),
      request,
    );
    expect(saveDocumentProductPickedLine(picked)).toBe(true);
    expect(consumeDocumentProductPickedLine("factura")).toMatchObject({
      targetLineId: "line-1",
      draftLine: {
        productKey: "panel blanco",
        productId: "product-panel",
        productName: "Panel blanco",
        costUnitPrice: 8,
        line: { description: "Panel blanco" },
      },
    });
    expect(consumeDocumentProductPickedLine("factura")).toBeNull();
  });

  it("conserva plantilla, redondeo y dimensiones en la vuelta completa", () => {
    const item = lineItem({
      id: "line-volume",
      description: "Bloque a medida",
      unit: "m3",
      quantity: 0.1234,
    });
    const measurement = {
      kind: "volume" as const,
      pieces: 2,
      length: 1.2345,
      width: 0.5,
      height: 0.1,
      roundingDecimals: 4,
    };
    const calculation = {
      kind: "volume" as const,
      unit: "m3",
      roundingDecimals: 4,
    };

    expect(
      saveDocumentProductReturnDraft({
        source: "document",
        documentType: "factura",
        returnPath: "/facturas/nuevo",
        targetLineId: item.id,
        createdAt: "2026-07-22T00:00:00.000Z",
        form: {
          clientForm: {},
          selectedCustomerId: null,
          date: "2026-07-22",
          dueDate: "",
          notes: "",
          salesTerms: "",
          paymentTerms: "",
          status: "borrador",
          documentIvaPercent: 21,
          items: [item],
          lineProductPricing: {},
          lineAreaDrafts: { [item.id]: measurement },
        },
      }),
    ).toBe(true);
    expect(
      saveDocumentProductPickRequest({
        source: "document",
        documentType: "factura",
        returnPath: "/facturas/nuevo",
        targetLineId: item.id,
        createdAt: "2026-07-22T00:00:00.000Z",
        prefill: { name: item.description, unit: item.unit, calculation },
      }),
    ).toBe(true);

    const restored = consumeDocumentProductReturnDraft("factura");
    const request = getDocumentProductPickRequest();
    const picked = productSummaryToPickedLine(
      summary("Bloque a medida", {
        saleUnit: "m3",
        calculation,
      }),
      request!,
    );
    expect(saveDocumentProductPickedLine(picked)).toBe(true);
    const selected = consumeDocumentProductPickedLine("factura");
    expect(restored?.form.lineAreaDrafts[item.id]).toEqual(measurement);
    expect(request?.prefill?.calculation).toEqual(calculation);
    expect(selected?.draftLine.calculation).toEqual(calculation);
    expect(
      mergeProductCalculationIntoMeasurementDraft(
        restored?.form.lineAreaDrafts[item.id],
        selected?.draftLine.calculation ?? { kind: "none" },
      ),
    ).toEqual(measurement);
  });
});

function lineItem(patch: Partial<LineItem> = {}): LineItem {
  return {
    id: "line-1",
    description: "Servicio",
    quantity: 1,
    unit: "ud",
    unitPrice: 10,
    ivaPercent: 21,
    ...patch,
  };
}

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
