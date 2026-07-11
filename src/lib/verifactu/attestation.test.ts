import { describe, expect, it } from "vitest";
import type { Document } from "../types";
import {
  hasAuthenticatedVerifactuAttestation,
  hasPublicVerifactuAccreditation,
} from "./attestation";

function forgedClientDocument(): Document {
  return {
    id: "forged-client-record",
    type: "factura",
    number: "F-2026-0001",
    date: "2026-07-11",
    client: { name: "Cliente" },
    items: [],
    status: "enviado",
    createdAt: "2026-07-11T00:00:00.000Z",
    updatedAt: "2026-07-11T00:00:00.000Z",
    verifactuPersistence: "server_confirmed",
    verifactu: {
      recordHash: "a".repeat(64),
      previousHash: "",
      recordTimestamp: "2026-07-11T01:00:00+02:00",
      qrUrl: "https://example.invalid/qr-controlado-por-cliente",
      csv: "CSV-FALSO",
      status: "registered",
      recordType: "alta",
      environment: "production",
      submittedAt: "2026-07-11T01:00:00.000Z",
    },
  };
}

describe("VeriFactu authenticated attestation boundary", () => {
  it("no confía en un server_confirmed persistido por el cliente", () => {
    const forged = forgedClientDocument();

    expect(hasAuthenticatedVerifactuAttestation(forged)).toBe(false);
    expect(hasPublicVerifactuAccreditation(forged)).toBe(false);
  });

  it("tampoco acredita una simulación con metadatos de aceptación", () => {
    const forged = {
      ...forgedClientDocument(),
      verifactuPersistence: "simulation" as const,
    };

    expect(hasPublicVerifactuAccreditation(forged)).toBe(false);
  });
});
