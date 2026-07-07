#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import {
  compareInvoices,
  discoverInvoiceFixtures,
  INVOICE_BENCHMARK_ARTIFACTS_ROOT,
  normalizeExpectedInvoice,
  parseInvoicePdf,
  parseStilCondalPdf,
  readJson,
  renderFailuresMarkdown,
  renderSummaryMarkdown,
  summarizeBenchmark,
  writeJson,
} from "./invoice-benchmark/lib.mjs";

function timestamp() {
  const now = new Date();
  return now.toISOString().replace("T", "_").replace(/:/g, "-").slice(0, 19);
}

function ensureDir(dir) {
  fs.mkdirSync(dir, { recursive: true });
}

const outputDir = path.join(INVOICE_BENCHMARK_ARTIFACTS_ROOT, timestamp());
const extractedDir = path.join(outputDir, "extracted");
const diffsDir = path.join(outputDir, "diffs");
ensureDir(extractedDir);
ensureDir(diffsDir);

const fixtures = discoverInvoiceFixtures();
const results = [];

for (const fixture of fixtures) {
  const rawExpected = readJson(fixture.groundTruthPath);
  const expected = normalizeExpectedInvoice(rawExpected, fixture);
  const pdfPath =
    fs.existsSync(fixture.pdfPath) || !fixture.fallbackPdfPath
      ? fixture.pdfPath
      : fixture.fallbackPdfPath;

  if (fixture.isPrivate && !fs.existsSync(pdfPath)) {
    results.push({
      invoiceId: fixture.invoiceId,
      suite: fixture.suite,
      layoutId: fixture.layoutId,
      status: "skipped_missing_private_pdf",
      failures: [],
      expectedLineCount: expected.lines?.length ?? 0,
      expectedGroupCount: expected.groups?.length ?? 0,
    });
    continue;
  }

  try {
    const actual =
      expected.layoutId === "stil_condal"
        ? await parseStilCondalPdf(pdfPath)
        : await parseInvoicePdf(pdfPath);
    writeJson(path.join(extractedDir, `${fixture.invoiceId}.actual.json`), actual);
    const comparison = compareInvoices(expected, actual);
    const result = {
      invoiceId: fixture.invoiceId,
      suite: fixture.suite,
      layoutId: expected.layoutId ?? fixture.layoutId,
      status: comparison.passed ? "passed" : "failed",
      failures: comparison.failures.map((failure) => ({
        invoiceId: fixture.invoiceId,
        page: failure.page,
        ...failure,
      })),
      expectedLineCount: expected.lines?.length ?? 0,
      expectedGroupCount: expected.groups?.length ?? 0,
      expectedBasisCounts: countBy(expected.lines ?? [], (line) => line.calculationBasis ?? "unknown"),
      expectedFiscalCases: expected.coverage?.fiscalCases ?? [],
      expectedAdversarialCases: expected.coverage?.adversarialCases ?? [],
      expectedLayoutId: expected.layoutId ?? fixture.layoutId,
      expectedColumns: expected.tableColumns ?? [],
      expectedPageCount: actual.pageCount,
      expectedGroupingMode: inferGroupingMode(expected),
      parserConfidence: actual.confidence,
      usedAi: false,
    };
    results.push(result);
    if (!comparison.passed) {
      writeJson(path.join(diffsDir, `${fixture.invoiceId}.diff.json`), result);
    }
  } catch (error) {
    results.push({
      invoiceId: fixture.invoiceId,
      suite: fixture.suite,
      layoutId: fixture.layoutId,
      status: "failed",
      failures: [
        {
          invoiceId: fixture.invoiceId,
          field: "pdf",
          category: "pdf_text_extraction_failed",
          expected: "readable PDF",
          actual: error.message,
          parserConfidence: 0,
          hint: "PDF text extraction failed before table parsing.",
        },
      ],
      expectedLineCount: expected.lines?.length ?? 0,
      expectedGroupCount: expected.groups?.length ?? 0,
      expectedBasisCounts: countBy(expected.lines ?? [], (line) => line.calculationBasis ?? "unknown"),
      expectedFiscalCases: expected.coverage?.fiscalCases ?? [],
      expectedAdversarialCases: expected.coverage?.adversarialCases ?? [],
      expectedLayoutId: expected.layoutId ?? fixture.layoutId,
      expectedColumns: expected.tableColumns ?? [],
      expectedGroupingMode: inferGroupingMode(expected),
      parserConfidence: 0,
      usedAi: false,
    });
  }
}

function countBy(items, keyFn) {
  const counts = {};
  for (const item of items) {
    const key = keyFn(item);
    counts[key] = (counts[key] ?? 0) + 1;
  }
  return counts;
}

function inferGroupingMode(expected) {
  if (!expected.groups?.length) return "sin grupos";
  if (expected.groups.some((group) => group.componentLineIds?.length)) {
    return expected.coverage?.adversarialCases?.includes("multipage_table")
      ? "grupos multipagina"
      : "grupos con componentes";
  }
  return "grupos simples";
}

const summary = summarizeBenchmark(results);
writeJson(path.join(outputDir, "summary.json"), summary);
writeJson(path.join(outputDir, "failures.json"), results);
fs.writeFileSync(
  path.join(outputDir, "summary.md"),
  renderSummaryMarkdown(summary, outputDir),
);
fs.writeFileSync(path.join(outputDir, "failures.md"), renderFailuresMarkdown(results));

console.log(`Invoice benchmark escrito en ${outputDir}`);
console.log(
  `Fixtures: ${summary.invoiceCount}; OK: ${summary.passed}; fallidas: ${summary.failed}; saltadas: ${summary.skipped}; pass rate: ${summary.passRate}%; IA: ${summary.aiUsageRate}%`,
);
for (const item of summary.topFailureCategories.slice(0, 8)) {
  console.log(`- ${item.category}: ${item.count}`);
}
