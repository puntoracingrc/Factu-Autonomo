import { existsSync } from "node:fs";

import { describe, expect, it } from "vitest";

import {
  calculationBasisFromUnit,
  compareInvoices,
  discoverInvoiceFixtures,
  formulaForBasis,
  normalizeDate,
  normalizeExpectedInvoice,
  normalizeMoney,
  parseInvoicePdf,
  parseStilCondalPdf,
  readJson,
} from "./lib.mjs";

const privateStilPdfPath = "/Users/macbookpro14/Desktop/stil/Factura_FC121021478.pdf";
const testWithPrivateStilPdf = existsSync(privateStilPdfPath) ? it : it.skip;

describe("invoice benchmark helpers", () => {
  it("normalizes Spanish money and dates", () => {
    expect(normalizeMoney("1.234,56 €")).toBe(1234.56);
    expect(normalizeMoney("-185,07 €")).toBe(-185.07);
    expect(normalizeDate("07/06/2026")).toBe("2026-06-07");
  });

  it("maps billing units to calculation basis without recalculating dimensions", () => {
    expect(calculationBasisFromUnit("M2")).toBe("m2");
    expect(calculationBasisFromUnit("ML")).toBe("ml");
    expect(calculationBasisFromUnit("kg")).toBe("kg");
    expect(calculationBasisFromUnit("h")).toBe("hour");
    expect(formulaForBasis("m2")).toBe("m2 * netPrice");
    expect(formulaForBasis("ml")).toBe("ml * netPrice");
  });

  it("discovers the imported synthetic and private fixtures", () => {
    const fixtures = discoverInvoiceFixtures();
    expect(fixtures.filter((fixture) => fixture.suite.startsWith("synthetic")).length).toBe(230);
    expect(fixtures.some((fixture) => fixture.suite === "private_real")).toBe(true);
  });

  it("parses a basic visible table without requiring hidden references", async () => {
    const fixtures = discoverInvoiceFixtures();
    const fixture = fixtures.find(
      (item) => item.invoiceId === "factura_sintetica_001_L01_desc_cant_precio_importe",
    );
    expect(fixture).toBeTruthy();

    const expected = normalizeExpectedInvoice(readJson(fixture.groundTruthPath), fixture);
    const actual = await parseInvoicePdf(fixture.pdfPath);
    const comparison = compareInvoices(expected, actual);

    expect(actual.lines).toHaveLength(4);
    expect(actual.lines[0]).toMatchObject({
      description: "Guia lateral",
      sourceQuantity: 1,
      calculationBasis: "unit",
      amount: 72.74,
    });
    expect(comparison.failures).toEqual([]);
  });

  testWithPrivateStilPdf("uses the real STIL extractor bridge for the private fixture", async () => {
    const fixtures = discoverInvoiceFixtures();
    const fixture = fixtures.find(
      (item) => item.invoiceId === "stil_condal_FC121021478_private_fixture",
    );
    expect(fixture).toBeTruthy();

    const expected = normalizeExpectedInvoice(readJson(fixture.groundTruthPath), fixture);
    const actual = await parseStilCondalPdf(privateStilPdfPath);
    const comparison = compareInvoices(expected, actual);

    expect(actual.lines).toHaveLength(40);
    expect(actual.groups).toHaveLength(8);
    expect(actual.totals).toMatchObject({
      taxBase: 3118.51,
      vatAmount: 654.89,
      total: 3773.4,
    });
    expect(comparison.failures).toEqual([]);
  });
});
