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
    expect(incomplete.message).toContain("Configuración");

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
