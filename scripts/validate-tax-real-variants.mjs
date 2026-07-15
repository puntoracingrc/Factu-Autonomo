#!/usr/bin/env node

import { createHash } from "node:crypto";
import { readFile, readdir } from "node:fs/promises";
import { basename, dirname, join, relative, resolve } from "node:path";

const ROOT = resolve("test/fixtures/tax-model-diagnostic/real-variants-v1");
const SCHEMA_PATH = join(ROOT, "manifest.schema.json");
const REQUIRE_REAL = process.argv.includes("--require-real");
const REQUIRE_HOLDOUT = process.argv.includes("--require-holdout");
const MANIFEST_VERSION = "tax-real-variant-manifest.2026-07.v1";
const REAL_CLASSES = new Set(["REAL_ANONYMIZED", "HOLDOUT"]);
const OFFICIAL_HOSTS = new Set([
  "sede.agenciatributaria.gob.es",
  "www.agenciatributaria.es",
  "agenciatributaria.es",
  "www.boe.es",
  "boe.es",
  "sede.seg-social.gob.es",
  "www.seg-social.es",
  "seg-social.es",
]);

function fail(code) {
  throw new Error(code);
}

async function filesBelow(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const output = [];
  for (const entry of entries) {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) output.push(...(await filesBelow(path)));
    else output.push(path);
  }
  return output;
}

function sha256(bytes) {
  return createHash("sha256").update(bytes).digest("hex");
}

function officialHttps(value) {
  try {
    const url = new URL(value);
    return (
      url.protocol === "https:" &&
      url.username === "" &&
      url.password === "" &&
      url.port === "" &&
      OFFICIAL_HOSTS.has(url.hostname)
    );
  } catch {
    return false;
  }
}

function allPrivacyChecksPass(review) {
  return [
    "automatedScanPassed",
    "humanVisualReviewCompleted",
    "textLayerChecked",
    "ocrLayerChecked",
    "metadataChecked",
    "acroFormChecked",
    "xfaChecked",
    "annotationsChecked",
    "embeddedFilesChecked",
    "qrAndBarcodeChecked",
    "fileNameChecked",
    "hiddenContentChecked",
  ].every((key) => review?.[key] === true);
}

function validateShape(value, schema, source) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    fail(`MANIFEST_NOT_OBJECT:${source}`);
  }
  const allowedKeys = new Set(Object.keys(schema.properties));
  for (const key of Object.keys(value)) {
    if (!allowedKeys.has(key)) fail(`UNKNOWN_FIELD:${source}:${key}`);
  }
  for (const key of schema.required) {
    if (!(key in value)) fail(`MISSING_FIELD:${source}:${key}`);
  }
  if (value.manifestVersion !== MANIFEST_VERSION) {
    fail(`INCOMPATIBLE_MANIFEST_VERSION:${source}`);
  }
  if (!schema.properties.family.enum.includes(value.family)) {
    fail(`UNKNOWN_FAMILY:${source}`);
  }
  if (!/^[a-z0-9][a-z0-9-]{2,127}$/.test(value.fixtureId)) {
    fail(`INVALID_FIXTURE_ID:${source}`);
  }
  if (!/^[a-f0-9]{64}$/.test(value.sha256)) {
    fail(`INVALID_SHA256:${source}`);
  }
  if (
    !Array.isArray(value.officialSourceReferences) ||
    value.officialSourceReferences.length === 0 ||
    !value.officialSourceReferences.every(officialHttps)
  ) {
    fail(`INVALID_OFFICIAL_SOURCE_REFERENCE:${source}`);
  }
  if (REAL_CLASSES.has(value.sourceClass)) {
    if (value.authorizationRecorded !== true) {
      fail(`REAL_SOURCE_WITHOUT_AUTHORIZATION:${source}`);
    }
    if (!allPrivacyChecksPass(value.privacyReview)) {
      fail(`REAL_SOURCE_PRIVACY_REVIEW_INCOMPLETE:${source}`);
    }
    if (!Array.isArray(value.reviewers) || value.reviewers.length < 2) {
      fail(`REAL_SOURCE_REQUIRES_TWO_REVIEWERS:${source}`);
    }
  }
}

async function main() {
  const schema = JSON.parse(await readFile(SCHEMA_PATH, "utf8"));
  const families = schema.properties.family.enum;
  if (families.length !== 39 || new Set(families).size !== 39) {
    fail("SCHEMA_FAMILY_COUNT_MISMATCH");
  }
  const files = await filesBelow(ROOT);
  const manifests = files.filter((path) => path.endsWith(".manifest.json"));
  const fixtureIds = new Set();
  const hashes = new Set();
  const realByFamily = new Map(families.map((family) => [family, 0]));
  const holdoutByFamily = new Map(families.map((family) => [family, 0]));

  for (const path of manifests) {
    const safePath = relative(ROOT, path);
    if (safePath.startsWith("..")) fail("MANIFEST_PATH_ESCAPE");
    const value = JSON.parse(await readFile(path, "utf8"));
    validateShape(value, schema, safePath);
    if (fixtureIds.has(value.fixtureId)) fail("DUPLICATE_FIXTURE_ID");
    if (hashes.has(value.sha256)) fail("DUPLICATE_SHA256");
    fixtureIds.add(value.fixtureId);
    hashes.add(value.sha256);

    const expectedName = `${value.fixtureId}.pdf`;
    const pdfPath = join(dirname(path), expectedName);
    if (basename(pdfPath) !== expectedName) fail("PDF_PATH_NOT_CANONICAL");
    let bytes;
    try {
      bytes = await readFile(pdfPath);
    } catch {
      fail(`PDF_MISSING:${safePath}`);
    }
    if (sha256(bytes) !== value.sha256) fail(`SHA256_MISMATCH:${safePath}`);
    if (value.sourceClass === "REAL_ANONYMIZED") {
      realByFamily.set(value.family, realByFamily.get(value.family) + 1);
    }
    if (value.sourceClass === "HOLDOUT") {
      holdoutByFamily.set(value.family, holdoutByFamily.get(value.family) + 1);
    }
  }

  const realGapCount = [...realByFamily.values()].filter(
    (count) => count === 0,
  ).length;
  const holdoutGapCount = [...holdoutByFamily.values()].filter(
    (count) => count === 0,
  ).length;
  const report = {
    manifestVersion: MANIFEST_VERSION,
    familyCount: families.length,
    manifestCount: manifests.length,
    realAnonymizedCount: [...realByFamily.values()].reduce(
      (total, value) => total + value,
      0,
    ),
    holdoutCount: [...holdoutByFamily.values()].reduce(
      (total, value) => total + value,
      0,
    ),
    realVariantGapCount: realGapCount,
    holdoutGapCount,
    rawValuesExposed: false,
  };
  process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
  if (REQUIRE_REAL && realGapCount > 0) process.exitCode = 2;
  if (REQUIRE_HOLDOUT && holdoutGapCount > 0) process.exitCode = 3;
}

main().catch((error) => {
  process.stderr.write(
    `${error instanceof Error ? error.message : "VALIDATION_FAILED"}\n`,
  );
  process.exitCode = 1;
});
