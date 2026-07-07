#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
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
const fixtureFileSnapshot = snapshotFixtureFiles(fixtures);
const results = [];
const visualAuditCandidates = [];

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
      expectedBasisCounts: countBy(expected.lines ?? [], (line) => line.calculationBasis ?? "not_declared"),
      expectedFiscalCases: expected.coverage?.fiscalCases ?? [],
      expectedAdversarialCases: expected.coverage?.adversarialCases ?? [],
      expectedLayoutId: expected.layoutId ?? fixture.layoutId,
      expectedColumns: expected.tableColumns ?? [],
      expectedPageCount: actual.pageCount,
      expectedGroupingMode: inferGroupingMode(expected),
      expectedTotals: expected.totals ?? {},
      actualTotals: actual.totals ?? {},
      expectedUnknownAudit: auditUnknownLines(expected),
      detectedColumns: actual.parserDebug?.header ?? (expected.tableColumns ?? []).join(" | "),
      parserConfidence: actual.confidence,
      usedAi: false,
    };
    results.push(result);
    visualAuditCandidates.push({ result, expected, actual });
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
      expectedBasisCounts: countBy(expected.lines ?? [], (line) => line.calculationBasis ?? "not_declared"),
      expectedFiscalCases: expected.coverage?.fiscalCases ?? [],
      expectedAdversarialCases: expected.coverage?.adversarialCases ?? [],
      expectedLayoutId: expected.layoutId ?? fixture.layoutId,
      expectedColumns: expected.tableColumns ?? [],
      expectedGroupingMode: inferGroupingMode(expected),
      expectedTotals: expected.totals ?? {},
      expectedUnknownAudit: auditUnknownLines(expected),
      parserConfidence: 0,
      usedAi: false,
    });
  }
}

assertFixtureFilesReadOnly(fixtureFileSnapshot);

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

function auditUnknownLines(expected) {
  const unknownLines = (expected.lines ?? []).filter(
    (line) => line.calculationBasis === "unknown",
  );
  return {
    total: unknownLines.length,
    withReason: unknownLines.filter((line) => Boolean(line.reason)).length,
    grouped: unknownLines.filter((line) => Boolean(line.productGroupId)).length,
    amountValidated: unknownLines.filter((line) => line.amount !== undefined).length,
  };
}

function snapshotFixtureFiles(items) {
  const trackedPaths = new Set();
  for (const item of items) {
    trackedPaths.add(item.groundTruthPath);
    if (fs.existsSync(item.pdfPath)) trackedPaths.add(item.pdfPath);
  }
  return [...trackedPaths].map((filePath) => {
    const stat = fs.statSync(filePath);
    return { filePath, size: stat.size, mtimeMs: stat.mtimeMs };
  });
}

function assertFixtureFilesReadOnly(snapshot) {
  for (const entry of snapshot) {
    const stat = fs.statSync(entry.filePath);
    if (stat.size !== entry.size || stat.mtimeMs !== entry.mtimeMs) {
      throw new Error(`Benchmark modified fixture file: ${entry.filePath}`);
    }
  }
}

function countTrackedRealPdfs() {
  try {
    const output = execFileSync(
      "git",
      ["ls-files", "test/fixtures/invoices/private_real/pdf", "artifacts/invoice-benchmarks"],
      { encoding: "utf8" },
    );
    return output
      .split("\n")
      .filter((line) => line.trim().toLowerCase().endsWith(".pdf")).length;
  } catch {
    return "unknown";
  }
}

function writeVisualAudit(outputDirectory, candidates) {
  const selected = [
    ...pickVisualAuditFixtures(candidates, "synthetic_basic", 5),
    ...pickVisualAuditFixtures(candidates, "synthetic_expanded", 5),
    ...pickVisualAuditFixtures(candidates, "synthetic_adversarial", 10),
  ];
  const sections = selected.map(({ result, expected, actual }) =>
    renderVisualAuditEntry(result, expected, actual),
  );
  fs.writeFileSync(
    path.join(outputDirectory, "visual-audit.md"),
    `# Invoice visual audit\n\n${sections.join("\n\n")}\n`,
  );
}

