import { describe, expect, it } from "vitest";
import type { BusinessProfile, Document } from "../types";
import { DEFAULT_PROFILE } from "../types";
import {
  inspectDocumentSnapshotsIntegrity,
  issueDocument,
} from "../document-integrity";
import {
  resolveVerifactuRegistrationContext,
  withVerifactuOnDocument,
} from "./store";

const profile: BusinessProfile = {
  ...DEFAULT_PROFILE,
  nif: "12345678Z",
  verifactu: { enabled: true, environment: "test", optInVersion: 1 },
};

function factura(
  id = "doc-1",
  number = "F-2026-0001",
  date = "2026-06-09",
): Document {
  return issueDocument(
    {
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
      createdAt: `${date}T10:00:00.000Z`,
      updatedAt: `${date}T10:00:00.000Z`,
    },
    profile,
    `${date}T10:00:00.000Z`,
  );
}

describe("withVerifactuOnDocument", () => {
  it("respeta un perfil histórico y una cadena nula explícitos", () => {
    const currentChain = {
      issuerNif: profile.nif,
      lastHash: "A".repeat(64),
      recordCount: 1,
    };
    const historicalProfile = { ...profile, name: "Emisor histórico" };

    expect(
      resolveVerifactuRegistrationContext({
        doc: factura(),
        profile,
        chain: currentChain,
        profileOverride: historicalProfile,
        chainOverride: null,
      }),
    ).toEqual({
      doc: factura(),
      profile: historicalProfile,
      chain: null,
    });
  });

  it("attaches verifactu metadata and advances chain", async () => {
    const result = await withVerifactuOnDocument({
      doc: factura(),
      profile,
      chain: null,
    });

    expect(result.doc.verifactu?.qrUrl).toContain("prewww2.aeat.es");
    expect(result.chain?.recordCount).toBe(1);
    expect(result.chain?.lastHash).toHaveLength(64);
    expect(result.chain?.lastNumSerie).toBe("F-2026-0001");
    expect(result.chain?.lastFechaExpedicion).toBe("2026-06-09");
    expect(result.doc.documentSnapshot?.verifactu?.recordHash).toBe(
      result.doc.verifactu?.recordHash,
    );
    expect(inspectDocumentSnapshotsIntegrity(result.doc).ok).toBe(true);
  });

  it("chains second invoice to first hash", async () => {
    const first = await withVerifactuOnDocument({
      doc: factura(),
      profile,
      chain: null,
    });

    const secondDoc = factura("doc-2", "F-2026-0002", "2026-06-10");

    const second = await withVerifactuOnDocument({
      doc: secondDoc,
      profile,
      chain: first.chain,
    });

    expect(second.doc.verifactu?.previousHash).toBe(first.doc.verifactu?.recordHash);
    expect(second.chain?.recordCount).toBe(2);
    expect(second.chain?.lastNumSerie).toBe("F-2026-0002");
  });
});
