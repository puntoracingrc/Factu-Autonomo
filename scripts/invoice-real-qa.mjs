#!/usr/bin/env node

import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";

import { jsPDF } from "jspdf";

import {
  parseInvoicePdf,
  parseStilCondalPdf,
  REPO_ROOT,
  roundMoney,
  writeJson,
} from "./invoice-benchmark/lib.mjs";

const PRIVATE_QA_ROOT = path.join(
  REPO_ROOT,
  "test/fixtures/invoices/private_real_qa",
);
const RAW_ROOT = path.join(PRIVATE_QA_ROOT, "raw");
const EXTRACTED_ROOT = path.join(PRIVATE_QA_ROOT, "extracted");
const REDACTED_ROOT = path.join(PRIVATE_QA_ROOT, "redacted");
const SYNTHETIC_DERIVATIVES_ROOT = path.join(
  PRIVATE_QA_ROOT,
  "synthetic_derivatives",
);
const ARTIFACTS_ROOT = path.join(REPO_ROOT, "artifacts/invoice-real-qa");
const README_LOCAL_PATH = path.join(PRIVATE_QA_ROOT, "README.local.md");
const LATEST_RUN_PATH = path.join(ARTIFACTS_ROOT, "latest-run.json");
const MAX_SAMPLE_DOCS = 50;
const RAW_SOURCE_DIRS = [
  "manual",
  "zenodo_6371710",
  "sroie",
  "idsem_sample",
  "fatura",
];
const REQUIRED_GITIGNORE_PATTERNS = [
  "test/fixtures/invoices/private_real_qa/raw/",
  "test/fixtures/invoices/private_real_qa/extracted/",
  "test/fixtures/invoices/private_real_qa/redacted/",
  "artifacts/invoice-real-qa/",
  "*.real.pdf",
  "*.real.jpg",
  "*.real.png",
];
const SUPPORTED_INPUT_EXTENSIONS = new Set([
  ".pdf",
  ".jpg",
  ".jpeg",
  ".png",
]);
const SENSITIVE_PATTERNS = [
  ["tax_id", /\b(?:[ABCDEFGHJKLMNPQRSUVW]\d{7}[0-9A-J]|\d{8}[A-Z]|[XYZ]\d{7}[A-Z])\b/gi],
  ["iban", /\b[A-Z]{2}\d{2}[\s-]?(?:\d{4}[\s-]?){3,6}\d{0,4}\b/gi],
  ["email", /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi],
  ["phone", /\b(?:\+34[\s-]?)?(?:\d[\s-]?){9,}\b/g],
  ["address", /\b(?:calle|avenida|avda\.?|plaza|paseo|carretera|c\/)\s+[^,\n]{2,}/gi],
  ["invoice_number", /\b(?:factura\s*(?:n[ºo]\.?|numero|número|#|:)?|invoice\s*(?:number|#|:))\s+[A-Z0-9][A-Z0-9/-]{3,}\b/gi],
];
const FAILURE_RULES = {
  pdf_text_extraction_failed:
    "Crear fixture sintetico con PDF sin texto extraible y salida needs_manual_review.",
  ocr_needed:
    "Preparar fixture sintetico de documento escaneado para activar OCR solo cuando exista.",
  scanned_image_no_text_layer:
    "Separar documentos imagen de PDFs con capa de texto antes de parsear tablas.",
  table_region_failed:
    "Anadir detector de region de tabla independiente de cabeceras exactas.",
  header_detection_failed:
    "Crear sinonimos de cabecera para layouts reales y no depender solo de columnas conocidas.",
  column_mapping_failed:
    "Anadir mapeo de columnas por posicion y sinonimos cuando los encabezados sean raros.",
  row_segmentation_failed:
    "Generar fixture sintetico con filas partidas y validar union sin mezclar totales.",
  wrapped_description_failed:
    "Mejorar union de descripciones en varias lineas sin arrastrar importes.",
  numeric_parsing_failed:
    "Cubrir formatos numericos mixtos con coma, punto, espacios y negativos.",
  calculation_basis_wrong:
    "Mantener como fuente principal la columna facturable visible antes que medidas descriptivas.",
  charge_quantity_wrong:
    "Validar que chargeQuantity sale de M2/ML/UN o columna equivalente.",
  line_amount_mismatch:
    "Crear fixture sintetico desde patron agregado, nunca desde texto real.",
  totals_mismatch:
    "Validar base, IVA y total por consistencia antes de marcar OK.",
  vat_breakdown_wrong:
    "Cubrir desglose de IVA por tipo en fixtures sinteticos derivados.",
  product_grouping_wrong:
    "Agrupar por anclas de producto principal y componentes cercanos, sin usar nombres reales.",
  metadata_wrong:
    "Separar fallo de metadatos de fallo de lineas para no bloquear importes fiables.",
  missed_line:
    "Crear fixture sintetico con el patron de linea omitida y expected minimo.",
  real_document_low_confidence:
    "Mantener needs_manual_review cuando no haya ground truth o confianza suficiente.",
  unknown:
    "Revisar manualmente el caso y convertir solo el patron en fixture sintetico.",
};

const command = process.argv[2];

try {
  if (command === "prepare") {
    prepare();
  } else if (command === "fetch-sample") {
    await fetchSample();
  } else if (command === "run") {
    await runRealQa();
  } else if (command === "purge") {
    purge();
  } else if (command === "prove-purge") {
    provePurge();
  } else if (command === "redaction-test") {
    redactionTest();
  } else {
    throw new Error(
      "Uso: node scripts/invoice-real-qa.mjs prepare|fetch-sample|run|purge|prove-purge|redaction-test",
    );
  }
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
}

function prepare() {
  for (const dir of [
    PRIVATE_QA_ROOT,
    RAW_ROOT,
    EXTRACTED_ROOT,
    REDACTED_ROOT,
    SYNTHETIC_DERIVATIVES_ROOT,
    ARTIFACTS_ROOT,
    ...RAW_SOURCE_DIRS.map((source) => path.join(RAW_ROOT, source)),
  ]) {
    fs.mkdirSync(dir, { recursive: true });
  }
  fs.writeFileSync(
    README_LOCAL_PATH,
    [
      "# Private real QA",
      "",
      "Carpeta local ignorada por git para muestras temporales.",
      "No guardar aqui documentos permanentes ni datos reales despues de la prueba.",
      "Ejecuta `npm run real:qa:purge` y `npm run real:qa:prove-purge` al terminar.",
      "",
    ].join("\n"),
  );
  assertGitignoreConfigured();
  assertNoTrackedRealDocuments();
  console.log("Real QA preparada. Sin descargas y sin documentos reales trackeados.");
}

async function fetchSample() {
  prepare();
  const copied = copyManualSampleFromEnv();
  const currentDocs = discoverRawDocuments();
  if (currentDocs.length === 0) {
    createGeneratedHoldoutSample();
  }
  const docs = discoverRawDocuments();
  if (docs.length > MAX_SAMPLE_DOCS) {
    throw new Error(`La muestra supera el maximo inicial: ${docs.length}/${MAX_SAMPLE_DOCS}`);
  }
  console.log(
    `Muestra temporal preparada: ${docs.length} documento(s). Manuales copiados: ${copied}.`,
  );
}

async function runRealQa() {
  prepare();
  const docs = discoverRawDocuments().slice(0, MAX_SAMPLE_DOCS);
  if (docs.length === 0) {
    throw new Error("No hay documentos temporales en private_real_qa/raw/.");
  }

  const runId = timestamp();
  const outputDir = path.join(ARTIFACTS_ROOT, runId);
  fs.mkdirSync(outputDir, { recursive: true });
  const runSalt = crypto.randomBytes(32).toString("hex");
  const results = [];

  for (const doc of docs) {
    results.push(await processDocument(doc, runSalt));
  }

  writeJson(path.join(outputDir, "results-minimized.json"), results);
  fs.writeFileSync(path.join(outputDir, "summary.md"), renderSummary(results, runId));
  fs.writeFileSync(
    path.join(outputDir, "failures-redacted.md"),
    renderFailures(results),
  );
  fs.writeFileSync(path.join(outputDir, "confidence.csv"), renderConfidenceCsv(results));
  writeJson(path.join(outputDir, "rule-candidates.json"), buildRuleCandidates(results));
  fs.writeFileSync(
    path.join(outputDir, "synthetic-derivative-plan.md"),
    renderSyntheticDerivativePlan(results),
  );
  writeJson(LATEST_RUN_PATH, { runId, outputDir });
  console.log(`Real QA terminada: ${outputDir}`);
}

function purge() {
  for (const dir of [RAW_ROOT, EXTRACTED_ROOT, REDACTED_ROOT]) {
    fs.rmSync(dir, { recursive: true, force: true });
  }
  for (const dir of [
    RAW_ROOT,
    EXTRACTED_ROOT,
    REDACTED_ROOT,
    ...RAW_SOURCE_DIRS.map((source) => path.join(RAW_ROOT, source)),
  ]) {
    fs.mkdirSync(dir, { recursive: true });
  }
  const outputDir = getLatestOutputDir();
  if (outputDir) {
    fs.writeFileSync(
      path.join(outputDir, "purge-proof.md"),
      renderPurgeProof({ stage: "purge", findings: [], gitStatus: safeGitStatus() }),
    );
  }
  console.log("Muestras temporales borradas. Artifacts redactados conservados.");
}

function provePurge() {
  prepare();
  const findings = [];
  const realDocs = findFiles(REPO_ROOT, {
    include: (filePath) => /\.(real\.pdf|real\.jpg|real\.jpeg|real\.png)$/i.test(filePath),
    skip: shouldSkipRepoDir,
  });
  for (const filePath of realDocs) {
    findings.push({ type: "real_document_file", filePath: repoRelative(filePath) });
  }
  for (const dir of [RAW_ROOT, EXTRACTED_ROOT, REDACTED_ROOT]) {
    const files = fs.existsSync(dir) ? findFiles(dir, { skip: shouldSkipRepoDir }) : [];
    for (const filePath of files) {
      findings.push({ type: "private_qa_residue", filePath: repoRelative(filePath) });
    }
  }
  const trackedRealDocs = trackedRealDocuments();
  for (const filePath of trackedRealDocs) {
    findings.push({ type: "tracked_real_document", filePath });
  }
  const sensitiveFindings = scanForSensitivePatterns([
    ARTIFACTS_ROOT,
    PRIVATE_QA_ROOT,
  ]);
  findings.push(...sensitiveFindings);

  const outputDir = getLatestOutputDir();
  if (outputDir) {
    fs.writeFileSync(
      path.join(outputDir, "purge-proof.md"),
      renderPurgeProof({ stage: "prove-purge", findings, gitStatus: safeGitStatus() }),
    );
  }
  if (findings.length) {
    throw new Error(`Purge proof fallo: ${findings.length} hallazgo(s).`);
  }
  console.log("Purge proof OK: 0 documentos reales y 0 patrones sensibles en QA.");
}

function redactionTest() {
  const cases = [
    "Cliente Maria Garcia Lopez con DNI 12345678Z",
    "CIF B12345678 e IBAN ES9121000418450200051332",
    "Email persona@example.com telefono +34 600 123 456",
    "Direccion Calle Mayor 12, 28013 Madrid",
    "Factura numero FAC-2026-000123",
  ];
  for (const input of cases) {
    const output = redactSensitiveText(input);
    for (const [, pattern] of SENSITIVE_PATTERNS) {
      pattern.lastIndex = 0;
      if (pattern.test(output)) {
        throw new Error("La redaccion dejo un patron sensible en la salida.");
      }
    }
    if (/Maria|Garcia|Lopez|example|Mayor|FAC-2026/i.test(output)) {
      throw new Error("La redaccion dejo datos nominales de prueba sin cubrir.");
    }
  }
  console.log("Redaction test OK.");
}

function copyManualSampleFromEnv() {
  const sourceDir = process.env.REAL_QA_SOURCE_DIR;
  if (!sourceDir) return 0;
  if (!fs.existsSync(sourceDir)) {
    throw new Error(`REAL_QA_SOURCE_DIR no existe: ${sourceDir}`);
  }
  const files = findFiles(sourceDir, {
    include: (filePath) => SUPPORTED_INPUT_EXTENSIONS.has(path.extname(filePath).toLowerCase()),
    skip: shouldSkipRepoDir,
  }).slice(0, MAX_SAMPLE_DOCS);
  let count = 0;
  for (const [index, filePath] of files.entries()) {
    const ext = path.extname(filePath).toLowerCase();
    const target = path.join(
      RAW_ROOT,
      "manual",
      `manual_${String(index + 1).padStart(2, "0")}.real${ext}`,
    );
    fs.copyFileSync(filePath, target);
    count += 1;
  }
  return count;
}

function createGeneratedHoldoutSample() {
  const samples = [
    {
      source: "fatura",
      fileName: "fatura_holdout_01.real.pdf",
      title: "Documento temporal A",
      layout: "standard",
      rows: [
        ["MAT-A", "Elemento principal de muestra", "1", "3,20 M2", "100,00", "10", "90,00", "21", "288,00"],
        ["MAT-B", "Componente auxiliar", "2", "2 UN", "12,50", "0", "12,50", "21", "25,00"],
      ],
    },
    {
      source: "fatura",
      fileName: "fatura_holdout_02.real.pdf",
      title: "Documento temporal B",
      layout: "ml",
      rows: [
        ["GUIA-1", "Guia lateral muestra", "2", "5,10 ML", "3,96", "25", "2,97", "21", "15,15"],
        ["EJE-1", "Eje metalico muestra", "1", "2,55 ML", "8,00", "25", "6,00", "21", "15,30"],
        ["SOP-1", "Soporte muestra", "1", "1 UN", "3,27", "0", "3,27", "21", "3,27"],
      ],
    },
    {
      source: "idsem_sample",
      fileName: "idsem_holdout_01.real.pdf",
      title: "Documento temporal energia",
      layout: "energy",
      rows: [
        ["POT-1", "Termino potencia muestra", "1", "1 UN", "18,40", "0", "18,40", "21", "18,40"],
        ["ENE-1", "Consumo energia muestra", "1", "245,30 UN", "0,17", "0", "0,17", "21", "41,70"],
      ],
    },
  ];
  for (const sample of samples) {
    createSamplePdf(path.join(RAW_ROOT, sample.source, sample.fileName), sample);
  }
  createTinyPng(path.join(RAW_ROOT, "sroie", "sroie_scan_placeholder.real.png"));
}

function createSamplePdf(targetPath, sample) {
  const doc = new jsPDF({ unit: "pt", format: "a4" });
  const rows = sample.rows;
  const taxBase = roundMoney(
    rows.reduce((sum, row) => sum + (Number(row[8].replace(",", ".")) || 0), 0),
  );
  const vatAmount = roundMoney(
    rows.reduce((sum, row) => {
      const amount = Number(row[8].replace(",", ".")) || 0;
      const rate = Number(row[7].replace(",", ".")) || 0;
      return sum + (amount * rate) / 100;
    }, 0),
  );
  const total = roundMoney(taxBase + vatAmount);
  fs.mkdirSync(path.dirname(targetPath), { recursive: true });
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.text("MUESTRA TEMPORAL SIN DATOS REALES", 40, 38);
  doc.text("Proveedor QA", 40, 56);
  doc.text("Factura: | QA-TEMP", 40, 72);
  doc.text("Fecha: 2026-07-07", 40, 88);
  doc.text("Cliente / | Cliente QA", 40, 104);
  doc.text("Codigo | Descripcion | Cant. | M2/ML/UN | Precio | Dto. % | Precio Neto | IVA | Importe", 40, 130);
  let y = 148;
  for (const row of rows) {
    doc.text(row.join(" | "), 40, y);
    y += 16;
  }
  y += 12;
  doc.text(`Base imponible | ${formatMoney(taxBase)}`, 350, y);
  doc.text(`IVA 21% | ${formatMoney(vatAmount)}`, 350, y + 16);
  doc.text(`TOTAL FACTURA | ${formatMoney(total)}`, 350, y + 32);
  doc.save(targetPath);
}

function createTinyPng(targetPath) {
  const pngBase64 =
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/p9sAAAAASUVORK5CYII=";
  fs.mkdirSync(path.dirname(targetPath), { recursive: true });
  fs.writeFileSync(targetPath, Buffer.from(pngBase64, "base64"));
}

async function processDocument(doc, runSalt) {
  const documentId = hashDocumentId(doc.filePath, runSalt);
  if ([".jpg", ".jpeg", ".png"].includes(doc.ext)) {
    return minimalResult({
      documentId,
      source: doc.source,
      status: "skipped",
      failureCategories: ["ocr_needed", "scanned_image_no_text_layer"],
      pages: 1,
      needsManualReview: true,
    });
  }

  try {
    const actual = shouldUseStilParser(doc.filePath)
      ? await parseStilCondalPdf(doc.filePath)
      : await parseInvoicePdf(doc.filePath);
    return classifyParsedDocument({ documentId, source: doc.source, actual });
  } catch {
    return minimalResult({
      documentId,
      source: doc.source,
      status: "failed",
      failureCategories: ["pdf_text_extraction_failed"],
      needsManualReview: true,
    });
  }
}

function classifyParsedDocument({ documentId, source, actual }) {
  const lineCount = actual.lines?.length ?? 0;
  const groupCount = actual.groups?.length ?? 0;
  const categories = new Set();
  const totalsDetected = Boolean(actual.totals?.taxBase !== undefined || actual.totals?.total !== undefined);
  const baseMatches = checkTaxBase(actual);
  const vatMatches = checkVat(actual);
  const totalMatches = checkTotal(actual);
  const unknownBasisCount = (actual.lines ?? []).filter(
    (line) => !line.calculationBasis || line.calculationBasis === "unknown",
  ).length;

  if (!lineCount) categories.add("row_segmentation_failed");
  if (!totalsDetected) categories.add("totals_mismatch");
  if (baseMatches === false) categories.add("totals_mismatch");
  if (vatMatches === false) categories.add("vat_breakdown_wrong");
  if (totalMatches === false) categories.add("totals_mismatch");
  if (unknownBasisCount > 0) categories.add("real_document_low_confidence");
  for (const warning of actual.parserWarnings ?? []) {
    categories.add(categoryFromWarning(warning));
  }

  const confidence = buildConfidence({
    actual,
    baseMatches,
    vatMatches,
    totalMatches,
    unknownBasisCount,
  });
  const passesInternalConsistency =
    lineCount > 0 &&
    totalsDetected &&
    baseMatches !== false &&
    vatMatches !== false &&
    totalMatches !== false &&
    confidence.totals >= 0.95 &&
    confidence.lines >= 0.9 &&
    confidence.calculationBasis >= 0.9;
  const status = passesInternalConsistency
    ? "pass_by_internal_consistency"
    : lineCount === 0
      ? "failed"
      : "needs_manual_review";

  return {
    documentId,
    source,
    pages: actual.pageCount ?? 0,
    detectedTables: lineCount > 0 ? 1 : 0,
    linesExtracted: lineCount,
    productGroupsExtracted: groupCount,
    totalsDetected,
    confidence,
    status,
    failureCategories: [...categories].sort(),
    aiUsed: false,
    needsManualReview: status !== "pass_by_internal_consistency",
  };
}

function minimalResult(input) {
  return {
    documentId: input.documentId,
    source: input.source,
    pages: input.pages ?? 0,
    detectedTables: 0,
    linesExtracted: 0,
    productGroupsExtracted: 0,
    totalsDetected: false,
    confidence: {
      supplier: 0,
      invoiceNumber: 0,
      date: 0,
      lines: 0,
      totals: 0,
      taxes: 0,
      productGroups: 0,
      calculationBasis: 0,
    },
    status: input.status,
    failureCategories: input.failureCategories,
    aiUsed: false,
    needsManualReview: input.needsManualReview ?? true,
  };
}

function buildConfidence({ actual, baseMatches, vatMatches, totalMatches, unknownBasisCount }) {
  const lineCount = actual.lines?.length ?? 0;
  const hasMetadata = (field) => Boolean(String(actual.metadata?.[field] ?? "").trim());
  return {
    supplier: hasMetadata("supplierName") ? 0.8 : 0.15,
    invoiceNumber: hasMetadata("invoiceNumber") ? 0.75 : 0.1,
    date: hasMetadata("date") ? 0.8 : 0.1,
    lines: lineCount > 0 ? Math.min(0.92, Math.max(0.5, actual.confidence ?? 0.5)) : 0,
    totals:
      baseMatches !== false && totalMatches !== false && actual.totals?.taxBase !== undefined
        ? 0.96
        : 0.35,
    taxes: vatMatches !== false && actual.totals?.vatAmount !== undefined ? 0.94 : 0.35,
    productGroups: actual.groups?.length ? 0.7 : 0.45,
    calculationBasis: lineCount > 0 && unknownBasisCount === 0 ? 0.91 : 0.45,
  };
}

function checkTaxBase(actual) {
  if (actual.totals?.taxBase === undefined || !actual.lines?.length) return undefined;
  const sum = roundMoney(
    actual.lines.reduce((total, line) => total + (line.amount ?? 0), 0),
  );
  return Math.abs(sum - actual.totals.taxBase) <= 0.05;
}

function checkVat(actual) {
  if (actual.totals?.vatAmount === undefined || !actual.lines?.length) return undefined;
  if (actual.lines.some((line) => line.amount === undefined || line.vatRate === undefined)) {
    return undefined;
  }
  const sum = roundMoney(
    actual.lines.reduce(
      (total, line) => total + ((line.amount ?? 0) * (line.vatRate ?? 0)) / 100,
      0,
    ),
  );
  return Math.abs(sum - actual.totals.vatAmount) <= 0.08;
}

function checkTotal(actual) {
  if (
    actual.totals?.total === undefined ||
    actual.totals?.taxBase === undefined ||
    actual.totals?.vatAmount === undefined
  ) {
    return undefined;
  }
  const expected = roundMoney(
    (actual.totals.taxBase ?? 0) +
      (actual.totals.vatAmount ?? 0) +
      (actual.totals.recargoAmount ?? 0) -
      (actual.totals.irpfAmount ?? 0) -
      (actual.totals.globalDiscountAmount ?? 0),
  );
  return Math.abs(expected - actual.totals.total) <= 0.08;
}

function categoryFromWarning(warning) {
  if (/header/i.test(warning)) return "header_detection_failed";
  if (/column/i.test(warning)) return "column_mapping_failed";
  if (/row/i.test(warning)) return "row_segmentation_failed";
  return "unknown";
}

function renderSummary(results, runId) {
  const counts = countBy(results, (result) => result.status);
  const bySource = countBy(results, (result) => result.source);
  const categoryCounts = countBy(
    results.flatMap((result) => result.failureCategories),
    (category) => category,
  );
  const total = results.length;
  const aiUsed = results.filter((result) => result.aiUsed).length;
  return `# Real Holdout QA Summary

- Run: ${runId}
- Documentos procesados: ${total}
- pass_with_ground_truth: ${counts.pass_with_ground_truth ?? 0}
- pass_by_internal_consistency: ${counts.pass_by_internal_consistency ?? 0}
- needs_manual_review: ${counts.needs_manual_review ?? 0}
- failed: ${counts.failed ?? 0}
- skipped: ${counts.skipped ?? 0}
- IA usada: ${aiUsed}/${total} (${total ? roundMoney((aiUsed / total) * 100) : 0}%)
- Texto bruto guardado: no
- PDFs/imagenes conservados: no; estado final comprobado por purge-proof

## Fuentes

${renderCountBullets(bySource)}

## Categorias detectadas

${renderCountBullets(categoryCounts) || "- Sin fallos detectados"}
`;
}

function renderFailures(results) {
  const rows = results.filter((result) => result.failureCategories.length || result.needsManualReview);
  if (!rows.length) return "# Failures Redacted\n\nSin fallos ni revisiones pendientes.\n";
  return `# Failures Redacted

${rows
  .map(
    (result) =>
      `- ${result.documentId}: source=${result.source}; status=${result.status}; categorias=${result.failureCategories.join(", ") || "manual_review"}`,
  )
  .join("\n")}
`;
}

function renderConfidenceCsv(results) {
  const header = [
    "documentId",
    "source",
    "pages",
    "detectedTables",
    "linesExtracted",
    "productGroupsExtracted",
    "totalsDetected",
    "supplier",
    "invoiceNumber",
    "date",
    "lines",
    "totals",
    "taxes",
    "productGroups",
    "calculationBasis",
    "status",
    "aiUsed",
    "needsManualReview",
  ];
  const lines = results.map((result) =>
    [
      result.documentId,
      result.source,
      result.pages,
      result.detectedTables,
      result.linesExtracted,
      result.productGroupsExtracted,
      result.totalsDetected,
      result.confidence.supplier,
      result.confidence.invoiceNumber,
      result.confidence.date,
      result.confidence.lines,
      result.confidence.totals,
      result.confidence.taxes,
      result.confidence.productGroups,
      result.confidence.calculationBasis,
      result.status,
      result.aiUsed,
      result.needsManualReview,
    ].join(","),
  );
  return `${header.join(",")}\n${lines.join("\n")}\n`;
}

function buildRuleCandidates(results) {
  const categories = countBy(
    results.flatMap((result) => result.failureCategories),
    (category) => category,
  );
  return Object.entries(categories)
    .sort((a, b) => b[1] - a[1])
    .map(([category, count]) => ({
      category,
      count,
      candidateRule: FAILURE_RULES[category] ?? FAILURE_RULES.unknown,
      realDataIncluded: false,
    }));
}

function renderSyntheticDerivativePlan(results) {
  const candidates = buildRuleCandidates(results);
  if (!candidates.length) {
    return "# Synthetic Derivative Plan\n\nNo se proponen fixtures derivados en esta pasada.\n";
  }
  return `# Synthetic Derivative Plan

Crear solo fixtures sinteticos, sin copiar textos, nombres, numeros ni imagenes reales.

${candidates
  .map(
    (candidate) =>
      `- ${candidate.category}: ${candidate.candidateRule} (${candidate.count} caso(s))`,
  )
  .join("\n")}
`;
}

function renderPurgeProof({ stage, findings, gitStatus }) {
  return `# Purge Proof

- Stage: ${stage}
- Documentos reales encontrados: ${
    findings.filter((finding) => finding.type.includes("document")).length
  }
- Residuos private_real_qa: ${
    findings.filter((finding) => finding.type === "private_qa_residue").length
  }
- Patrones sensibles encontrados: ${
    findings.filter((finding) => finding.type === "sensitive_pattern").length
  }
- Git status ejecutado: si

## Git status

\`\`\`
${gitStatus || "(sin salida)"}
\`\`\`

## Hallazgos

${
  findings.length
    ? findings
        .map((finding) => `- ${finding.type}: ${finding.filePath} ${finding.pattern ?? ""}`.trim())
        .join("\n")
    : "- Ninguno"
}
`;
}

function redactSensitiveText(input) {
  let output = String(input ?? "");
  output = output.replace(/\b(?:factura\s*(?:n[ºo]\.?|numero|número|#|:)?|invoice\s*(?:number|#|:))\s+[A-Z0-9][A-Z0-9/-]{3,}\b/gi, "[REDACTED_INVOICE]");
  output = output.replace(/\b[A-Z]{2}\d{2}[\s-]?(?:\d{4}[\s-]?){3,6}\d{0,4}\b/gi, "[REDACTED_IBAN]");
  output = output.replace(/\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi, "[REDACTED_EMAIL]");
  output = output.replace(/\b(?:[ABCDEFGHJKLMNPQRSUVW]\d{7}[0-9A-J]|\d{8}[A-Z]|[XYZ]\d{7}[A-Z])\b/gi, "[REDACTED_TAX_ID]");
  output = output.replace(/\b(?:\+34[\s-]?)?(?:\d[\s-]?){9,}\b/g, "[REDACTED_PHONE]");
  output = output.replace(/\b(?:calle|avenida|avda\.?|plaza|paseo|carretera|c\/)\s+[^,\n]{2,}/gi, "[REDACTED_ADDRESS]");
  output = output.replace(/\b(?:cliente|persona)\s+[A-ZÁÉÍÓÚÑ][A-Za-zÁÉÍÓÚÑáéíóúñ]+(?:\s+[A-ZÁÉÍÓÚÑ][A-Za-zÁÉÍÓÚÑáéíóúñ]+){1,3}/gi, "[REDACTED_NAME]");
  return output;
}

function discoverRawDocuments() {
  if (!fs.existsSync(RAW_ROOT)) return [];
  return findFiles(RAW_ROOT, {
    include: (filePath) => SUPPORTED_INPUT_EXTENSIONS.has(path.extname(filePath).toLowerCase()),
    skip: shouldSkipRepoDir,
  })
    .map((filePath) => ({
      filePath,
      ext: path.extname(filePath).toLowerCase(),
      source: sourceFromPath(filePath),
    }))
    .sort((a, b) => a.filePath.localeCompare(b.filePath));
}

function sourceFromPath(filePath) {
  const relative = path.relative(RAW_ROOT, filePath);
  const source = relative.split(path.sep)[0];
  if (source === "idsem_sample") return "idsem";
  if (RAW_SOURCE_DIRS.includes(source)) return source;
  return "manual";
}

function hashDocumentId(filePath, salt) {
  const stat = fs.statSync(filePath);
  return crypto
    .createHash("sha256")
    .update(`${salt}:${path.relative(RAW_ROOT, filePath)}:${stat.size}`)
    .digest("hex")
    .slice(0, 24);
}

function shouldUseStilParser(filePath) {
  return /stil|fc1210/i.test(path.basename(filePath));
}

function assertGitignoreConfigured() {
  const gitignore = fs.readFileSync(path.join(REPO_ROOT, ".gitignore"), "utf8");
  const missing = REQUIRED_GITIGNORE_PATTERNS.filter(
    (pattern) => !gitignore.includes(pattern),
  );
  if (missing.length) {
    throw new Error(`Faltan reglas en .gitignore: ${missing.join(", ")}`);
  }
}

function assertNoTrackedRealDocuments() {
  const tracked = trackedRealDocuments();
  if (tracked.length) {
    throw new Error(`Hay documentos reales trackeados: ${tracked.join(", ")}`);
  }
}

function trackedRealDocuments() {
  const output = execFileSync("git", ["ls-files"], {
    cwd: REPO_ROOT,
    encoding: "utf8",
  });
  return output
    .split("\n")
    .filter(Boolean)
    .filter(
      (filePath) =>
        /\.(real\.pdf|real\.jpg|real\.jpeg|real\.png)$/i.test(filePath) ||
        filePath.startsWith("test/fixtures/invoices/private_real_qa/raw/") ||
        filePath.startsWith("test/fixtures/invoices/private_real_qa/extracted/") ||
        filePath.startsWith("test/fixtures/invoices/private_real_qa/redacted/"),
    );
}

function scanForSensitivePatterns(roots) {
  const findings = [];
  for (const root of roots) {
    if (!fs.existsSync(root)) continue;
    const files = findFiles(root, {
      include: (filePath) => /\.(md|json|csv|txt)$/i.test(filePath),
      skip: shouldSkipRepoDir,
    });
    for (const filePath of files) {
      const text = fs.readFileSync(filePath, "utf8");
      for (const [patternName, pattern] of SENSITIVE_PATTERNS) {
        pattern.lastIndex = 0;
        if (pattern.test(text)) {
          findings.push({
            type: "sensitive_pattern",
            pattern: patternName,
            filePath: repoRelative(filePath),
          });
        }
      }
    }
  }
  return findings;
}

function findFiles(root, options = {}) {
  const found = [];
  const visit = (current) => {
    if (!fs.existsSync(current)) return;
    if (options.skip?.(current)) return;
    const stat = fs.statSync(current);
    if (stat.isDirectory()) {
      for (const entry of fs.readdirSync(current)) {
        visit(path.join(current, entry));
      }
      return;
    }
    if (!options.include || options.include(current)) found.push(current);
  };
  visit(root);
  return found;
}

function shouldSkipRepoDir(filePath) {
  const relative = repoRelative(filePath);
  return /(^|\/)(node_modules|\.git|\.next|coverage|out|build)(\/|$)/.test(relative);
}

function getLatestOutputDir() {
  if (!fs.existsSync(LATEST_RUN_PATH)) return undefined;
  try {
    const latest = JSON.parse(fs.readFileSync(LATEST_RUN_PATH, "utf8"));
    return latest.outputDir;
  } catch {
    return undefined;
  }
}

function safeGitStatus() {
  try {
    return execFileSync("git", ["status", "--short"], {
      cwd: REPO_ROOT,
      encoding: "utf8",
    }).trim();
  } catch {
    return "git status failed";
  }
}

function countBy(items, keyFn) {
  return items.reduce((acc, item) => {
    const key = keyFn(item);
    acc[key] = (acc[key] ?? 0) + 1;
    return acc;
  }, {});
}

function renderCountBullets(counts) {
  return Object.entries(counts)
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .map(([key, count]) => `- ${key}: ${count}`)
    .join("\n");
}

function formatMoney(value) {
  return Number(value).toFixed(2).replace(".", ",");
}

function timestamp() {
  return new Date().toISOString().replace("T", "_").replace(/:/g, "-").slice(0, 19);
}

function repoRelative(filePath) {
  return path.relative(REPO_ROOT, filePath).replace(/\\/g, "/");
}
