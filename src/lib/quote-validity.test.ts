import { describe, expect, it } from "vitest";
import { DEFAULT_PROFILE, type Document } from "./types";
import {
  defaultQuoteDueDate,
  isQuoteExpired,
  normalizeQuoteValidityDays,
  quoteValidUntil,
} from "./quote-validity";

const quote: Document = {
  id: "q1",
  type: "presupuesto",
  number: "P-2026-0001",
  date: "2026-06-01",
  dueDate: "2026-06-15",
  client: { name: "Cliente" },
  items: [],
  status: "enviado",
  createdAt: "2026-06-01T00:00:00.000Z",
  updatedAt: "2026-06-01T00:00:00.000Z",
};

describe("quote validity", () => {
  it("normaliza los días configurables", () => {
    expect(normalizeQuoteValidityDays(undefined)).toBe(30);
    expect(normalizeQuoteValidityDays(-5)).toBe(0);
    expect(normalizeQuoteValidityDays(400)).toBe(365);
    expect(normalizeQuoteValidityDays(12.6)).toBe(13);
  });

  it("calcula la fecha de validez desde la fecha del presupuesto", () => {
    expect(quoteValidUntil("2026-06-01", 30)).toBe("2026-07-01");
    expect(
      defaultQuoteDueDate("2026-06-01", {
        ...DEFAULT_PROFILE,
        quoteValidityDays: 15,
      }),
    ).toBe("2026-06-16");
  });

  it("detecta presupuestos enviados caducados", () => {
    expect(isQuoteExpired(quote, "2026-06-16")).toBe(true);
    expect(isQuoteExpired(quote, "2026-06-15")).toBe(false);
    expect(isQuoteExpired({ ...quote, status: "aceptado" }, "2026-06-16")).toBe(
      false,
    );
  });
});
