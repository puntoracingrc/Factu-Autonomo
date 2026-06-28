import { afterEach, describe, expect, it, vi } from "vitest";
import type { BusinessProfile, Document } from "../types";
import { DEFAULT_PROFILE } from "../types";
import {
  normalizeVerifactuSettings,
  needsVerifactuRegistration,
  verifactuRecordType,
} from "./eligibility";

const profile: BusinessProfile = {
  ...DEFAULT_PROFILE,
  nif: "12345678Z",
  verifactu: { enabled: true, environment: "test" },
};

const factura: Document = {
  id: "1",
  type: "factura",
  number: "F-2026-0001",
  date: "2026-06-09",
  client: { name: "A" },
  items: [],
  status: "enviado",
  createdAt: "",
  updatedAt: "",
};

describe("verifactu eligibility", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("normaliza producción a pruebas si no está habilitada explícitamente", () => {
    expect(
      normalizeVerifactuSettings({ enabled: true, environment: "production" }),
    ).toEqual({ enabled: true, environment: "test" });
  });

  it("permite producción solo con marca pública explícita", () => {
    vi.stubEnv("NEXT_PUBLIC_VERIFACTU_ALLOW_PRODUCTION", "true");
    expect(
      normalizeVerifactuSettings({ enabled: true, environment: "production" }),
    ).toEqual({ enabled: true, environment: "production" });
  });

  it("requires registration for emitted factura", () => {
    expect(needsVerifactuRegistration(factura, profile)).toBe(true);
  });

  it("no requiere registro si falta NIF de emisor", () => {
    expect(
      needsVerifactuRegistration(factura, { ...profile, nif: "" }),
    ).toBe(false);
  });

  it("usa el NIF congelado del emisor si existe snapshot vivo en el documento", () => {
    expect(
      needsVerifactuRegistration(
        {
          ...factura,
          issuer: {
            name: "Emisor histórico",
            nif: "B12345678",
            address: "Calle 1",
            city: "Madrid",
            postalCode: "28001",
            capturedAt: "2026-06-01T10:00:00.000Z",
          },
        },
        { ...profile, nif: "" },
      ),
    ).toBe(true);
  });

  it("skips presupuestos", () => {
    expect(
      needsVerifactuRegistration({ ...factura, type: "presupuesto" }, profile),
    ).toBe(false);
  });

  it("treats rectificativa anulacion as alta (R1 in TipoFactura)", () => {
    expect(
      verifactuRecordType({
        ...factura,
        rectification: {
          originalDocumentId: "x",
          originalNumber: "F-1",
          originalDate: "2026-01-01",
          reason: "Error",
          type: "anulacion",
        },
      }),
    ).toBe("alta");
  });
});
