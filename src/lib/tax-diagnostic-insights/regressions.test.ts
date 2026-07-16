import { describe, expect, it } from "vitest";
import {
  sha256RegressionFixture,
  TAX_DIAGNOSTIC_REGRESSION_FLOW,
  validateTaxDiagnosticRegressionManifest,
  type TaxDiagnosticRegressionManifest,
} from "./regressions";

function valid(): TaxDiagnosticRegressionManifest {
  return {
    regressionId: "model-036-layout-v3",
    classification: "FIELD_EXTRACTION_PROBLEM",
    origin: "SYNTHETIC_REGRESSION",
    family: "MODEL_036",
    fiscalYear: 2026,
    layout: "SYNTHETIC_V3",
    affectedField: "vatRegime",
    affectedQuestionId: "E_VAT_REGIMES",
    expectedOutput: { status: "PREFILLED_NEEDS_CONFIRMATION" },
    mustNotInfer: ["CURRENT_OBLIGATION_FROM_HISTORICAL_RETURN"],
    associatedTest: "extractors.model036.layoutv3",
    fixtureSha256: sha256RegressionFixture("synthetic fixture"),
  };
}

describe("tax diagnostic regression intake", () => {
  it("encodes the mandatory signal-to-comparison flow", () => {
    expect(TAX_DIAGNOSTIC_REGRESSION_FLOW).toEqual([
      "AGGREGATED_SIGNAL", "PII_FREE_REPRODUCTION", "PROBLEM_CLASSIFICATION",
      "FAILING_REGRESSION_TEST", "MINIMAL_CORRECTION", "FULL_SUITE",
      "DEPLOYMENT", "POST_DEPLOYMENT_COMPARISON",
    ]);
  });

  it("accepts a synthetic, hashed and test-linked reproduction", () => {
    expect(validateTaxDiagnosticRegressionManifest(valid())).toEqual([]);
  });

  it("rejects personal/raw fields and unhashed fixtures", () => {
    const manifest = valid();
    manifest.expectedOutput = { rawText: "NIF" };
    manifest.fixtureSha256 = "pending";
    expect(validateTaxDiagnosticRegressionManifest(manifest)).toEqual(
      expect.arrayContaining(["INVALID_FIXTURE_HASH", "POSSIBLE_PERSONAL_OR_RAW_DATA"]),
    );
  });
});
