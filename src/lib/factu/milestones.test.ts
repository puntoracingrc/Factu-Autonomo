import { describe, expect, it } from "vitest";
import type { Document } from "../types";
import { isEmittedFactura, maybeCelebrateFirstInvoice } from "./milestones";

function factura(status: Document["status"]): Document {
  return {
    id: "1",
    type: "factura",
    number: "F-2026-0001",
    date: "2026-01-01",
    client: { name: "Test" },
    items: [],
    status,
    createdAt: "",
    updatedAt: "",
  };
}

describe("factu milestones", () => {
  it("detects emitted facturas", () => {
    expect(isEmittedFactura(factura("enviado"))).toBe(true);
    expect(isEmittedFactura(factura("borrador"))).toBe(false);
  });

  it("does not throw when celebrating first invoice", () => {
    expect(() =>
      maybeCelebrateFirstInvoice([], factura("enviado")),
    ).not.toThrow();
  });
});
