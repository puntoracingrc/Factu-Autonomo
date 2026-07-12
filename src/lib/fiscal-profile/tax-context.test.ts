import { describe, expect, it } from "vitest";
import { DEFAULT_PROFILE } from "@/lib/types";
import {
  createImportedFiscalProfile,
  createManualFiscalProfile,
} from "./profile";
import { buildTaxContextFromBusinessProfile } from "./tax-context";

const NOW = "2026-07-12T12:00:00.000Z";

describe("business fiscal profile tax context adapter", () => {
  it("reuses a confirmed manual profile and its primary activity", () => {
    const fiscalProfile = createManualFiscalProfile(
      {
        taxpayerType: "SELF_EMPLOYED_IRPF",
        jurisdiction: "ES_COMMON",
        directTaxRegime: "DIRECT_ESTIMATION_SIMPLIFIED",
        vatRegime: "GENERAL",
        vatDeductionRight: "FULL",
        activities: [
          { code: "849.9", description: "Otros servicios" },
          { code: "763", description: "Programación", isPrimary: true },
        ],
      },
      NOW,
    );

    expect(
      buildTaxContextFromBusinessProfile(
        { ...DEFAULT_PROFILE, fiscalProfile },
        2026,
      ),
    ).toMatchObject({
      source: "FISCAL_PROFILE",
      selectedActivityIndex: 1,
      context: {
        taxpayerType: "SELF_EMPLOYED_IRPF",
        activityCode: "763",
        activityDescription: "Programación",
        vatRegime: "GENERAL",
        hasFullVatDeductionRight: true,
      },
    });
  });

  it("does not use an imported profile after the canonical NIF changes", () => {
    const fiscalProfile = createImportedFiscalProfile(
      {
        taxpayerType: "SELF_EMPLOYED_IRPF",
        jurisdiction: "ES_COMMON",
        directTaxRegime: "DIRECT_ESTIMATION_NORMAL",
        vatRegime: "GENERAL",
        vatDeductionRight: "FULL",
        activities: [{ description: "Consultoría" }],
        detectedNif: "12345678Z",
        documentKind: "AEAT_CENSUS_CERTIFICATE",
        warnings: [],
      },
      NOW,
      "MATCHED",
    );

    const result = buildTaxContextFromBusinessProfile(
      { ...DEFAULT_PROFILE, nif: "B12345678", fiscalProfile },
      2026,
    );

    expect(result.source).toBe("UNKNOWN");
    expect(result.context.taxpayerType).toBe("UNKNOWN");
    expect(result.warnings[0]).toContain("NIF actual");
  });

  it("preserves conflicts instead of silently overriding the VAT context", () => {
    const fiscalProfile = createManualFiscalProfile(
      {
        taxpayerType: "SELF_EMPLOYED_IRPF",
        jurisdiction: "ES_COMMON",
        directTaxRegime: "DIRECT_ESTIMATION_NORMAL",
        vatRegime: "GENERAL",
        vatDeductionRight: "FULL",
        activities: [{ description: "Consultoría" }],
      },
      NOW,
    );

    const result = buildTaxContextFromBusinessProfile(
      { ...DEFAULT_PROFILE, vatExempt: true, fiscalProfile },
      2026,
    );

    expect(result.context.vatRegime).toBe("UNKNOWN");
    expect(result.warnings[0]).toContain("contradice");
  });

  it("continues with unknown context when the user skips setup", () => {
    const result = buildTaxContextFromBusinessProfile(DEFAULT_PROFILE, 2026);

    expect(result).toMatchObject({
      source: "UNKNOWN",
      context: {
        jurisdiction: "UNKNOWN",
        taxpayerType: "UNKNOWN",
        activityDescription: "",
      },
    });
  });
});
