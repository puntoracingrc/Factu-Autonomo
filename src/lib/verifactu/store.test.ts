import { describe, expect, it } from "vitest";
import type { BusinessProfile, Document } from "../types";
import { DEFAULT_PROFILE } from "../types";
import { withVerifactuOnDocument } from "./store";

const profile: BusinessProfile = {
  ...DEFAULT_PROFILE,
  nif: "12345678Z",
  verifactu: { enabled: true, environment: "test" },
};

const factura: Document = {
  id: "doc-1",
  type: "factura",
  number: "F-2026-0001",
  date: "2026-06-09",
  client: { name: "Cliente" },
  items: [
    {
      id: "l1",
      description: "Servicio",
      quantity: 1,
      unitPrice: 100,
      ivaPercent: 21,
    },
  ],
  status: "enviado",
  createdAt: "2026-06-09T10:00:00.000Z",
  updatedAt: "2026-06-09T10:00:00.000Z",
};

describe("withVerifactuOnDocument", () => {
  it("attaches verifactu metadata and advances chain", async () => {
    const result = await withVerifactuOnDocument({
      doc: factura,
      profile,
      chain: null,
    });

    expect(result.doc.verifactu?.qrUrl).toContain("prewww2.aeat.es");
    expect(result.chain?.recordCount).toBe(1);
    expect(result.chain?.lastHash).toHaveLength(64);
  });

  it("chains second invoice to first hash", async () => {
    const first = await withVerifactuOnDocument({
      doc: factura,
      profile,
      chain: null,
    });

    const secondDoc: Document = {
      ...factura,
      id: "doc-2",
      number: "F-2026-0002",
      date: "2026-06-10",
    };

    const second = await withVerifactuOnDocument({
      doc: secondDoc,
      profile,
      chain: first.chain,
    });

    expect(second.doc.verifactu?.previousHash).toBe(first.doc.verifactu?.recordHash);
    expect(second.chain?.recordCount).toBe(2);
  });
});
