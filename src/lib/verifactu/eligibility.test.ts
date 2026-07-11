import { afterEach, describe, expect, it, vi } from "vitest";
import type { BusinessProfile, Document } from "../types";
import { DEFAULT_PROFILE } from "../types";
import {
  isVerifactuEnabled,
  isVerifactuSubmissionAvailable,
  normalizeVerifactuSettings,
  needsVerifactuRegistration,
  verifactuRecordType,
} from "./eligibility";

const profile: BusinessProfile = {
  ...DEFAULT_PROFILE,
  nif: "12345678Z",
  verifactu: { enabled: true, environment: "test", optInVersion: 1 },
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

  it("permanece desactivado hasta que el usuario lo activa expresamente", () => {
    expect(normalizeVerifactuSettings()).toEqual({
      enabled: false,
      environment: "test",
    });
    expect(DEFAULT_PROFILE.verifactu?.enabled).toBe(false);
  });

  it("normaliza producción a pruebas si no está habilitada explícitamente", () => {
    expect(
      normalizeVerifactuSettings({ enabled: true, environment: "production" }),
    ).toEqual({ enabled: false, environment: "test" });
  });

  it("conserva la preferencia de producción sin convertirla en disponibilidad efectiva", () => {
    vi.stubEnv("NEXT_PUBLIC_VERIFACTU_ALLOW_PRODUCTION", "true");
    expect(
      normalizeVerifactuSettings({
        enabled: true,
        environment: "production",
        optInVersion: 1,
      }),
    ).toEqual({
      enabled: true,
      environment: "production",
      optInVersion: 1,
    });
    expect(isVerifactuEnabled(profile)).toBe(false);
  });

  it("mantiene el registro inactivo mientras la ruta y la atestación no están disponibles", () => {
    expect(isVerifactuSubmissionAvailable()).toBe(false);
    expect(isVerifactuEnabled(profile)).toBe(false);
    expect(needsVerifactuRegistration(factura, profile)).toBe(false);
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
    ).toBe(false);
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
