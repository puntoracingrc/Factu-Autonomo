import { describe, expect, it } from "vitest";
import {
  detectNonExpenseDocumentReason,
  normalizeExpenseScanPayload,
} from "./schema";

describe("expense scan schema", () => {
  it("normaliza un payload válido", () => {
    const result = normalizeExpenseScanPayload({
      supplier: { name: "Leroy Merlin", nif: "B12345678" },
      expense: {
        date: "12/05/2026",
        description: "Material",
        amount: 42.5,
        ivaPercent: 21,
        category: "Material",
        paymentMethod: "Tarjeta",
        notes: "FM-99",
      },
      confidence: 0.9,
      warnings: [],
    });

    expect(result?.supplier.name).toBe("Leroy Merlin");
    expect(result?.expense.date).toBe("2026-05-12");
    expect(result?.expense.businessKind).toBe("purchase_invoice");
    expect(result?.expense.amount).toBe(42.5);
    expect(result?.expense.paymentMethod).toBe("Tarjeta");
  });

  it("clasifica tickets escaneados sin NIF como gasto rápido", () => {
    const result = normalizeExpenseScanPayload({
      supplier: { name: "Gasolinera" },
      expense: {
        date: "2026-01-01",
        description: "Ticket combustible",
        amount: 15,
        ivaPercent: 21,
        category: "Vehículo",
        paymentMethod: "Tarjeta",
      },
      confidence: 0.9,
      warnings: [],
    });

    expect(result?.expense.businessKind).toBe("quick_ticket");
  });

  it("rechaza datos incompletos", () => {
    expect(
      normalizeExpenseScanPayload({
        supplier: { name: "" },
        expense: { description: "x", amount: 0 },
      }),
    ).toBeNull();
  });

  it("añade aviso con baja confianza", () => {
    const result = normalizeExpenseScanPayload({
      supplier: { name: "Tienda" },
      expense: {
        date: "2026-01-01",
        description: "Gasto",
        amount: 10,
        ivaPercent: 21,
        category: "Otros",
        paymentMethod: "Efectivo",
      },
      confidence: 0.4,
      warnings: [],
    });
    expect(result?.warnings.some((w) => w.includes("Confianza baja"))).toBe(true);
  });

  it("normaliza líneas de compra detectadas", () => {
    const result = normalizeExpenseScanPayload({
      supplier: { name: "Metalúrgica Arandes", nif: "B12345678" },
      expense: {
        date: "2026-06-30",
        description: "Material persiana",
        amount: 100,
        ivaPercent: 21,
        category: "Material",
        paymentMethod: "Tarjeta",
        purchaseLines: [
          {
            description: " Lama persiana ",
            quantity: "2",
            unit: "ud",
            unitPrice: "30,50",
            discountPercent: 10,
            ivaPercent: 21,
          },
          {
            description: "Transporte",
            quantity: 1,
            total: 12,
            ivaPercent: 0,
          },
          {
            description: "",
            quantity: 1,
            unitPrice: 99,
          },
        ],
      },
      confidence: 0.9,
      warnings: [],
    });

    expect(result?.expense.purchaseLines).toHaveLength(2);
    expect(result?.expense.purchaseLines?.[0]).toMatchObject({
      description: "Lama persiana",
      quantity: 2,
      unitPrice: 30.5,
      discountPercent: 10,
      ivaPercent: 21,
    });
    expect(result?.expense.purchaseLines?.[1]).toMatchObject({
      description: "Transporte",
      unitPrice: 12,
      total: 12,
      ivaPercent: 0,
    });
  });

  it("usa los metros cuadrados totales como cantidad cuando hay piezas y total M2", () => {
    const result = normalizeExpenseScanPayload({
      supplier: { name: "Metalúrgica Arandes", nif: "B60470374" },
      expense: {
        date: "2026-07-03",
        description: "Factura persianas",
        amount: 320.38,
        ivaPercent: 21,
        category: "Material",
        paymentMethod: "Tarjeta",
        purchaseLines: [
          {
            description:
              "MB490 MINIAL: MINI Aluminio Basica (4P.90º) completa Blanco",
            quantity: 2,
            unit: "M2",
            unitPrice: 65,
            discountPercent: 40,
            ivaPercent: 21,
            total: 163.21,
          },
        ],
      },
      confidence: 0.9,
      warnings: [],
    });

    expect(result?.expense.purchaseLines?.[0]).toMatchObject({
      quantity: 4.18,
      unit: "M2",
      unitPrice: 65,
      discountPercent: 40,
      total: 163.21,
    });
  });

  it("normaliza datos estructurados de factura de proveedor", () => {
    const result = normalizeExpenseScanPayload({
      supplier: { name: "Proveedor SL", nif: "B87654321" },
      expense: {
        date: "30/06/2026",
        description: "Compra material",
        amount: 100,
        ivaPercent: 21,
        category: "Material",
        paymentMethod: "Transferencia",
        purchaseDocument: {
          invoiceNumber: " FD-224572 ",
          dueDate: "15/07/2026",
          supplierAddress: "Calle Mayor 1",
          supplierPostalCode: "08001",
          supplierCity: "Barcelona",
          paymentTerms: "30 días",
        },
      },
      confidence: 0.9,
      warnings: [],
    });

    expect(result?.expense.purchaseDocument).toMatchObject({
      invoiceNumber: "FD-224572",
      issueDate: "2026-06-30",
      dueDate: "2026-07-15",
      supplierNif: "B87654321",
      supplierAddress: "Calle Mayor 1",
      supplierPostalCode: "08001",
      supplierCity: "Barcelona",
      paymentTerms: "30 días",
    });
  });

  it("detecta documentos comerciales que no deben guardarse como gasto", () => {
    expect(detectNonExpenseDocumentReason("Oferta 152184")).toContain(
      "No se guardará como gasto",
    );
    expect(detectNonExpenseDocumentReason("Pedido 415039.0")).toContain(
      "No se guardará como gasto",
    );
    expect(detectNonExpenseDocumentReason("COMANDA / PEDIDO")).toContain(
      "No se guardará como gasto",
    );
    expect(detectNonExpenseDocumentReason("Presupuesto 150985.0")).toContain(
      "No se guardará como gasto",
    );
    expect(
      detectNonExpenseDocumentReason(
        'PRESSUPOST Nº 152.184 "VALID DURANT 7 DIES"',
      ),
    ).toContain("No se guardará como gasto");
  });

  it("no bloquea una factura real por mencionar presupuesto o pedido como referencia", () => {
    expect(
      detectNonExpenseDocumentReason(
        "Factura FD-123\nReferencia al presupuesto 150985\nPedido interno 42",
      ),
    ).toBeNull();
  });

  it("no bloquea una factura de proveedor por referencias a oferta o pedido", () => {
    const result = normalizeExpenseScanPayload({
      document: {
        kind: "quote_or_order",
        isExpenseDocument: false,
        reason: "Contiene Pedido nº 417906 y Oferta nº 152763.",
      },
      supplier: { name: "Metalúrgica Arandes SL" },
      expense: {
        date: "2026-05-07",
        description: "Motor Persiana SUPER Gradhermetic cable ISG: 30/12",
        amount: 207.07,
        ivaPercent: 21,
        category: "Material",
        paymentMethod: "Tarjeta",
        notes: "Pedido nº 417906 de fecha 07/05/2026\nOferta nº 152763 de fecha 04/05/2026",
        purchaseDocument: {
          invoiceNumber: "FD/223537",
        },
      },
      confidence: 0.9,
      warnings: [],
    });

    expect(result?.document).toMatchObject({
      kind: "expense_invoice",
      isExpenseDocument: true,
      reason: null,
    });
  });

  it("marca ofertas, pedidos y presupuestos como documento no contabilizable", () => {
    const result = normalizeExpenseScanPayload({
      supplier: { name: "Metalúrgica Arandes SL" },
      expense: {
        date: "2026-04-10",
        description: "Presupuesto para persianas y guías de aluminio",
        amount: 2088.02,
        ivaPercent: 21,
        category: "Material",
        paymentMethod: "Transferencia",
        purchaseDocument: {
          invoiceNumber: "152184",
        },
      },
      confidence: 0.9,
      warnings: [],
    });

    expect(result?.document).toMatchObject({
      kind: "quote_or_order",
      isExpenseDocument: false,
    });
    expect(result?.document?.reason).toContain("No se guardará como gasto");
  });

  it("respeta la señal explícita de la IA cuando no es factura ni ticket", () => {
    const result = normalizeExpenseScanPayload({
      document: {
        kind: "quote_or_order",
        isExpenseDocument: false,
        reason: "Es un pedido pendiente, no una factura recibida.",
      },
      supplier: { name: "Proveedor Demo" },
      expense: {
        date: "2026-04-10",
        description: "Pedido de material",
        amount: 99,
        ivaPercent: 21,
        category: "Material",
        paymentMethod: "Transferencia",
      },
      confidence: 0.9,
      warnings: [],
    });

    expect(result?.document).toMatchObject({
      kind: "quote_or_order",
      isExpenseDocument: false,
      reason: "Es un pedido pendiente, no una factura recibida.",
    });
  });
});
