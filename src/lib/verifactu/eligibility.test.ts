import { afterEach, describe, expect, it, vi } from "vitest";
import type { BusinessProfile, Document } from "../types";
import { DEFAULT_PROFILE } from "../types";
import { issueDocument } from "../document-integrity";
import { attestNewImportedDocument } from "../document-integrity/legacy-import-attestation";
import {
  isDocumentEligibleForVerifactuRegistration,
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

  it("excluye permanentemente un histórico importado v2 sin cambiar la elegibilidad de una factura emitida por la app", () => {
    const issuedByApp = issueDocument(
      {
        ...factura,
        status: "borrador",
        items: [
          {
            id: "line-1",
            description: "Servicio",
            quantity: 1,
            unitPrice: 100,
            ivaPercent: 21,
          },
        ],
      },
      profile,
      "2026-06-09T10:00:00.000Z",
    );
    const imported = attestNewImportedDocument(
      {
        ...factura,
        id: "pcfacturacion:factura:F-2024-0001",
        number: "F-2024-0001",
        date: "2024-02-12",
        items: [
          {
            id: "legacy-line-1",
            description: "Servicio histórico",
            quantity: 1,
            unitPrice: 100,
            ivaPercent: 21,
          },
        ],
        issuer: {
          name: "Emisor histórico",
          nif: "12345678Z",
          address: "Calle Uno 1",
          city: "Madrid",
          postalCode: "28001",
          capturedAt: "2024-02-12T10:00:00.000Z",
        },
        documentLifecycle: "issued",
        integrityLock: "locked",
      },
      profile,
      "pcfacturacion",
      "2026-07-13T08:00:00.000Z",
    );

    expect(imported.legacyImportAttestation?.schemaVersion).toBe(2);
    expect(
      isDocumentEligibleForVerifactuRegistration(imported, profile),
    ).toBe(false);
    expect(
      isDocumentEligibleForVerifactuRegistration(
        {
          ...imported,
          legacyImportAttestation: {
            ...imported.legacyImportAttestation!,
            attestationHash: "claim-corrupto",
          },
        },
        profile,
      ),
    ).toBe(false);
    expect(
      isDocumentEligibleForVerifactuRegistration(issuedByApp, profile),
    ).toBe(true);
    expect(needsVerifactuRegistration(imported, profile)).toBe(false);
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
