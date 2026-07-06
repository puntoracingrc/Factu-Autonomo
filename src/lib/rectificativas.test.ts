import { describe, expect, it } from "vitest";
import {
  assignNextDocumentNumber,
  formatDocumentNumber,
} from "./documents";
import {
  canRectifyInvoice,
  getDeletePolicy,
  itemsForAnulacion,
  originalStatusAfterRectification,
} from "./rectificativas";
import { issueDocument } from "./document-integrity";
import { EMPTY_DATA, type Document } from "./types";

function invoice(
  id: string,
  number: string,
  status: Document["status"],
  extra: Partial<Document> = {},
): Document {
  return {
    id,
    type: "factura",
    number,
    date: "2026-06-01",
    client: { name: "Ana García", firstName: "Ana", lastName: "García" },
    items: [
      {
        id: "l1",
        description: "Servicio",
        quantity: 1,
        unitPrice: 100,
        ivaPercent: 21,
      },
    ],
    status,
    createdAt: "",
    updatedAt: "",
    ...extra,
  };
}

describe("facturas rectificativas", () => {
  it("permite rectificar facturas emitidas", () => {
    expect(canRectifyInvoice(invoice("1", "F-2026-0001", "pagado"))).toBe(
      true,
    );
    expect(canRectifyInvoice(invoice("1", "F-2026-0001", "borrador"))).toBe(
      false,
    );
  });

  it("no permite rectificar dos veces", () => {
    expect(
      canRectifyInvoice(
        invoice("1", "F-2026-0001", "pagado", { rectifiedById: "fr1" }),
      ),
    ).toBe(false);
  });

  it("permite rectificar una rectificativa emitida si todavía no fue sustituida", () => {
    expect(
      canRectifyInvoice(
        invoice("2", "FR-2026-0001", "enviado", {
          rectification: {
            originalDocumentId: "1",
            originalNumber: "F-2026-0001",
            originalDate: "2026-06-01",
            reason: "Error en datos",
            type: "correccion",
          },
        }),
      ),
    ).toBe(true);
  });

  it("anulación genera importes negativos", () => {
    const original = invoice("1", "F-2026-0001", "pagado");
    const negated = itemsForAnulacion(original.items);
    expect(negated[0].unitPrice).toBe(-100);
  });

  it("marca original como anulada o rectificada", () => {
    expect(originalStatusAfterRectification("anulacion")).toBe("anulada");
    expect(originalStatusAfterRectification("correccion")).toBe("rectificada");
  });

  it("numeración FR independiente de F", () => {
    const docs = [
      invoice("1", "F-2026-0001", "pagado"),
      invoice("2", "FR-2026-0001", "enviado", {
        rectification: {
          originalDocumentId: "1",
          originalNumber: "F-2026-0001",
          originalDate: "2026-06-01",
          reason: "Error",
          type: "anulacion",
        },
      }),
    ];
    const next = assignNextDocumentNumber(docs, "factura_rectificativa", 2026);
    expect(next.number).toBe("FR-2026-0002");
    expect(formatDocumentNumber("factura", 2026, 2)).toBe("F-2026-0002");
  });

  it("no permite borrar facturas emitidas (solo rectificar)", () => {
    const emitida = getDeletePolicy(invoice("1", "F-2026-0001", "pagado"));
    expect(emitida.allowed).toBe(false);
    expect(emitida.message).toContain("rectificativa");

    const borrador = getDeletePolicy(invoice("1", "F-2026-0001", "borrador"));
    expect(borrador.allowed).toBe(true);
    expect(borrador.level).toBe("simple");
  });

  it("permite borrar factura borrador", () => {
    const policy = getDeletePolicy(invoice("1", "F-2026-0001", "borrador"));

    expect(policy.allowed).toBe(true);
    expect(policy.message).toContain("borrador");
  });

  it("rechaza borrar factura emitida", () => {
    const issued = issueDocument(
      invoice("1", "F-2026-0001", "borrador"),
      EMPTY_DATA.profile,
      "2026-06-24T10:00:00.000Z",
    );

    expect(getDeletePolicy(issued).allowed).toBe(false);
  });

  it("rechaza borrar documento issued/locked/not_sent", () => {
    const locked = invoice("1", "F-2026-0001", "borrador", {
      documentLifecycle: "issued",
      integrityLock: "locked",
      deliveryStatus: "not_sent",
    });

    expect(getDeletePolicy(locked).allowed).toBe(false);
  });

  it("rechaza borrar legacy status distinto de borrador", () => {
    const legacy = invoice("1", "F-2026-0001", "enviado", {
      documentLifecycle: undefined,
      integrityLock: undefined,
      documentSnapshot: undefined,
      pdfSnapshot: undefined,
    });

    expect(getDeletePolicy(legacy).allowed).toBe(false);
  });

  it("no permite borrar rectificativas ni facturas ya rectificadas", () => {
    const rectificativa = getDeletePolicy(
      invoice("2", "FR-2026-0001", "enviado", {
        rectification: {
          originalDocumentId: "1",
          originalNumber: "F-2026-0001",
          originalDate: "2026-06-01",
          reason: "Error",
          type: "anulacion",
        },
      }),
    );
    expect(rectificativa.allowed).toBe(false);

    const rectificada = getDeletePolicy(
      invoice("1", "F-2026-0001", "anulada", { rectifiedById: "2" }),
    );
    expect(rectificada.allowed).toBe(false);
  });

  it("rechaza borrar rectificativa emitida", () => {
    const rectificativa = invoice("2", "FR-2026-0001", "enviado", {
      rectification: {
        originalDocumentId: "1",
        originalNumber: "F-2026-0001",
        originalDate: "2026-06-01",
        reason: "Error",
        type: "anulacion",
      },
    });

    expect(getDeletePolicy(rectificativa).allowed).toBe(false);
  });

  it("rechaza borrar presupuesto enviado", () => {
    const presupuesto: Document = {
      ...invoice("p1", "P-2026-0001", "enviado"),
      type: "presupuesto",
    };

    const policy = getDeletePolicy(presupuesto);

    expect(policy.allowed).toBe(false);
    expect(policy.message).toContain("no puede borrarse");
  });

  it("rechaza borrar recibo pagado", () => {
    const recibo: Document = {
      ...invoice("r1", "R-2026-0001", "pagado"),
      type: "recibo",
    };

    const policy = getDeletePolicy(recibo);

    expect(policy.allowed).toBe(false);
    expect(policy.message).toContain("no puede borrarse");
  });

  it("no permite borrar un borrador recién emitido pendiente de envío", () => {
    const documents = [
      invoice("1", "F-2026-0001", "enviado"),
      invoice("2", "F-2026-0002", "borrador"),
    ];
    const issued = issueDocument(documents[1], EMPTY_DATA.profile, "2026-06-24T10:00:00.000Z");
    const policy = getDeletePolicy(issued);

    const afterDeleteAttempt = policy.allowed
      ? documents.filter((doc) => doc.id !== issued.id)
      : documents.map((doc) => (doc.id === issued.id ? issued : doc));

    expect(policy.allowed).toBe(false);
    expect(afterDeleteAttempt).toHaveLength(2);
    expect(afterDeleteAttempt.map((doc) => doc.number)).toEqual([
      "F-2026-0001",
      "F-2026-0002",
    ]);
    expect(afterDeleteAttempt[1]).toMatchObject({
      documentLifecycle: "issued",
      integrityLock: "locked",
      deliveryStatus: "not_sent",
    });
  });

  it("no permite borrar presupuestos o recibos bloqueados aunque no sean factura", () => {
    const presupuesto: Document = {
      ...invoice("p1", "P-2026-0001", "borrador"),
      type: "presupuesto",
      documentLifecycle: "issued",
      integrityLock: "locked",
      deliveryStatus: "not_sent",
    };
    const recibo: Document = {
      ...invoice("r1", "R-2026-0001", "borrador"),
      type: "recibo",
      documentLifecycle: "issued",
      integrityLock: "locked",
      deliveryStatus: "not_sent",
    };

    expect(getDeletePolicy(presupuesto).allowed).toBe(false);
    expect(getDeletePolicy(recibo).allowed).toBe(false);
  });
});