function pickVisualAuditFixtures(candidates, suite, count) {
  return candidates
    .filter((candidate) => candidate.result.suite === suite)
    .sort((a, b) => stableHash(a.result.invoiceId) - stableHash(b.result.invoiceId))
    .slice(0, count);
}

function stableHash(value) {
  return [...String(value)].reduce(
    (total, char) => (total * 31 + char.charCodeAt(0)) % 1000003,
    7,
  );
}

function renderVisualAuditEntry(result, expected, actual) {
  const explicitBillingUnit = (expected.tableColumns ?? []).some((column) =>
    /m2|m²|ml|cantidad cobro|un/i.test(String(column)),
  );
  const cases = new Set(expected.coverage?.adversarialCases ?? []);
  const totalsExpected = formatTotals(expected.totals);
  const totalsActual = formatTotals(actual.totals);
  const columnsDetected =
    actual.parserDebug?.header || (expected.tableColumns ?? []).join(" | ") || "n/a";
  const extractedProductGroups = (expected.groups ?? []).length > 0 ? (actual.groups ?? []).length : 0;
  return `## ${result.invoiceId}

- Suite: ${result.suite}
- Páginas: ${actual.pageCount ?? "n/a"}
- Columnas detectadas: ${columnsDetected}
- Líneas esperadas vs extraídas: ${(expected.lines ?? []).length} / ${(actual.lines ?? []).length}
- Grupos de producto esperados vs extraídos: ${(expected.groups ?? []).length} / ${extractedProductGroups}
- Totales esperados: ${totalsExpected}
- Totales extraídos: ${totalsActual}
- calculationBasis distribution: ${formatCounts(result.expectedBasisCounts)}
- M2/ML/UN explícito: ${explicitBillingUnit ? "sí" : "no"}
- Totales engañosos: ${cases.has("totales_enganosos") ? "sí" : "no"}
- Líneas partidas/descripciones largas: ${cases.has("descripcion_larga") ? "sí" : "no"}
- Grupos de producto: ${(expected.groups ?? []).length > 0 ? "sí" : "no"}`;
}

function formatTotals(totals = {}) {
  return [
    ["base", totals.taxBase],
    ["IVA", totals.vatAmount],
    ["IRPF", totals.irpfAmount],
    ["recargo", totals.recargoAmount],
    ["total", totals.total],
  ]
    .filter(([, value]) => value !== undefined)
    .map(([label, value]) => `${label}=${value}`)
    .join(", ");
}

function formatCounts(map = {}) {
  const entries = Object.entries(map);
  return entries.length
    ? entries.map(([key, value]) => `${key}=${value}`).join(", ")
    : "Sin datos";
}

const summary = {
  ...summarizeBenchmark(results),
  realPdfsInGit: countTrackedRealPdfs(),
};
writeJson(path.join(outputDir, "summary.json"), summary);
writeJson(path.join(outputDir, "failures.json"), results);
fs.writeFileSync(
  path.join(outputDir, "summary.md"),
  renderSummaryMarkdown(summary, outputDir),
);
fs.writeFileSync(path.join(outputDir, "failures.md"), renderFailuresMarkdown(results));
writeVisualAudit(outputDir, visualAuditCandidates);

console.log(`Invoice benchmark escrito en ${outputDir}`);
console.log(
  `Fixtures: ${summary.invoiceCount}; OK: ${summary.passed}; fallidas: ${summary.failed}; saltadas: ${summary.skipped}; pass rate: ${summary.passRate}%; IA: ${summary.aiUsageRate}%`,
);
for (const item of summary.topFailureCategories.slice(0, 8)) {
  console.log(`- ${item.category}: ${item.count}`);
}
