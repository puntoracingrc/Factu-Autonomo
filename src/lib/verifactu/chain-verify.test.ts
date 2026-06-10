import { describe, expect, it } from "vitest";
import type { BusinessProfile, Document } from "../types";
import { DEFAULT_PROFILE } from "../types";
import { registerDocumentVerifactu } from "./register";
import { verifyDocumentHashChain } from "./chain-verify";

const profile: BusinessProfile = {
  ...DEFAULT_PROFILE,
  nif: "89890001K",
  name: "Test Emisor",
  address: "Calle 1",
  city: "Madrid",
  postalCode: "28001",
  verifactu: { enabled: true, environment: "test" },
};

function invoice(id: string, number: string, date: string): Document {
  return {
    id,
    type: "factura",
    number,
    date,
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
    createdAt: "",
    updatedAt: "",
  };
}

describe("verifyDocumentHashChain", () => {
  it("validates a chained sequence", async () => {
    const first = await registerDocumentVerifactu({
      doc: invoice("1", "F-2026-0001", "2026-06-09"),
      profile,
    });
    const second = await registerDocumentVerifactu({
      doc: invoice("2", "F-2026-0002", "2026-06-10"),
      profile,
      chain: first?.chain,
    });

    const docs = [
      { ...invoice("1", "F-2026-0001", "2026-06-09"), verifactu: first!.verifactu },
      { ...invoice("2", "F-2026-0002", "2026-06-10"), verifactu: second!.verifactu },
    ];

    const result = await verifyDocumentHashChain({ documents: docs, profile });
    expect(result.ok).toBe(true);
    expect(result.checked).toBe(2);
    expect(result.errors).toHaveLength(0);
  });

  it("detects tampered hash", async () => {
    const reg = await registerDocumentVerifactu({
      doc: invoice("1", "F-2026-0001", "2026-06-09"),
      profile,
    });
    const tampered: Document = {
      ...invoice("1", "F-2026-0001", "2026-06-09"),
      verifactu: {
        ...reg!.verifactu,
        recordHash: "0".repeat(64),
      },
    };

    const result = await verifyDocumentHashChain({
      documents: [tampered],
      profile,
    });
    expect(result.ok).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
  });
});
