import { beforeEach, describe, expect, it, vi } from "vitest";
import type {
  BusinessProfile,
  Document,
  VerifactuChainState,
} from "../types";
import { DEFAULT_PROFILE } from "../types";
import { finalizeVerifactuDocument } from "./finalize";
import {
  resolveVerifactuRegistrationContext,
  withVerifactuOnDocument,
} from "./store";

const { submitVerifactuToServerMock } = vi.hoisted(() => ({
  submitVerifactuToServerMock: vi.fn(),
}));

vi.mock("./client-api", () => ({
  submitVerifactuToServer: submitVerifactuToServerMock,
}));

const historicalProfile: BusinessProfile = {
  ...DEFAULT_PROFILE,
  name: "Emisor histórico",
  nif: "12345678Z",
  vatExempt: false,
  iva: { rates: [21], defaultRate: 21 },
  verifactu: { enabled: true, environment: "test" },
};

const currentProfile: BusinessProfile = {
  ...historicalProfile,
  name: "Emisor actual",
  vatExempt: true,
  iva: { rates: [0], defaultRate: 0 },
};

const historicalChain: VerifactuChainState = {
  issuerNif: "12345678Z",
  lastHash: "A".repeat(64),
  lastNumSerie: "F-2026-0001",
  lastFechaExpedicion: "2026-06-01",
  recordCount: 1,
};

const currentChain: VerifactuChainState = {
  issuerNif: "12345678Z",
  lastHash: "B".repeat(64),
  lastNumSerie: "F-2026-0099",
  lastFechaExpedicion: "2026-07-10",
  recordCount: 99,
};

const rectification: Document = {
  id: "rectification-1",
  type: "factura",
  number: "FR-2026-0001",
  date: "2026-07-11",
  client: { name: "Cliente" },
  items: [
    {
      id: "line-1",
      description: "Rectificación",
      quantity: 1,
      unitPrice: -100,
      ivaPercent: 21,
    },
  ],
  status: "enviado",
  rectification: {
    originalDocumentId: "invoice-1",
    originalNumber: "F-2026-0001",
    originalDate: "2026-06-01",
    reason: "Corrección",
    type: "correccion",
  },
  issuer: {
    name: historicalProfile.name,
    nif: historicalProfile.nif,
    address: historicalProfile.address,
    city: historicalProfile.city,
    postalCode: historicalProfile.postalCode,
    capturedAt: "2026-06-01T10:00:00.000Z",
  },
  createdAt: "2026-07-11T10:00:00.000Z",
  updatedAt: "2026-07-11T10:00:00.000Z",
};

describe("finalizeVerifactuDocument", () => {
  beforeEach(() => {
    submitVerifactuToServerMock.mockReset();
  });

  it("usa perfil y cadena efectivos en el fallback local de una rectificativa", async () => {
    submitVerifactuToServerMock.mockResolvedValue(null);

    const result = await finalizeVerifactuDocument({
      doc: rectification,
      profile: historicalProfile,
      chain: historicalChain,
      authToken: "test-token",
      registerLocal: async (doc, chainOverride, profileOverride) => {
        const context = resolveVerifactuRegistrationContext({
          doc,
          profile: currentProfile,
          chain: currentChain,
          profileOverride,
          chainOverride,
        });
        return (await withVerifactuOnDocument(context)).doc;
      },
    });

    expect(result.verifactu).toMatchObject({
      previousHash: historicalChain.lastHash,
      cuotaTotal: "-21.00",
      importeTotal: "-121.00",
    });
  });

  it("propaga perfil y cadena efectivos al persistir el registro del servidor", async () => {
    const serverChain: VerifactuChainState = {
      ...historicalChain,
      lastHash: "C".repeat(64),
      lastNumSerie: rectification.number,
      lastFechaExpedicion: rectification.date,
      recordCount: 2,
    };
    const serverVerifactu: NonNullable<Document["verifactu"]> = {
      recordHash: serverChain.lastHash,
      previousHash: historicalChain.lastHash,
      recordTimestamp: "2026-07-11T12:00:00+02:00",
      qrUrl: "https://prewww2.aeat.es/verifactu",
      status: "test_registered",
      recordType: "alta",
      environment: "test",
      tipoFactura: "R4",
      cuotaTotal: "-21.00",
      importeTotal: "-121.00",
    };
    submitVerifactuToServerMock.mockResolvedValue({
      verifactu: serverVerifactu,
      chain: serverChain,
      persisted: true,
    });
    const registerLocal = vi.fn(async (doc: Document) => doc);

    const result = await finalizeVerifactuDocument({
      doc: rectification,
      profile: historicalProfile,
      chain: historicalChain,
      authToken: "test-token",
      registerLocal,
    });

    expect(result.verifactu).toEqual(serverVerifactu);
    expect(registerLocal).toHaveBeenCalledWith(
      expect.objectContaining({ verifactu: serverVerifactu }),
      serverChain,
      historicalProfile,
    );
  });
});
