import { describe, expect, it } from "vitest";
import { issueDocument } from ".";
import { DEFAULT_PROFILE } from "../types";
import { profileForHistoricalDerivedDocument } from "./derived-issuance";

function sourceSnapshot() {
  return issueDocument(
    {
      id: "source",
      type: "factura",
      number: "F-2026-0001",
      date: "2026-07-10",
      client: { name: "Cliente" },
      items: [],
      status: "borrador",
      createdAt: "2026-07-10T10:00:00.000Z",
      updatedAt: "2026-07-10T10:00:00.000Z",
    },
    {
      ...DEFAULT_PROFILE,
      name: "Emisor histórico",
      nif: "12345678Z",
      vatExempt: true,
      iva: { rates: [0], defaultRate: 0 },
    },
    "2026-07-10T10:00:00.000Z",
  ).documentSnapshot!;
}

describe("profileForHistoricalDerivedDocument", () => {
  it("conserva emisor y régimen histórico con opciones operativas actuales", () => {
    const current = {
      ...DEFAULT_PROFILE,
      nif: "12345678Z",
      name: "Nombre actual",
    };
    const resolved = profileForHistoricalDerivedDocument(
      sourceSnapshot(),
      current,
    );

    expect(resolved.name).toBe("Emisor histórico");
    expect(resolved.vatExempt).toBe(true);
    expect(resolved.iva).toEqual({ rates: [0], defaultRate: 0 });
    expect(resolved.numbering).toBe(current.numbering);
  });

  it("bloquea derivados de otro NIF", () => {
    expect(() =>
      profileForHistoricalDerivedDocument(sourceSnapshot(), {
        ...DEFAULT_PROFILE,
        nif: "99999999R",
      }),
    ).toThrow("no coincide con el emisor histórico");
  });
});
