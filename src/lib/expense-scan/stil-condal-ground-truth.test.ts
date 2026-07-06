import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
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

const groundTruthPath = path.join(
  process.cwd(),
  "test/fixtures/invoices/private_real/ground_truth/stil_condal_FC121021478.expected.json",
);
const groundTruth = JSON.parse(
  readFileSync(groundTruthPath, "utf8"),
) as StilCondalGroundTruth;

const privatePdfPath =
  process.env.STIL_CONDAL_FIXTURE_PDF ??
  "/Users/macbookpro14/Desktop/stil/Factura_FC121021478.pdf";
const testWithPrivatePdf = existsSync(privatePdfPath) ? it : it.skip;

function roundMoney(value: number): number {
  return Math.round(value * 100) / 100;
}

describe("Stil Condal private ground truth", () => {
  it("mantiene el contrato esperado sin publicar el PDF real", () => {
    expect(groundTruth.privacy.doNotCommitRawPdfToPublicRepo).toBe(true);
    expect(groundTruth.expected.lineCount).toBe(40);
    expect(groundTruth.expected.productGroupCount).toBe(8);
    expect(groundTruth.expected.totals).toMatchObject({
      taxBase: 3118.51,
      vatAmount: 654.89,
      total: 3773.4,
      advancePaid: 3773.4,
      amountDue: 0,
    });
    expect(
      roundMoney(
        groundTruth.expected.lines.reduce((sum, line) => sum + line.amount, 0),
      ),
    ).toBe(3118.51);
  });

  testWithPrivatePdf(
    "extrae las 40 líneas con base de cálculo, neto y grupo de producto",
    async () => {
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
