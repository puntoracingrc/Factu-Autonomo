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
    const document = factura();

    expect(
      resolveVerifactuRegistrationContext({
        doc: document,
        profile,
        chain: currentChain,
        profileOverride: historicalProfile,
        chainOverride: null,
      }),
    ).toEqual({
      doc: document,
      profile: historicalProfile,
      chain: null,
    });
  });

  it("no adjunta metadatos, QR ni avanza cadena en el cliente", async () => {
    const result = await withVerifactuOnDocument({
      doc: factura(),
      profile,
      chain: null,
    });

    expect(result.doc.verifactu).toBeUndefined();
    expect(result.doc.verifactuPersistence).toBeUndefined();
    expect(result.doc.documentSnapshot?.verifactu).toBeUndefined();
    expect(result.chain).toBeNull();
    expect(inspectDocumentSnapshotsIntegrity(result.doc).ok).toBe(true);
  });

  it("conserva sin cambios una cadena previa y no enlaza otra factura", async () => {
    const previousChain = {
      issuerNif: profile.nif,
      lastHash: "a".repeat(64),
      lastNumSerie: "F-2026-0001",
      lastFechaExpedicion: "2026-06-09",
      recordCount: 1,
    };
    const result = await withVerifactuOnDocument({
      doc: factura("doc-2", "F-2026-0002", "2026-06-10"),
      profile,
      chain: previousChain,
    });

    expect(result.doc.verifactu).toBeUndefined();
    expect(result.chain).toEqual(previousChain);
  });
});
