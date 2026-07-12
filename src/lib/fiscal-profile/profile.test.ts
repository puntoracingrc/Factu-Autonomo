import { describe, expect, it } from "vitest";
import {
  createImportedFiscalProfile,
  createManualFiscalProfile,
  createSkippedFiscalProfile,
  fiscalProfileMissingLabels,
  inferTaxpayerTypeFromSpanishTaxId,
  normalizeBusinessFiscalProfile,
} from "./profile";

const NOW = "2026-07-12T12:00:00.000Z";

describe("business fiscal profile", () => {
  it.each([
    ["12345678Z", "SELF_EMPLOYED_IRPF"],
    ["X1234567L", "SELF_EMPLOYED_IRPF"],
    ["B12345678", "COMPANY_IS"],
    ["mal", null],
  ])("suggests the apparent taxpayer kind for %s", (nif, expected) => {
    expect(inferTaxpayerTypeFromSpanishTaxId(nif)).toBe(expected);
  });

  it("normalizes a manual partial profile without making fields mandatory", () => {
    const profile = createManualFiscalProfile(
      {
        taxpayerType: "SELF_EMPLOYED_IRPF",
        jurisdiction: "ES_COMMON",
        directTaxRegime: "UNKNOWN",
        vatRegime: "GENERAL",
        vatDeductionRight: "UNKNOWN",
        activities: [{ code: " 763 ", description: "  Consultoría   informática " }],
      },
      NOW,
    );

    expect(profile.activities).toEqual([
      { code: "763", description: "Consultoría informática" },
    ]);
    expect(fiscalProfileMissingLabels(profile)).toEqual([
      "régimen de IRPF",
      "derecho general a deducir IVA",
    ]);
  });

  it("persists only minimal document provenance and not the raw CSV", () => {
    const profile = createImportedFiscalProfile(
      {
        taxpayerType: "SELF_EMPLOYED_IRPF",
        jurisdiction: "ES_COMMON",
        directTaxRegime: "DIRECT_ESTIMATION_SIMPLIFIED",
        vatRegime: "GENERAL",
        vatDeductionRight: "FULL",
        activities: [{ code: "763", description: "Programación" }],
        detectedNif: "12345678Z",
        documentDate: "2026-07-12",
        csv: "PRIVATE-CSV-1234",
        documentKind: "AEAT_CENSUS_CERTIFICATE",
        warnings: [],
      },
      NOW,
      "MATCHED",
    );

    expect(profile.source).toMatchObject({
      kind: "AEAT_CENSUS_CERTIFICATE",
      identityMatch: "MATCHED",
      matchedTaxId: "12345678Z",
      csv: { detected: true, verificationStatus: "PENDING_VERIFICATION" },
    });
    expect(JSON.stringify(profile)).not.toContain("PRIVATE-CSV-1234");
  });

  it("keeps an explicit skipped state and normalizes hostile persisted data", () => {
    expect(createSkippedFiscalProfile(NOW).setupStatus).toBe("SKIPPED");
    const normalized = normalizeBusinessFiscalProfile(
      {
        schemaVersion: 1,
        setupStatus: "CONFIGURED",
        taxpayerType: "ROOT",
        jurisdiction: "ES_COMMON",
        directTaxRegime: "DIRECT_ESTIMATION_NORMAL",
        vatRegime: "GENERAL",
        vatDeductionRight: "FULL",
        activities: [
          { code: "763", description: "Consultoría" },
          { code: "763", description: "Consultoría" },
          { description: 123 },
        ],
        source: {
          kind: "MANUAL",
          confirmedAt: NOW,
          identityMatch: "MISMATCH",
          csv: { detected: true, value: "MUST-NOT-SURVIVE" },
        },
      },
    );

    expect(normalized).toMatchObject({
      taxpayerType: "UNKNOWN",
      activities: [{ code: "763", description: "Consultoría" }],
      source: {
        confirmedAt: NOW,
        identityMatch: "NOT_CHECKED",
        csv: { detected: true, verificationStatus: "PENDING_VERIFICATION" },
      },
    });
    expect(JSON.stringify(normalized)).not.toContain("MUST-NOT-SURVIVE");
  });

  it("rechaza versiones futuras y fechas de confirmación inventadas", () => {
    const base = {
      schemaVersion: 1,
      setupStatus: "CONFIGURED",
      taxpayerType: "SELF_EMPLOYED_IRPF",
      jurisdiction: "ES_COMMON",
      directTaxRegime: "DIRECT_ESTIMATION_NORMAL",
      vatRegime: "GENERAL",
      vatDeductionRight: "FULL",
      activities: [],
      source: {
        kind: "MANUAL",
        confirmedAt: NOW,
        identityMatch: "NOT_CHECKED",
      },
    };

    expect(
      normalizeBusinessFiscalProfile({ ...base, schemaVersion: 2 }),
    ).toBeUndefined();
    expect(
      normalizeBusinessFiscalProfile({
        ...base,
        source: { ...base.source, confirmedAt: "not-a-date" },
      }),
    ).toBeUndefined();
  });

  it("impide atribuir procedencia AEAT a un PDF no reconocido", () => {
    expect(() =>
      createImportedFiscalProfile(
        {
          taxpayerType: "UNKNOWN",
          jurisdiction: "UNKNOWN",
          directTaxRegime: "UNKNOWN",
          vatRegime: "UNKNOWN",
          vatDeductionRight: "UNKNOWN",
          activities: [],
          detectedNif: "12345678Z",
          documentKind: "UNKNOWN",
          warnings: [],
        },
        NOW,
        "MATCHED",
      ),
    ).toThrow(/no se ha reconocido/i);
  });
});
