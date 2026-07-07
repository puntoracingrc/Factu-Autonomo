#!/usr/bin/env node

import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";

import {
  buildSroieOracleDocument,
  evaluateSroieDocument,
} from "./invoice-real-qa/adapters/sroie-adapter.mjs";
import {
  buildZenodoDocument,
  evaluateZenodoDocument,
} from "./invoice-real-qa/adapters/zenodo-6371710-adapter.mjs";
import { REPO_ROOT, writeJson } from "./invoice-benchmark/lib.mjs";

const __filename = fileURLToPath(import.meta.url);
const isDirectRun = process.argv[1] === __filename;
const DEFAULT_EXTERNAL_ROOT = "/Users/macbookpro14/Desktop/task test";
const ARTIFACTS_ROOT = path.join(REPO_ROOT, "artifacts/invoice-real-qa");
const INSPECTION_ROOT = path.join(ARTIFACTS_ROOT, "external-inspection");
const PRIVATE_QA_ROOT = path.join(REPO_ROOT, "test/fixtures/invoices/private_real_qa");
const RAW_ROOT = path.join(PRIVATE_QA_ROOT, "raw");
const RAW_SROIE_ROOT = path.join(RAW_ROOT, "sroie");
const RAW_ZENODO_ROOT = path.join(RAW_ROOT, "zenodo_6371710");
const EXTRACTED_ROOT = path.join(PRIVATE_QA_ROOT, "extracted");
const REDACTED_ROOT = path.join(PRIVATE_QA_ROOT, "redacted");
const LATEST_EXTERNAL_RUN = path.join(ARTIFACTS_ROOT, "latest-external-run.json");
const MAX_WALK_FILES = 250_000;
const IMAGE_EXTENSIONS = new Set([".jpg", ".jpeg", ".png", ".tif", ".tiff"]);
const INPUT_EXTENSIONS = new Set([...IMAGE_EXTENSIONS, ".pdf", ".json", ".txt", ".zip"]);
const REQUIRED_GITIGNORE_PATTERNS = [
  "test/fixtures/invoices/private_real_qa/raw/",
  "test/fixtures/invoices/private_real_qa/extracted/",
  "test/fixtures/invoices/private_real_qa/redacted/",
  "artifacts/invoice-real-qa/",
  "*.real.jpg",
  "*.real.jpeg",
  "*.real.png",
  "*.real.tif",
  "*.real.tiff",
  "*.real.pdf",
  "*.external.json",
  "*.external.txt",
];
const SENSITIVE_PATTERNS = [
  ["tax_id", /\b(?:[ABCDEFGHJKLMNPQRSUVW]\d{7}[0-9A-J]|\d{8}[A-Z]|[XYZ]\d{7}[A-Z]|\d{9})\b/gi],
  ["iban", /\b[A-Z]{2}\d{2}[\s-]?(?:\d{4}[\s-]?){3,6}\d{0,4}\b/gi],
  ["email", /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi],
  ["phone", /\b(?:tel(?:e?fono)?|phone|mobile|movil|móvil)\s*:?\s*(?:\+34|\+351)?[\s-]?(?:\d[\s-]?){9,}\b/gi],
  ["address", /\b(?:calle|avenida|avda\.?|plaza|paseo|carretera|rua|avenida|morada|address)\s+[^,\n]{2,}/gi],
  ["absolute_path", /\/Users\/[^)\]\s]+/g],
  ["invoice_number", /\b(?:factura\s*(?:n[ºo]\.?|numero|número|#|:)?|invoice\s*(?:number|#|:)|fatura\s*(?:n[ºo]\.?|numero|#|:)?)\s+[A-Z0-9][A-Z0-9/-]{3,}\b/gi],
];

if (isDirectRun) {
  const [command, ...args] = process.argv.slice(2);
  try {
    if (command === "inspect") {
      await inspectExternalHoldout(firstPathArg(args));
    } else if (command === "import-sample") {
      await importExternalSample(firstPathArg(args), parseLimits(args));
    } else if (command === "run") {
      await runExternalHoldout();
    } else if (command === "purge") {
      purgeExternalHoldout();
    } else if (command === "prove-purge") {
      proveExternalPurge();
    } else {
      throw new Error(
        "Uso: node scripts/invoice-real-qa-external.mjs inspect|import-sample|run|purge|prove-purge [ruta]",
      );
    }
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
}

export async function inspectExternalHoldout(datasetPath = DEFAULT_EXTERNAL_ROOT) {
  ensureBaseDirs();
  const report = inspectDataset(datasetPath);
  fs.mkdirSync(INSPECTION_ROOT, { recursive: true });
  fs.writeFileSync(path.join(INSPECTION_ROOT, "summary.md"), renderInspectionSummary(report));
  writeJson(path.join(INSPECTION_ROOT, "summary.json"), redactedInspectionJson(report));
  console.log(`Inspeccion externa escrita en ${path.join(INSPECTION_ROOT, "summary.md")}`);
  if (!report.readable) {
    console.log(`Aviso: ruta no legible por este proceso (${report.readError ?? "sin detalle"}).`);
  }
}

async function importExternalSample(datasetPath = DEFAULT_EXTERNAL_ROOT, limits = {}) {
  ensureBaseDirs();
  assertExternalGitignoreConfigured();
  const report = inspectDataset(datasetPath);
  if (!report.exists) throw new Error("La ruta externa no existe.");
  if (!report.readable) throw new Error(`La ruta externa no es legible: ${report.readError}`);

  fs.rmSync(RAW_SROIE_ROOT, { recursive: true, force: true });
  fs.rmSync(RAW_ZENODO_ROOT, { recursive: true, force: true });
  fs.mkdirSync(RAW_SROIE_ROOT, { recursive: true });
  fs.mkdirSync(RAW_ZENODO_ROOT, { recursive: true });

  const sroieMax = limits.sroieMax ?? 50;
  const zenodoMax = limits.zenodoMax ?? 50;
  const sroieImported = importSroieSample(report, sroieMax);
  const zenodoImported = importZenodoSample(report, zenodoMax);

  const output = {
    importedAt: new Date().toISOString(),
    sroieImported,
    zenodoImported,
    externalDataInGit: trackedExternalDocuments().length,
  };
  fs.writeFileSync(
    path.join(INSPECTION_ROOT, "import-summary.md"),
    `# External Import Summary\n\n- SROIE importados: ${sroieImported}\n- Zenodo 6371710 importados: ${zenodoImported}\n- Documentos externos trackeados por git: ${output.externalDataInGit}\n`,
  );
  writeJson(path.join(INSPECTION_ROOT, "import-summary.json"), output);
  console.log(`Importacion temporal: SROIE ${sroieImported}; Zenodo ${zenodoImported}.`);
}

async function runExternalHoldout() {
  ensureBaseDirs();
  const runId = timestamp();
  const outputDir = path.join(ARTIFACTS_ROOT, runId);
  fs.mkdirSync(outputDir, { recursive: true });
  const salt = crypto.randomBytes(32).toString("hex");
  const sroieResults = runSroieImported(salt);
  const zenodoResults = runZenodoImported(salt);
  const results = [...sroieResults, ...zenodoResults];

  fs.writeFileSync(path.join(outputDir, "external-summary.md"), renderExternalSummary(results, runId));
  fs.writeFileSync(path.join(outputDir, "sroie-summary.md"), renderSroieSummary(sroieResults));
  fs.writeFileSync(
    path.join(outputDir, "zenodo-6371710-summary.md"),
    renderZenodoSummary(zenodoResults),
  );
  fs.writeFileSync(path.join(outputDir, "failures-redacted.md"), renderFailures(results));
  fs.writeFileSync(path.join(outputDir, "confidence.csv"), renderConfidenceCsv(results));
  writeJson(path.join(outputDir, "rule-candidates.json"), buildRuleCandidates(results));
  fs.writeFileSync(
    path.join(outputDir, "synthetic-derivative-plan.md"),
    renderSyntheticDerivativePlan(results),
  );
  writeJson(path.join(outputDir, "results-minimized.json"), results);
  writeJson(LATEST_EXTERNAL_RUN, { runId });
  console.log(`Holdout externo escrito en ${outputDir}`);
}

function purgeExternalHoldout() {
  for (const dir of [RAW_SROIE_ROOT, RAW_ZENODO_ROOT, EXTRACTED_ROOT, REDACTED_ROOT]) {
    fs.rmSync(dir, { recursive: true, force: true });
    fs.mkdirSync(dir, { recursive: true });
  }
  const outputDir = latestExternalOutputDir();
  if (outputDir) {
    fs.writeFileSync(
      path.join(outputDir, "purge-proof.md"),
      renderPurgeProof({ findings: [], gitStatus: safeGitStatus(), stage: "external-purge" }),
    );
  }
  console.log("Copias externas temporales borradas. La ruta original no se ha tocado.");
}

function proveExternalPurge() {
  ensureBaseDirs();
  const findings = [];
  for (const dir of [RAW_SROIE_ROOT, RAW_ZENODO_ROOT, EXTRACTED_ROOT, REDACTED_ROOT]) {
    for (const filePath of safeWalk(dir).files) {
      findings.push({ type: "external_temp_residue", filePath: repoRelative(filePath) });
    }
  }
  for (const filePath of trackedExternalDocuments()) {
    findings.push({ type: "tracked_external_document", filePath });
  }
  findings.push(...scanSensitiveArtifacts());
  const outputDir = latestExternalOutputDir();
  if (outputDir) {
    fs.writeFileSync(
      path.join(outputDir, "purge-proof.md"),
      renderPurgeProof({ findings, gitStatus: safeGitStatus(), stage: "external-prove-purge" }),
    );
  }
  if (findings.length) {
    throw new Error(`External prove-purge fallo: ${findings.length} hallazgo(s).`);
  }
  console.log("External prove-purge OK: 0 copias externas y 0 datos sensibles en artifacts.");
}

function inspectDataset(datasetPath) {
  const exists = fs.existsSync(datasetPath);
  const access = checkReadable(datasetPath);
  const report = {
    root: "<external_dataset_root>",
    exists,
    readable: exists && access.readable,
    readError: access.error,
    totalBytes: 0,
    totalFiles: 0,
    extensions: {},
    imageCounts: { jpg: 0, jpeg: 0, png: 0, tif: 0, tiff: 0 },
    pdfCount: 0,
    txtCount: 0,
    jsonCount: 0,
    zipCount: 0,
    topDirectories: [],
    knownFolders: {},
    sampleFileNames: [],
    imageAnnotationPairs: { byBasename: 0, sroieLike: 0, zenodoLike: 0 },
    metadataSignals: {
      sroieCompanyAddressDateTotal: false,
      zenodoSellerTaxDateTotalTaxReference: false,
    },
    detectedDatasets: [],
    classification: "unknown",
    files: [],
    directories: [],
  };
  if (!exists || !access.readable) {
    report.detectedDatasets = [];
    return report;
  }
  const walked = safeWalk(datasetPath);
  report.totalBytes = walked.totalBytes;
  report.totalFiles = walked.files.length;
  report.files = walked.files;
  report.directories = walked.directories;
  report.topDirectories = walked.directories
    .filter((dir) => path.dirname(dir) === datasetPath)
    .map((dir) => path.basename(dir))
    .sort()
    .slice(0, 80);
  report.sampleFileNames = walked.files.map((file) => path.basename(file)).slice(0, 50);
  for (const file of walked.files) {
    const ext = path.extname(file).slice(1).toLowerCase() || "(sin extension)";
    report.extensions[ext] = (report.extensions[ext] ?? 0) + 1;
    if (ext in report.imageCounts) report.imageCounts[ext] += 1;
    if (ext === "pdf") report.pdfCount += 1;
    if (ext === "txt") report.txtCount += 1;
    if (ext === "json") report.jsonCount += 1;
    if (ext === "zip") report.zipCount += 1;
  }
  report.knownFolders = detectKnownFolders(walked.directories);
  report.imageAnnotationPairs = detectPairs(walked.files);
  report.metadataSignals = detectMetadataSignals(walked.files);
  report.detectedDatasets = classifyDatasets(report);
  report.classification = classifyOverall(report.detectedDatasets);
  return report;
}

function importSroieSample(report, max) {
  const candidates = findSroieCandidates(report.files).slice(0, max);
  let imported = 0;
  for (const candidate of candidates) {
    imported += copySroieCandidate(candidate, imported + 1);
  }
  if (imported >= max) return imported;
  const zipCandidates = findSroieZipCandidates(report.files, max - imported);
  for (const candidate of zipCandidates) {
    imported += copySroieZipCandidate(candidate, imported + 1);
  }
  return imported;
}

function importZenodoSample(report, max) {
  const folderCandidates = findZenodoFolderCandidates(report.files).slice(0, max);
  let imported = 0;
  for (const candidate of folderCandidates) {
    imported += copyZenodoCandidate(candidate, imported + 1);
  }
  if (imported > 0) return imported;
  const zipCandidates = findZenodoZipCandidates(report.files, max);
  for (const candidate of zipCandidates.slice(0, max)) {
    imported += copyZenodoZipCandidate(candidate, imported + 1);
  }
  return imported;
}

function runSroieImported(salt) {
  const images = safeWalk(RAW_SROIE_ROOT).files.filter((file) =>
    IMAGE_EXTENSIONS.has(path.extname(file).toLowerCase()),
  );
  return images.map((imagePath) => {
    const base = basenameWithoutRealExtension(imagePath);
    const bboxPath = firstExisting([
      path.join(RAW_SROIE_ROOT, `${base}_bbox.external.txt`),
      path.join(RAW_SROIE_ROOT, `${base}.external.txt`),
    ]);
    const metadataPath = firstExisting([
      path.join(RAW_SROIE_ROOT, `${base}_metadata.external.json`),
      path.join(RAW_SROIE_ROOT, `${base}_metadata.external.txt`),
    ]);
    return evaluateSroieDocument(
      buildSroieOracleDocument({ imagePath, bboxPath, metadataPath, salt }),
    );
  });
}

function runZenodoImported(salt) {
  const images = safeWalk(RAW_ZENODO_ROOT).files.filter((file) =>
    IMAGE_EXTENSIONS.has(path.extname(file).toLowerCase()),
  );
  return images.map((imagePath) => {
    const base = basenameWithoutRealExtension(imagePath);
    const annotationPath = firstExisting([
      path.join(RAW_ZENODO_ROOT, `${base}.external.json`),
      path.join(RAW_ZENODO_ROOT, `${base}_annotation.external.json`),
    ]);
    return evaluateZenodoDocument(
      buildZenodoDocument({ imagePath, annotationPath, salt }),
    );
  });
}

function findSroieCandidates(files) {
  const images = files.filter((file) => IMAGE_EXTENSIONS.has(path.extname(file).toLowerCase()));
  const txtByBase = indexByBase(files.filter((file) => path.extname(file).toLowerCase() === ".txt"));
  const jsonByBase = indexByBase(files.filter((file) => path.extname(file).toLowerCase() === ".json"));
  return images
    .filter((image) => isSroiePath(image) || txtByBase.has(baseName(image)))
    .map((image) => ({
      image,
      bbox: txtByBase.get(baseName(image)),
      metadata: jsonByBase.get(baseName(image)) ?? findNearbyMetadata(image, files),
    }));
}

function findZenodoFolderCandidates(files) {
  const images = files.filter(
    (file) => IMAGE_EXTENSIONS.has(path.extname(file).toLowerCase()) && /(^|[/\\])1_Images([/\\]|$)/i.test(file),
  );
  const jsonByBase = indexByBase(
    files.filter(
      (file) =>
        [".json", ".txt"].includes(path.extname(file).toLowerCase()) &&
        /2_Annotations_Json/i.test(file),
    ),
  );
  return images
    .map((image) => ({ image, annotation: jsonByBase.get(baseName(image)) }))
    .filter((candidate) => candidate.annotation);
}

function findZenodoZipCandidates(files, max) {
  const imageZip = files.find((file) => /1_Images\.zip$/i.test(file) || /images.*\.zip$/i.test(file));
  const annotationZip = files.find((file) => /2_Annotations_Json\.zip$/i.test(file) || /annotation.*json.*\.zip$/i.test(file));
  if (!imageZip || !annotationZip) return [];
  const imageEntries = listZipEntries(imageZip).filter((entry) =>
    IMAGE_EXTENSIONS.has(path.extname(entry).toLowerCase()),
  );
  const annotationEntriesByBase = new Map(
    listZipEntries(annotationZip)
      .filter((entry) => [".json", ".txt"].includes(path.extname(entry).toLowerCase()))
      .map((entry) => [baseName(entry), entry]),
  );
  return imageEntries
    .map((imageEntry) => ({
      imageZip,
      annotationZip,
      imageEntry,
      annotationEntry: annotationEntriesByBase.get(baseName(imageEntry)),
    }))
    .filter((candidate) => candidate.annotationEntry)
    .slice(0, max);
}

function findSroieZipCandidates(files, max) {
  const bboxCandidates = [];
  const metadataCandidates = [];
  const sameZipSources = files.filter((file) =>
    /\.zip$/i.test(file) && /task1|task2|train|sroie|icdar/i.test(path.basename(file)),
  );
  for (const zipPath of sameZipSources) {
    const entries = listZipEntries(zipPath);
    const imageEntries = entries.filter((entry) =>
      IMAGE_EXTENSIONS.has(path.extname(entry).toLowerCase()),
    );
    const txtEntriesByBase = new Map(
      entries
        .filter((entry) => path.extname(entry).toLowerCase() === ".txt")
        .map((entry) => [baseName(entry), entry]),
    );
    for (const imageEntry of imageEntries) {
      const bboxEntry = txtEntriesByBase.get(baseName(imageEntry));
      if (!bboxEntry) continue;
      bboxCandidates.push({ imageZip: zipPath, imageEntry, bboxZip: zipPath, bboxEntry });
    }
  }

  const imageZip = files.find((file) => /SROIE_test_images_task_3\.zip$/i.test(path.basename(file)));
  const metadataZip = files.find((file) => /SROIE_test_gt_task_3\.zip$/i.test(path.basename(file)));
  if (imageZip && metadataZip) {
    const metadataEntriesByBase = new Map(
      listZipEntries(metadataZip)
        .filter((entry) => path.extname(entry).toLowerCase() === ".txt")
        .map((entry) => [baseName(entry), entry]),
    );
    for (const imageEntry of listZipEntries(imageZip).filter((entry) =>
      IMAGE_EXTENSIONS.has(path.extname(entry).toLowerCase()),
    )) {
      const metadataEntry = metadataEntriesByBase.get(baseName(imageEntry));
      if (!metadataEntry) continue;
      metadataCandidates.push({
        imageZip,
        imageEntry,
        metadataZip,
        metadataEntry,
      });
    }
  }
  const bboxLimit = metadataCandidates.length ? Math.ceil(max / 2) : max;
  const pickedBbox = bboxCandidates.slice(0, bboxLimit);
  const pickedMetadata = metadataCandidates.slice(0, max - pickedBbox.length);
  return [...pickedBbox, ...pickedMetadata];
}

function copySroieCandidate(candidate, index) {
  const base = `sroie_${String(index).padStart(3, "0")}`;
  copyExternalFile(candidate.image, path.join(RAW_SROIE_ROOT, `${base}.real${path.extname(candidate.image).toLowerCase()}`));
  if (candidate.bbox) {
    copyExternalFile(candidate.bbox, path.join(RAW_SROIE_ROOT, `${base}_bbox.external.txt`));
  }
  if (candidate.metadata) {
    copyExternalFile(
      candidate.metadata,
      path.join(RAW_SROIE_ROOT, `${base}_metadata.external${path.extname(candidate.metadata).toLowerCase()}`),
    );
  }
  return 1;
}

function copyZenodoCandidate(candidate, index) {
  const base = `zenodo_${String(index).padStart(3, "0")}`;
  copyExternalFile(candidate.image, path.join(RAW_ZENODO_ROOT, `${base}.real${path.extname(candidate.image).toLowerCase()}`));
  copyExternalFile(candidate.annotation, path.join(RAW_ZENODO_ROOT, `${base}.external.json`));
  return 1;
}

function copyZenodoZipCandidate(candidate, index) {
  const base = `zenodo_${String(index).padStart(3, "0")}`;
  fs.writeFileSync(
    path.join(RAW_ZENODO_ROOT, `${base}.real${path.extname(candidate.imageEntry).toLowerCase()}`),
    unzipEntry(candidate.imageZip, candidate.imageEntry),
  );
  fs.writeFileSync(
    path.join(RAW_ZENODO_ROOT, `${base}.external.json`),
    unzipEntry(candidate.annotationZip, candidate.annotationEntry),
  );
  return 1;
}

function copySroieZipCandidate(candidate, index) {
  const base = `sroie_${String(index).padStart(3, "0")}`;
  fs.writeFileSync(
    path.join(RAW_SROIE_ROOT, `${base}.real${path.extname(candidate.imageEntry).toLowerCase()}`),
    unzipEntry(candidate.imageZip, candidate.imageEntry),
  );
  if (candidate.bboxEntry) {
    fs.writeFileSync(
      path.join(RAW_SROIE_ROOT, `${base}_bbox.external.txt`),
      unzipEntry(candidate.bboxZip, candidate.bboxEntry),
    );
  }
  if (candidate.metadataEntry) {
    fs.writeFileSync(
      path.join(RAW_SROIE_ROOT, `${base}_metadata.external.txt`),
      unzipEntry(candidate.metadataZip, candidate.metadataEntry),
    );
  }
  return 1;
}

function renderInspectionSummary(report) {
  return `# External Invoice Holdout Inspection

Esta inspeccion corresponde a la fase externa temporal posterior a la Fase 4 local. No valida fiscalidad española.

- Ruta existe: ${report.exists ? "si" : "no"}
- Ruta legible por este proceso: ${report.readable ? "si" : "no"}
- Error de lectura: ${report.readError ?? "ninguno"}
- Tamano total: ${formatBytes(report.totalBytes)}
- Numero total de archivos: ${report.totalFiles}
- Clasificacion: ${report.classification}

## Extensiones

${renderCountBullets(report.extensions)}

## Imagenes y documentos

- JPG: ${report.imageCounts.jpg}
- JPEG: ${report.imageCounts.jpeg}
- PNG: ${report.imageCounts.png}
- TIF: ${report.imageCounts.tif}
- TIFF: ${report.imageCounts.tiff}
- PDFs: ${report.pdfCount}
- TXT: ${report.txtCount}
- JSON: ${report.jsonCount}
- ZIP: ${report.zipCount}

## Carpetas principales

${report.topDirectories.map((dir) => `- ${dir}`).join("\n") || "- No disponible"}

## Carpetas conocidas

${renderCountBullets(report.knownFolders)}

## Muestra de nombres de archivo

${report.sampleFileNames.map((name) => `- ${redactFileName(name)}`).join("\n") || "- No disponible"}

## Pares imagen + anotacion

- Por basename: ${report.imageAnnotationPairs.byBasename}
- SROIE-like: ${report.imageAnnotationPairs.sroieLike}
- Zenodo-like: ${report.imageAnnotationPairs.zenodoLike}

## Metadata detectada

- SROIE company/address/date/total: ${report.metadataSignals.sroieCompanyAddressDateTotal ? "si" : "no"}
- Zenodo seller/tax/date/total/tax/reference: ${report.metadataSignals.zenodoSellerTaxDateTotalTaxReference ? "si" : "no"}

## Subdatasets detectados

${report.detectedDatasets.map((dataset) => `- ${dataset}`).join("\n") || "- Ninguno"}
`;
}

function renderExternalSummary(results, runId) {
  const counts = countBy(results, (result) => result.status);
  const bySuite = countBy(results, (result) => result.suite);
  const categories = countBy(results.flatMap((result) => result.failureCategories), (category) => category);
  return `# External Holdout Summary

Run: ${runId}

## Spanish invoice benchmark

No se mezcla con este holdout externo. Debe validarse aparte con synthetic_basic, synthetic_expanded, synthetic_adversarial y private_real STIL.

## External holdout

- Documentos procesados: ${results.length}
- pass_with_partial_ground_truth: ${counts.pass_with_partial_ground_truth ?? 0}
- pass_by_internal_consistency: ${counts.pass_by_internal_consistency ?? 0}
- needs_manual_review: ${counts.needs_manual_review ?? 0}
- failed: ${counts.failed ?? 0}
- skipped: ${counts.skipped ?? 0}
- IA usada: 0%

## Suites externas

${renderCountBullets(bySuite)}

## Top fallos

${renderCountBullets(categories) || "- Sin fallos"}

## Lectura correcta

SROIE/Zenodo no validan IVA espanol avanzado, IRPF, recargo, Facturae, m2/ml, ancho x alto ni grupos tipo STIL. Solo miden robustez documental externa.
`;
}

function renderSroieSummary(results) {
  const withMetadata = results.filter((result) => result.expectedPartialPresent?.company || result.expectedPartialPresent?.date || result.expectedPartialPresent?.total).length;
  return `# SROIE Summary

- Suite: external_sroie_holdout
- Documentos: ${results.length}
- Modo: oracle OCR cuando hay bbox; real OCR no usado
- Documentos con metadata parcial: ${withMetadata}
- Company accuracy parcial: ${partialAccuracy(results, "company")}
- Date accuracy parcial: ${partialAccuracy(results, "date")}
- Total accuracy parcial: ${partialAccuracy(results, "total")}
- Bbox parse rate: ${ratio(results, (result) => (result.ocrWordCount ?? 0) > 0)}

Valor: alto para OCR/layout/fecha/total/company; bajo para fiscalidad espanola y lineas complejas.
`;
}

function renderZenodoSummary(results) {
  return `# Zenodo 6371710 Summary

- Suite: external_zenodo_6371710_holdout
- Documentos: ${results.length}
- Modo: image + JSON annotation
- Seller detection accuracy parcial: ${ratio(results, (result) => result.metrics?.seller === "detected_redacted")}
- Date accuracy parcial: ${ratio(results, (result) => result.metrics?.date === "detected")}
- Total accuracy parcial: ${ratio(results, (result) => result.metrics?.total === "detected")}
- Tax amount accuracy parcial: ${ratio(results, (result) => result.metrics?.taxAmount === "detected")}
- Reference accuracy parcial: ${ratio(results, (result) => result.metrics?.reference === "detected_redacted")}
- Tax id detected/redacted count: ${results.filter((result) => result.metrics?.supplierTaxId === "detected_redacted" || result.metrics?.buyerTaxId === "detected_redacted").length}

Valor: medio/alto para documentos portugueses cercanos; bajo para normativa espanola especifica y m2/ml.
`;
}

function renderFailures(results) {
  const failures = results.filter((result) => result.failureCategories.length || result.needsManualReview);
  if (!failures.length) return "# Failures Redacted\n\nSin fallos.\n";
  return `# Failures Redacted

${failures
  .map(
    (result) =>
      `- ${result.documentId}: suite=${result.suite}; status=${result.status}; categorias=${result.failureCategories.join(", ") || "manual_review"}`,
  )
  .join("\n")}
`;
}

function renderConfidenceCsv(results) {
  const rows = [
    "documentId,suite,source,mode,status,aiUsed,needsManualReview,company,date,total,taxAmount,reference,ocr",
  ];
  for (const result of results) {
    rows.push([
      result.documentId,
      result.suite,
      result.source,
      result.mode,
      result.status,
      result.aiUsed,
      result.needsManualReview,
      result.confidence?.company ?? result.confidence?.seller ?? "",
      result.confidence?.date ?? "",
      result.confidence?.total ?? "",
      result.confidence?.taxAmount ?? "",
      result.confidence?.reference ?? "",
      result.confidence?.ocr ?? "",
    ].join(","));
  }
  return `${rows.join("\n")}\n`;
}

function buildRuleCandidates(results) {
  const categories = countBy(results.flatMap((result) => result.failureCategories), (category) => category);
  return Object.entries(categories)
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .map(([category, count]) => ({
      category,
      count,
      realDataIncluded: false,
      candidateRule: candidateRuleFor(category),
    }));
}

function renderSyntheticDerivativePlan(results) {
  const candidates = buildRuleCandidates(results);
  return `# Synthetic Derivative Plan

No copiar texto, imagenes, nombres, direcciones ni numeros reales. Convertir solo patrones en fixtures sinteticos.

${candidates.length ? candidates.map((item) => `- ${item.category}: ${item.candidateRule}`).join("\n") : "- Sin patrones nuevos."}
`;
}

function candidateRuleFor(category) {
  const rules = {
    external_dataset_structure_unknown: "Crear detector de estructura antes de importar.",
    external_annotation_missing: "Fixture sintetico de imagen sin anotacion para probar needs_manual_review.",
    external_image_missing: "Validar pairing antes de ejecutar parser.",
    external_pairing_failed: "Mejorar emparejado por basename normalizado.",
    sroie_bbox_parse_failed: "Fixture con bbox OCR corrupto o multilinea.",
    sroie_metadata_missing: "Aceptar OCR oracle sin metadata como diagnostico, no como OK.",
    sroie_company_mismatch: "Mejorar normalizacion de merchant/company.",
    sroie_date_mismatch: "Ampliar formatos de fecha no espanoles.",
    sroie_total_mismatch: "Ampliar parsing numerico de tickets.",
    sroie_ocr_required: "Separar image-only y requerir OCR real cuando exista motor.",
    zenodo_json_parse_failed: "Tolerar variantes JSON y avisar sin guardar bruto.",
    zenodo_image_missing: "Verificar imagen antes de validar anotacion.",
    zenodo_seller_mismatch: "Ampliar sinonimos vendedor/fornecedor/seller.",
    zenodo_tax_id_detection_failed: "Ampliar deteccion de NIF/NIPC portugues sin conservar valores.",
    zenodo_date_mismatch: "Ampliar fechas portuguesas.",
    zenodo_total_mismatch: "Ampliar total/valor total/total a pagar.",
    zenodo_tax_amount_mismatch: "Ampliar IVA/imposto/tax amount.",
    zenodo_reference_mismatch: "Ampliar referencia/numero documento.",
    zenodo_portuguese_label_mapping_failed: "Anadir nuevos sinonimos portugueses como fixture sintetico.",
  };
  return rules[category] ?? "Revisar patron y crear fixture sintetico derivado sin datos reales.";
}

function renderPurgeProof({ findings, gitStatus, stage }) {
  return `# External Purge Proof

- Stage: ${stage}
- Copias externas encontradas: ${findings.filter((finding) => finding.type.includes("residue")).length}
- Documentos externos trackeados: ${findings.filter((finding) => finding.type.includes("tracked")).length}
- Patrones sensibles en artifacts: ${findings.filter((finding) => finding.type === "sensitive_pattern").length}

## Git status

\`\`\`
${gitStatus || "(sin salida)"}
\`\`\`

## Hallazgos

${findings.length ? findings.map((finding) => `- ${finding.type}: ${finding.filePath} ${finding.pattern ?? ""}`.trim()).join("\n") : "- Ninguno"}
`;
}

function detectKnownFolders(directories) {
  const names = [
    "SROIE",
    "ICDAR",
    "task1",
    "task2",
    "task3",
    "train",
    "test",
    "trainval",
    "images",
    "labels",
    "annotations",
    "1_Images",
    "2_Annotations_Json",
  ];
  const counts = {};
  for (const dir of directories) {
    const base = path.basename(dir).toLowerCase();
    for (const name of names) {
      if (base === name.toLowerCase()) counts[name] = (counts[name] ?? 0) + 1;
    }
  }
  return counts;
}

function detectPairs(files) {
  const images = files.filter((file) => IMAGE_EXTENSIONS.has(path.extname(file).toLowerCase()));
  const txtByBase = indexByBase(files.filter((file) => path.extname(file).toLowerCase() === ".txt"));
  const jsonByBase = indexByBase(files.filter((file) => path.extname(file).toLowerCase() === ".json"));
  const byBasename = images.filter((image) => txtByBase.has(baseName(image)) || jsonByBase.has(baseName(image))).length;
  const sroieLike = images.filter((image) => isSroiePath(image) && txtByBase.has(baseName(image))).length;
  const zenodoLike = images.filter((image) => /1_Images/i.test(image) && jsonByBase.has(baseName(image))).length;
  return { byBasename, sroieLike, zenodoLike };
}

function detectMetadataSignals(files) {
  const jsonSample = files
    .filter((file) => [".json", ".txt"].includes(path.extname(file).toLowerCase()))
    .slice(0, 100);
  let sroie = false;
  let zenodo = false;
  for (const file of jsonSample) {
    const text = safeReadSmall(file);
    const normalized = normalizeLoose(text);
    if (["company", "address", "date", "total"].every((key) => normalized.includes(key))) {
      sroie = true;
    }
    if (
      ["seller", "tax", "date", "total"].every((key) => normalized.includes(key)) ||
      ["fornecedor", "nif", "data", "total", "iva"].some((key) => normalized.includes(key))
    ) {
      zenodo = true;
    }
  }
  return {
    sroieCompanyAddressDateTotal: sroie,
    zenodoSellerTaxDateTotalTaxReference: zenodo,
  };
}

function classifyDatasets(report) {
  const detected = new Set();
  const folderKeys = Object.keys(report.knownFolders).map((key) => key.toLowerCase());
  const fileNames = report.sampleFileNames.map((name) => name.toLowerCase()).join(" ");
  if (folderKeys.some((key) => ["sroie", "icdar", "task1", "task2", "task3", "trainval"].includes(key))) {
    detected.add("sroie_original");
  }
  if (/sroie|icdar|task1|task2|task3|script_ch13/.test(fileNames)) {
    detected.add("sroie_original");
  }
  if (report.imageAnnotationPairs.sroieLike > 0) detected.add("sroie_variant");
  if (report.knownFolders["1_Images"] || report.knownFolders["2_Annotations_Json"]) {
    detected.add("zenodo_6371710");
  }
  if (report.zipCount > 0 && report.sampleFileNames.some((name) => /1_Images|2_Annotations_Json|Images|Annotations|Json/i.test(name))) {
    detected.add("zenodo_6371710");
  }
  if (report.metadataSignals.zenodoSellerTaxDateTotalTaxReference) {
    detected.add("zenodo_huggingface_variant");
  }
  if (detected.size > 1) detected.add("mixed_downloads");
  if (!detected.size) detected.add("unknown");
  return [...detected];
}

function classifyOverall(datasets) {
  if (datasets.includes("mixed_downloads")) return "mixed_downloads";
  if (datasets.length === 1) return datasets[0];
  if (datasets.length > 1) return "mixed_downloads";
  return "unknown";
}

function redactedInspectionJson(report) {
  const safeReport = { ...report };
  delete safeReport.files;
  delete safeReport.directories;
  return safeReport;
}

function safeWalk(root) {
  const output = { files: [], directories: [], totalBytes: 0, errors: [] };
  const visit = (current) => {
    if (output.files.length >= MAX_WALK_FILES) return;
    let stat;
    try {
      stat = fs.statSync(current);
    } catch (error) {
      output.errors.push(error.message);
      return;
    }
    if (stat.isDirectory()) {
      output.directories.push(current);
      let entries = [];
      try {
        entries = fs.readdirSync(current);
      } catch (error) {
        output.errors.push(error.message);
        return;
      }
      for (const entry of entries) visit(path.join(current, entry));
      return;
    }
    output.files.push(current);
    output.totalBytes += stat.size;
  };
  visit(root);
  return output;
}

function checkReadable(root) {
  try {
    fs.accessSync(root, fs.constants.R_OK);
    fs.readdirSync(root);
    return { readable: true, error: undefined };
  } catch (error) {
    return { readable: false, error: error.message };
  }
}

function copyExternalFile(source, target) {
  if (!INPUT_EXTENSIONS.has(path.extname(source).toLowerCase())) {
    throw new Error(`Extension externa no permitida: ${path.extname(source)}`);
  }
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.copyFileSync(source, target);
}

function findNearbyMetadata(image, files) {
  const base = baseName(image);
  const candidates = files.filter((file) => path.extname(file).toLowerCase() === ".json" && baseName(file) === base);
  return candidates[0];
}

function listZipEntries(zipPath) {
  try {
    return execFileSync("unzip", ["-Z1", zipPath], {
      encoding: "utf8",
      maxBuffer: 64 * 1024 * 1024,
    })
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean);
  } catch {
    return [];
  }
}

function unzipEntry(zipPath, entry) {
  return execFileSync("unzip", ["-p", zipPath, entry], {
    maxBuffer: 64 * 1024 * 1024,
  });
}

function indexByBase(files) {
  const map = new Map();
  for (const file of files) {
    const base = baseName(file);
    if (!map.has(base)) map.set(base, file);
  }
  return map;
}

function baseName(file) {
  return path.basename(file).replace(/\.(real|external)\.(json|txt|jpg|jpeg|png|tif|tiff|pdf)$/i, "").replace(/\.[^.]+$/g, "");
}

function basenameWithoutRealExtension(file) {
  return path.basename(file).replace(/\.real\.(jpg|jpeg|png|tif|tiff)$/i, "");
}

function isSroiePath(file) {
  return /sroie|icdar|task1|task2|task3|trainval/i.test(file);
}

function firstExisting(paths) {
  return paths.find((item) => item && fs.existsSync(item));
}

function ensureBaseDirs() {
  for (const dir of [ARTIFACTS_ROOT, INSPECTION_ROOT, RAW_SROIE_ROOT, RAW_ZENODO_ROOT, EXTRACTED_ROOT, REDACTED_ROOT]) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

function assertExternalGitignoreConfigured() {
  const gitignore = fs.readFileSync(path.join(REPO_ROOT, ".gitignore"), "utf8");
  const missing = REQUIRED_GITIGNORE_PATTERNS.filter((pattern) => !gitignore.includes(pattern));
  if (missing.length) throw new Error(`Faltan reglas en .gitignore: ${missing.join(", ")}`);
}

function trackedExternalDocuments() {
  return execFileSync("git", ["ls-files"], { cwd: REPO_ROOT, encoding: "utf8" })
    .split("\n")
    .filter(Boolean)
    .filter(
      (file) =>
        file.startsWith("test/fixtures/invoices/private_real_qa/raw/") ||
        /\.(real\.(pdf|jpg|jpeg|png|tif|tiff)|external\.(json|txt))$/i.test(file),
    );
}

function scanSensitiveArtifacts() {
  const findings = [];
  const files = safeWalk(ARTIFACTS_ROOT).files.filter((file) => /\.(md|json|csv|txt)$/i.test(file));
  for (const file of files) {
    const text = fs.readFileSync(file, "utf8");
    for (const [pattern, regex] of SENSITIVE_PATTERNS) {
      regex.lastIndex = 0;
      if (regex.test(text)) {
        findings.push({ type: "sensitive_pattern", pattern, filePath: repoRelative(file) });
      }
    }
  }
  return findings;
}

function latestExternalOutputDir() {
  if (!fs.existsSync(LATEST_EXTERNAL_RUN)) return undefined;
  try {
    const latest = JSON.parse(fs.readFileSync(LATEST_EXTERNAL_RUN, "utf8"));
    return latest.outputDir ?? path.join(ARTIFACTS_ROOT, latest.runId);
  } catch {
    return undefined;
  }
}

function firstPathArg(args) {
  return args.find((arg) => arg && !arg.startsWith("--")) ?? DEFAULT_EXTERNAL_ROOT;
}

function parseLimits(args) {
  return {
    sroieMax: numberArg(args, "--sroie-max", 50),
    zenodoMax: numberArg(args, "--zenodo-max", 50),
  };
}

function numberArg(args, name, fallback) {
  const index = args.indexOf(name);
  if (index < 0) return fallback;
  const parsed = Number(args[index + 1]);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function renderCountBullets(counts) {
  const entries = Object.entries(counts ?? {}).sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
  return entries.map(([key, value]) => `- ${key}: ${value}`).join("\n") || "- Ninguno";
}

function countBy(items, keyFn) {
  return items.reduce((acc, item) => {
    const key = keyFn(item);
    acc[key] = (acc[key] ?? 0) + 1;
    return acc;
  }, {});
}

function ratio(results, predicate) {
  if (!results.length) return "n/a";
  return `${results.filter(predicate).length}/${results.length}`;
}

function partialAccuracy(results, metric) {
  const comparable = results.filter((result) =>
    ["match", "mismatch"].includes(result.metrics?.[metric]),
  );
  if (!comparable.length) return "n/a";
  return `${comparable.filter((result) => result.metrics?.[metric] === "match").length}/${comparable.length}`;
}

function safeReadSmall(file) {
  try {
    return fs.readFileSync(file, "utf8").slice(0, 10000);
  } catch {
    return "";
  }
}

function normalizeLoose(value) {
  return String(value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

function redactFileName(name) {
  return String(name ?? "")
    .replace(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi, "[email]")
    .replace(/\b(?:[ABCDEFGHJKLMNPQRSUVW]\d{7}[0-9A-J]|\d{8}[A-Z]|[XYZ]\d{7}[A-Z]|\d{9})\b/gi, "[tax-id]");
}

function safeGitStatus() {
  try {
    return execFileSync("git", ["status", "--short"], { cwd: REPO_ROOT, encoding: "utf8" }).trim();
  } catch {
    return "git status failed";
  }
}

function repoRelative(file) {
  return path.relative(REPO_ROOT, file).replace(/\\/g, "/");
}

function formatBytes(bytes) {
  if (!bytes) return "0 B";
  const units = ["B", "KB", "MB", "GB"];
  let value = bytes;
  let unit = 0;
  while (value >= 1024 && unit < units.length - 1) {
    value /= 1024;
    unit += 1;
  }
  return `${value.toFixed(unit === 0 ? 0 : 1)} ${units[unit]}`;
}

function timestamp() {
  return new Date().toISOString().replace("T", "_").replace(/:/g, "-").slice(0, 19);
}
