import { describe, expect, it } from "vitest";
import { DEFAULT_PROFILE } from "./types";
import type { Document } from "./types";
import {
  ivaBreakdownByRate,
  validateDocumentEmission,
} from "./invoice-compliance";

const item = {
  id: "1",
  description: "Servicio",
  quantity: 2,
  unitPrice: 50,
  ivaPercent: 21,
};

describe("invoice compliance", () => {
  it("permite emitir presupuestos sin cliente ni conceptos", () => {
    const doc: Document = {
      id: "quote-1",
      type: "presupuesto",
      number: "P-1",
      date: "2026-07-03",
      client: { name: "" },
      items: [],
      status: "enviado",
      createdAt: "",
      updatedAt: "",
    };

    expect(validateDocumentEmission(doc, DEFAULT_PROFILE, "presupuesto")).toEqual({
      ok: true,
    });
  });

  it("mantiene cliente y conceptos obligatorios al emitir facturas", () => {
    const doc: Document = {
      id: "invoice-blank-client",
      type: "factura",
      number: "F-1",
      date: "2026-07-03",
      client: { name: "" },
      items: [item],
      status: "enviado",
      createdAt: "",
      updatedAt: "",
    };

    expect(validateDocumentEmission(doc, DEFAULT_PROFILE, "factura")).toEqual({
      ok: false,
      message: "Indica el nombre del cliente.",
    });

    expect(
      validateDocumentEmission(
        { ...doc, client: { name: "Teresa" }, items: [] },
        DEFAULT_PROFILE,
        "factura",
      ),
    ).toEqual({ ok: false, message: "Añade al menos un concepto." });
  });

  it("requires issuer data to emit facturas", () => {
    const doc: Document = {
      id: "1",
      type: "factura",
      number: "F-1",
      date: "2026-06-09",
      client: { name: "Ana" },
      items: [item],
      status: "enviado",
      createdAt: "",
      updatedAt: "",
    };

    const incomplete = validateDocumentEmission(doc, {
      ...DEFAULT_PROFILE,
      name: "",
      nif: "",
    });
    expect(incomplete.ok).toBe(false);
    expect(incomplete.message).toContain("Revisa estos datos");
    expect(incomplete.message).toContain("El NIF no se valida con AEAT");

    const complete = validateDocumentEmission(doc, {
      ...DEFAULT_PROFILE,
      name: "Juan",
      nif: "12345678Z",
      address: "Calle 1",
      city: "Madrid",
      postalCode: "28001",
    });
    expect(complete.ok).toBe(true);
  });

  it("groups IVA breakdown by rate", () => {
    const breakdown = ivaBreakdownByRate([
      item,
      { ...item, id: "2", ivaPercent: 10, unitPrice: 100, quantity: 1 },
    ]);
    expect(breakdown).toHaveLength(2);
    expect(breakdown[0].rate).toBe(10);
    expect(breakdown[1].rate).toBe(21);
  });
});
