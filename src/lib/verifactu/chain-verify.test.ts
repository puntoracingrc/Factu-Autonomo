import { describe, expect, it } from "vitest";
import type { BusinessProfile, Document } from "../types";
import { DEFAULT_PROFILE } from "../types";
import {
  attachRegisteredVerifactuToSnapshots,
  issueDocument,
} from "../document-integrity";
import { verifyDocumentHashChain } from "./chain-verify";

const profile: BusinessProfile = {
  ...DEFAULT_PROFILE,
  nif: "89890001K",
  name: "Test Emisor",
  address: "Calle 1",
  city: "Madrid",
  postalCode: "28001",
  verifactu: { enabled: true, environment: "test", optInVersion: 1 },
};

function invoice(id: string, number: string, date: string): Document {
  return issueDocument({
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
    status: "borrador",
    createdAt: "",
    updatedAt: "",
  }, profile, `${date}T09:00:00.000Z`);
}

describe("verifyDocumentHashChain", () => {
  it("no presenta un server_confirmed controlado por cliente como cadena autenticada", async () => {
    const issued = invoice("1", "F-2026-0001", "2026-06-09");
    const clientControlled = attachRegisteredVerifactuToSnapshots({
      ...issued,
      verifactu: {
        recordHash: "a".repeat(64),
        previousHash: "",
        recordTimestamp: "2026-06-09T09:01:00.000Z",
        qrUrl: "https://example.invalid/client-controlled",
        status: "test_registered",
        recordType: "alta",
        environment: "test",
      },
      verifactuPersistence: "server_confirmed",
    });

    const result = await verifyDocumentHashChain({
      documents: [clientControlled],
      profile,
    });

    expect(result).toEqual({ ok: true, checked: 0, errors: [] });
  });

  it("tampoco presenta simulaciones ni registros legacy como cadena confirmada", async () => {
    const issued = invoice("1", "F-2026-0001", "2026-06-09");
    const sealed = attachRegisteredVerifactuToSnapshots({
      ...issued,
      verifactu: {
        recordHash: "b".repeat(64),
        previousHash: "",
        recordTimestamp: "2026-06-09T09:01:00.000Z",
        qrUrl: "https://example.invalid/historical",
        status: "test_registered",
        recordType: "alta",
        environment: "test",
      },
      verifactuPersistence: "server_confirmed",
    });

    const result = await verifyDocumentHashChain({
      documents: [
        { ...sealed, verifactuPersistence: "simulation" },
        { ...sealed, id: "legacy", verifactuPersistence: "legacy_unverified" },
      ],
      profile,
    });

    expect(result).toEqual({ ok: true, checked: 0, errors: [] });
  });
});
