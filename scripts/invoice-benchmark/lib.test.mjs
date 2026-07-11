import { describe, expect, it } from "vitest";

import { resolveOptInFixturePath } from "../private-fixture-paths.mjs";

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

const privateStilPdfPath = resolveOptInFixturePath("STIL_CONDAL_FIXTURE_PDF") ?? "";
const privateStilGroundTruthPath =
  resolveOptInFixturePath("STIL_CONDAL_GROUND_TRUTH_JSON") ?? "";
if (Boolean(privateStilPdfPath) !== Boolean(privateStilGroundTruthPath)) {
  throw new Error(
    "Las fixtures privadas STIL requieren STIL_CONDAL_FIXTURE_PDF y STIL_CONDAL_GROUND_TRUTH_JSON.",
  );
}
const testWithPrivateStilFixture =
  privateStilPdfPath && privateStilGroundTruthPath ? it : it.skip;
const hasPrivateStilFixture = Boolean(
  privateStilPdfPath && privateStilGroundTruthPath,
);

describe("invoice benchmark helpers", () => {
  it("normalizes Spanish money and dates", () => {
    expect(normalizeMoney("1.234,56 €")).toBe(1234.56);
    expect(normalizeMoney("-185,07 €")).toBe(-185.07);
    expect(normalizeMoney("(185,07 €)")).toBe(-185.07);
    expect(normalizeMoney("1,234.56 €")).toBe(1234.56);
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

  it("discovers portable fixtures and only loads private data after opt-in", () => {
    const fixtures = discoverInvoiceFixtures();
    expect(fixtures.filter((fixture) => fixture.suite.startsWith("synthetic")).length).toBe(403);
    expect(fixtures.filter((fixture) => fixture.suite === "synthetic_adversarial")).toHaveLength(173);
    expect(fixtures.filter((fixture) => fixture.invoiceId.startsWith("synthetic_adv_decl_"))).toHaveLength(23);
    expect(fixtures.some((fixture) => fixture.suite === "private_real")).toBe(
      hasPrivateStilFixture,
    );
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

  it("parses an adversarial multipage table with product groups and explicit billing units", async () => {
    const fixtures = discoverInvoiceFixtures();
    const fixture = fixtures.find((item) => item.invoiceId === "synthetic_adv_0005");
    expect(fixture).toBeTruthy();

    const expected = normalizeExpectedInvoice(readJson(fixture.groundTruthPath), fixture);
    const actual = await parseInvoicePdf(fixture.pdfPath);
    const comparison = compareInvoices(expected, actual);

    expect(actual.pageCount).toBeGreaterThan(1);
    expect(actual.lines).toHaveLength(81);
    expect(actual.groups).toHaveLength(16);
    expect(actual.lines[0]).toMatchObject({
      reference: "MAIN-PER-5-1",
      calculationBasis: "m2",
      chargeQuantity: 5.9,
    });
    expect(actual.lines[1]).toMatchObject({
      reference: "COMP-GUIA-5-1",
      calculationBasis: "ml",
    });
    expect(comparison.failures).toEqual([]);
  });

  it("fails when expected JSON is mutated in memory", async () => {
    const fixtures = discoverInvoiceFixtures();
    const fixture = fixtures.find((item) => item.invoiceId === "synthetic_adv_0001");
    expect(fixture).toBeTruthy();

    const expected = normalizeExpectedInvoice(readJson(fixture.groundTruthPath), fixture);
    expected.totals.total += 10;
    expected.lines[0].amount += 10;
    expected.lines[0].calculationBasis = "ml";
    expected.lines.push({
      ...expected.lines[0],
      id: "L999",
      index: expected.lines.length + 1,
      description: "Synthetic mutation guard line",
    });

    const actual = await parseInvoicePdf(fixture.pdfPath);
    const comparison = compareInvoices(expected, actual);
    const categories = comparison.failures.map((failure) => failure.category);

    expect(comparison.passed).toBe(false);
    expect(categories).toContain("totals_mismatch");
    expect(categories).toContain("line_amount_mismatch");
    expect(categories).toContain("calculation_basis_wrong");
    expect(categories).toContain("missed_line");
  });

  it("fails when a fixture PDF is paired with the wrong expected JSON", async () => {
    const fixtures = discoverInvoiceFixtures();
    const expectedFixture = fixtures.find((item) => item.invoiceId === "synthetic_adv_0001");
    const wrongPdfFixture = fixtures.find((item) => item.invoiceId === "synthetic_adv_0002");
    expect(expectedFixture).toBeTruthy();
    expect(wrongPdfFixture).toBeTruthy();

    const expected = normalizeExpectedInvoice(
      readJson(expectedFixture.groundTruthPath),
      expectedFixture,
    );
    const actual = await parseInvoicePdf(wrongPdfFixture.pdfPath);
    const comparison = compareInvoices(expected, actual);

    expect(comparison.passed).toBe(false);
    expect(comparison.failures.length).toBeGreaterThan(0);
  });

  testWithPrivateStilFixture("uses the STIL extractor bridge for an opted-in private fixture", async () => {
    const fixtures = discoverInvoiceFixtures();
    const fixture = fixtures.find((item) => item.suite === "private_real");
    expect(fixture).toBeTruthy();

    const expected = normalizeExpectedInvoice(readJson(fixture.groundTruthPath), fixture);
    const actual = await parseStilCondalPdf(privateStilPdfPath);
    const comparison = compareInvoices(expected, actual);

    expect(actual.lines.length).toBeGreaterThan(0);
    expect(comparison.failures).toEqual([]);
  });
});
