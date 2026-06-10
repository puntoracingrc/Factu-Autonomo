import { describe, expect, it } from "vitest";
import {
  canMarkQuoteAsAccepted,
  isAcceptedQuote,
  normalizeQuoteDocument,
} from "./quotes";
import type { Document } from "./types";

function presupuesto(status: Document["status"]): Document {
  return {
    id: "1",
    type: "presupuesto",
    number: "P-2026-0001",
    date: "2026-06-10",
    client: { name: "Cliente" },
    items: [],
    status,
    createdAt: "",
    updatedAt: "",
  };
}

describe("quotes", () => {
  it("permite marcar presupuestos emitidos como aceptados", () => {
    expect(canMarkQuoteAsAccepted(presupuesto("enviado"))).toBe(true);
    expect(canMarkQuoteAsAccepted(presupuesto("borrador"))).toBe(false);
  });

  it("detecta presupuestos aceptados", () => {
    expect(isAcceptedQuote(presupuesto("aceptado"))).toBe(true);
    expect(isAcceptedQuote(presupuesto("pagado"))).toBe(true);
    expect(isAcceptedQuote(presupuesto("enviado"))).toBe(false);
  });

  it("migra pagado antiguo a aceptado", () => {
    expect(normalizeQuoteDocument(presupuesto("pagado")).status).toBe("aceptado");
  });
});
