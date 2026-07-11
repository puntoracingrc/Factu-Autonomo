import { afterEach, describe, expect, it, vi } from "vitest";
import {
  attachRegisteredVerifactuToSnapshots,
  issueDocument,
} from "@/lib/document-integrity";
import { DEFAULT_PROFILE, type BusinessProfile, type Document } from "@/lib/types";
import { finalizeVerifactuDocument } from "./finalize";

const profile: BusinessProfile = {
  ...DEFAULT_PROFILE,
  name: "Emisor de pruebas",
  nif: "12345678Z",
  verifactu: { enabled: true, environment: "test", optInVersion: 1 },
};

function issuedInvoice(unitPrice = 100): Document {
  return issueDocument(
    {
      id: "vf-preflight",
      type: "factura",
      number: "F-2026-0042",
      date: "2026-07-11",
      client: { name: "Cliente" },
      items: [
        {
          id: "line-1",
          description: "Servicio",
          quantity: 1,
          unitPrice,
          ivaPercent: 21,
        },
      ],
      status: "borrador",
      createdAt: "2026-07-11T00:00:00.000Z",
      updatedAt: "2026-07-11T00:00:00.000Z",
    },
    profile,
    "2026-07-11T00:00:00.000Z",
  );
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("finalizeVerifactuDocument snapshot preflight", () => {
  it("no hace fetch ni mutación local si el snapshot está manipulado", async () => {
    const issued = issuedInvoice();
    const other = issuedInvoice(200);
    const tampered: Document = {
      ...issued,
      documentSnapshot: other.documentSnapshot,
      pdfSnapshot: other.pdfSnapshot,
    };
    const fetchMock = vi.fn();
    const registerLocal = vi.fn(async (doc: Document) => doc);
    vi.stubGlobal("fetch", fetchMock);

    await expect(
      finalizeVerifactuDocument({
        doc: tampered,
        profile,
        registerLocal,
        authToken: "token-de-prueba",
      }),
    ).rejects.toThrow("no supera la comprobación de integridad");
    expect(fetchMock).not.toHaveBeenCalled();
    expect(registerLocal).not.toHaveBeenCalled();
  });

  it("informa que el registro está desactivado sin fabricar registro", async () => {
    const issued = issuedInvoice();
    const drifted: Document = {
      ...issued,
      number: "FALSA-VIVA",
      items: [{ ...issued.items[0], unitPrice: 999 }],
    };
    const registerLocal = vi.fn(async (doc: Document) => doc);

    await expect(
      finalizeVerifactuDocument({
        doc: drifted,
        profile,
        registerLocal,
        authToken: "",
      }),
    ).rejects.toThrow("está desactivado en el servidor");
    expect(registerLocal).not.toHaveBeenCalled();
  });

  it("no permite que el estado VeriFactu vivo omita la evaluación canónica", async () => {
    const issued = issuedInvoice();
    const drifted: Document = {
      ...issued,
      verifactu: {
        status: "test_registered",
        recordHash: "falso-vivo",
        previousHash: "",
        recordTimestamp: "2026-07-11T01:00:00+02:00",
        qrUrl: "https://example.invalid/falso",
        recordType: "alta",
        environment: "test",
        submittedAt: "2026-07-11T01:00:00.000Z",
      },
    };
    const registerLocal = vi.fn(async (doc: Document) => doc);

    await expect(
      finalizeVerifactuDocument({
        doc: drifted,
        profile,
        registerLocal,
        authToken: "",
      }),
    ).rejects.toThrow("está desactivado en el servidor");

    expect(registerLocal).not.toHaveBeenCalled();
  });

  it("bloquea una transición simulación a real antes de cualquier efecto remoto", async () => {
    const issued = issuedInvoice();
    const historicalSimulation = {
      ...attachRegisteredVerifactuToSnapshots({
        ...issued,
        verifactuPersistence: "server_confirmed",
        verifactu: {
          status: "test_registered",
          recordHash: "a".repeat(64),
          previousHash: "",
          recordTimestamp: "2026-07-11T01:00:00+02:00",
          qrUrl: "https://example.invalid/legacy-simulation",
          recordType: "alta",
          environment: "test",
          submittedAt: "2026-07-11T01:00:00.000Z",
        },
      }),
      verifactuPersistence: "simulation" as const,
    };
    const before = structuredClone(historicalSimulation);
    const fetchMock = vi.fn();
    const registerLocal = vi.fn(async (doc: Document) => doc);
    vi.stubGlobal("fetch", fetchMock);

    await expect(
      finalizeVerifactuDocument({
        doc: historicalSimulation,
        profile,
        registerLocal,
        authToken: "token-de-prueba",
      }),
    ).rejects.toThrow("reconciliación de una simulación local");

    expect(fetchMock).not.toHaveBeenCalled();
    expect(registerLocal).not.toHaveBeenCalled();
    expect(historicalSimulation).toEqual(before);
  });

  it("bloquea evidencia legacy no reconciliada antes de cualquier efecto remoto", async () => {
    const issued = issuedInvoice();
    const historicalLegacy = {
      ...attachRegisteredVerifactuToSnapshots({
        ...issued,
        verifactuPersistence: "server_confirmed",
        verifactu: {
          status: "test_registered",
          recordHash: "b".repeat(64),
          previousHash: "",
          recordTimestamp: "2026-07-11T01:00:00+02:00",
          qrUrl: "https://example.invalid/legacy-unverified",
          recordType: "alta",
          environment: "test",
        },
      }),
      verifactuPersistence: "legacy_unverified" as const,
    };
    const fetchMock = vi.fn();
    const registerLocal = vi.fn(async (doc: Document) => doc);
    vi.stubGlobal("fetch", fetchMock);

    await expect(
      finalizeVerifactuDocument({
        doc: historicalLegacy,
        profile,
        registerLocal,
        authToken: "token-de-prueba",
      }),
    ).rejects.toThrow("evidencia Veri*Factu no atestada");

    expect(fetchMock).not.toHaveBeenCalled();
    expect(registerLocal).not.toHaveBeenCalled();
  });
});
