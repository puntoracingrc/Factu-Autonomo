import { describe, expect, it } from "vitest";
import type { Document } from "../types";
import { resolveTipoFactura } from "./tipo-factura";

const base: Document = {
  id: "1",
  type: "factura",
  number: "F-1",
  date: "2026-01-01",
  client: { name: "A" },
  items: [],
  status: "enviado",
  createdAt: "",
  updatedAt: "",
};

describe("resolveTipoFactura", () => {
  it("returns F1 for ordinary invoice", () => {
    expect(resolveTipoFactura(base)).toBe("F1");
  });

  it("returns R1 for rectificativa anulacion", () => {
    expect(
      resolveTipoFactura({
        ...base,
        rectification: {
          originalDocumentId: "x",
          originalNumber: "F-0",
          originalDate: "2025-12-01",
          reason: "Error",
          type: "anulacion",
        },
      }),
    ).toBe("R1");
  });

  it("returns R4 for other rectificativas", () => {
    expect(
      resolveTipoFactura({
        ...base,
        rectification: {
          originalDocumentId: "x",
          originalNumber: "F-0",
          originalDate: "2025-12-01",
          reason: "Corrección",
          type: "correccion",
        },
      }),
    ).toBe("R4");
  });
});
