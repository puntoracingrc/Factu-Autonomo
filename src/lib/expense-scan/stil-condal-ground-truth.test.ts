import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { resolveOptInFixturePath } from "../../../scripts/private-fixture-paths.mjs";
import { extractPdfScanHintsFromPdfBase64 } from "./pdf-table-lines";

interface StilCondalExpectedLine {
  index: number;
  productGroup: number;
  role: "main_product" | "component";
  code: string;
  description: string;
  quantity: number;
  dimensions: {
    width: number | null;
    heightOrLength: number | null;
    unit: "cm";
  };
  measurement: {
    basis: "m2" | "ml" | "unit";
    chargeQuantity: number;
  };
  unitPrice: number;
  discountPct: number | null;
  netPrice: number;
  amount: number;
}

interface StilCondalGroundTruth {
  privacy: {
    doNotCommitRawPdfToPublicRepo: boolean;
  };
  expected: {
    lineCount: number;
    productGroupCount: number;
    totals: {
      taxBase: number;
      vatAmount: number;
      total: number;
      advancePaid: number;
      amountDue: number;
    };
    lines: StilCondalExpectedLine[];
  };
}

const privatePdfPath = resolveOptInFixturePath("STIL_CONDAL_FIXTURE_PDF") ?? "";
const privateGroundTruthPath =
  resolveOptInFixturePath("STIL_CONDAL_GROUND_TRUTH_JSON") ?? "";
if (Boolean(privatePdfPath) !== Boolean(privateGroundTruthPath)) {
  throw new Error(
    "Las fixtures privadas STIL requieren STIL_CONDAL_FIXTURE_PDF y STIL_CONDAL_GROUND_TRUTH_JSON.",
  );
}
const testWithPrivateFixture =
  privatePdfPath && privateGroundTruthPath ? it : it.skip;

function readPrivateGroundTruth(): StilCondalGroundTruth {
  return JSON.parse(
    readFileSync(privateGroundTruthPath, "utf8"),
  ) as StilCondalGroundTruth;
}

function roundMoney(value: number): number {
  return Math.round(value * 100) / 100;
}

describe("Stil Condal private ground truth", () => {
  testWithPrivateFixture("mantiene el contrato esperado sin publicar datos reales", () => {
    const groundTruth = readPrivateGroundTruth();
    expect(groundTruth.privacy.doNotCommitRawPdfToPublicRepo).toBe(true);
    expect(groundTruth.expected.lineCount).toBeGreaterThan(0);
    expect(groundTruth.expected.productGroupCount).toBeGreaterThan(0);
    expect(
      roundMoney(
        groundTruth.expected.lines.reduce((sum, line) => sum + line.amount, 0),
      ),
    ).toBe(roundMoney(groundTruth.expected.totals.taxBase));
  });

  testWithPrivateFixture(
    "extrae las líneas con base de cálculo, neto y grupo de producto",
    async () => {
      const groundTruth = readPrivateGroundTruth();
      const base64 = readFileSync(privatePdfPath).toString("base64");
      const result = await extractPdfScanHintsFromPdfBase64(base64);
      const lines = result.stilCondal.lines;

      expect(result.debug.error).toBeUndefined();
      expect(lines).toHaveLength(groundTruth.expected.lineCount);
      expect(new Set(lines.map((line) => line.productGroupIndex)).size).toBe(
        groundTruth.expected.productGroupCount,
      );
      expect(
        roundMoney(
          lines.reduce((sum, line) => sum + (line.total ?? 0), 0),
        ),
      ).toBe(groundTruth.expected.totals.taxBase);

      for (const expected of groundTruth.expected.lines) {
        const line = lines[expected.index - 1];
        expect(line).toMatchObject({
          supplierReference: expected.code,
          description: expected.description,
          sourceQuantity: expected.quantity,
          quantity: expected.measurement.chargeQuantity,
          chargeQuantity: expected.measurement.chargeQuantity,
          calculationBasis: expected.measurement.basis,
          unitPrice: expected.unitPrice,
          netUnitPrice: expected.netPrice,
          total: expected.amount,
          productGroupIndex: expected.productGroup,
          productRole: expected.role,
        });

        if (expected.discountPct === null) {
          expect(line.discountPercent).toBeUndefined();
        } else {
          expect(line.discountPercent).toBe(expected.discountPct);
        }

        if (expected.measurement.basis === "m2") {
          expect(line.width).toBe(expected.dimensions.width);
          expect(line.height).toBe(expected.dimensions.heightOrLength);
          expect(line.calculationFormula).toBe("m2*netPrice");
        }
        if (expected.measurement.basis === "ml") {
          expect(line.length).toBe(expected.dimensions.heightOrLength);
          expect(line.calculationFormula).toBe("ml*netPrice");
        }
        if (expected.measurement.basis === "unit") {
          expect(line.calculationFormula).toBe("units*netPrice");
        }
      }
    },
  );
});
