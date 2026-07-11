import { describe, expect, it } from "vitest";
import type { BusinessProfile, Document } from "../types";
import { DEFAULT_PROFILE } from "../types";
import {
  attachRegisteredVerifactuToSnapshots,
  issueDocument,
} from "../document-integrity";
import { registerDocumentVerifactu } from "./register";
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
  it("validates a chained sequence", async () => {
    const firstDoc = invoice("1", "F-2026-0001", "2026-06-09");
    const first = await registerDocumentVerifactu({
      doc: firstDoc,
      profile,
    });
    const secondDoc = invoice("2", "F-2026-0002", "2026-06-10");
    const second = await registerDocumentVerifactu({
      doc: secondDoc,
      profile,
      chain: first?.chain,
    });

    const docs = [
      attachRegisteredVerifactuToSnapshots({
        ...firstDoc,
        verifactu: first!.verifactu,
        verifactuPersistence: "server_confirmed",
      }),
      attachRegisteredVerifactuToSnapshots({
        ...secondDoc,
        verifactu: second!.verifactu,
        verifactuPersistence: "server_confirmed",
      }),
    ];

    const result = await verifyDocumentHashChain({ documents: docs, profile });
    expect(result.ok).toBe(true);
    expect(result.checked).toBe(2);
    expect(result.errors).toHaveLength(0);
  });

  it("detects tampered hash", async () => {
    const issued = invoice("1", "F-2026-0001", "2026-06-09");
    const reg = await registerDocumentVerifactu({
      doc: issued,
      profile,
    });
    const registered = attachRegisteredVerifactuToSnapshots({
      ...issued,
      verifactu: reg!.verifactu,
      verifactuPersistence: "server_confirmed",
    });
    const tampered: Document = {
      ...registered,
      verifactu: {
        ...registered.verifactu!,
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

  it("no presenta simulaciones ni registros legacy como cadena confirmada", async () => {
    const issued = invoice("1", "F-2026-0001", "2026-06-09");
    const reg = await registerDocumentVerifactu({ doc: issued, profile });
    const simulated = attachRegisteredVerifactuToSnapshots({
      ...issued,
      verifactu: reg!.verifactu,
      verifactuPersistence: "simulation",
    });

    const result = await verifyDocumentHashChain({
      documents: [
        simulated,
        { ...simulated, id: "legacy", verifactuPersistence: "legacy_unverified" },
      ],
      profile,
    });

    expect(result).toEqual({ ok: true, checked: 0, errors: [] });
  });
});
