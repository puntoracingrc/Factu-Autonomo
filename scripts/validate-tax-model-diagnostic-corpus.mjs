#!/usr/bin/env node

import { createHash } from "node:crypto";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { dirname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import Ajv from "ajv";

const repositoryRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const corpusRoot = join(repositoryRoot, "test/fixtures/tax-model-diagnostic");
const manifestsRoot = join(corpusRoot, "manifests");
const schema = JSON.parse(
  readFileSync(join(corpusRoot, "manifest.schema.json"), "utf8"),
);
const requireAssets = process.argv.includes("--require-assets");
const expectedBaseCounts = new Map([
  ["MODEL_036", 5],
  ["MODEL_037", 3],
  ["MODEL_130", 4],
  ["MODEL_303", 5],
  ["MODEL_390", 4],
  ["MODEL_111", 4],
  ["MODEL_115", 4],
  ["AEAT_ECONOMIC_ACTIVITIES_VIEW", 4],
  ["AEAT_TAX_STATUS_VIEW", 4],
  ["AEAT_OBLIGATIONS_VIEW", 4],
]);
const screenTypes = new Set([
  "AEAT_ECONOMIC_ACTIVITIES_VIEW",
  "AEAT_TAX_STATUS_VIEW",
  "AEAT_OBLIGATIONS_VIEW",
]);
const ajv = new Ajv({ allErrors: true, jsonPointers: true });
const validate = ajv.compile(schema);
const errors = [];

function safeAssetPath(assetPath) {
  const absolute = resolve(corpusRoot, assetPath);
  const inside = relative(corpusRoot, absolute);
  if (inside.startsWith("..") || inside === "") {
    throw new Error("La ruta del asset sale del directorio del corpus.");
  }
  return absolute;
}

function sha256(path) {
  return createHash("sha256").update(readFileSync(path)).digest("hex");
}

const manifestFiles = existsSync(manifestsRoot)
  ? readdirSync(manifestsRoot)
      .filter((name) => name.endsWith(".json"))
      .sort()
  : [];
const fixtureIds = new Set();
const manifests = [];

for (const name of manifestFiles) {
  const path = join(manifestsRoot, name);
  let manifest;
  try {
    manifest = JSON.parse(readFileSync(path, "utf8"));
  } catch (error) {
    errors.push(`${name}: JSON ilegible (${error.message}).`);
    continue;
  }
  if (!validate(manifest)) {
    for (const issue of validate.errors ?? []) {
      errors.push(`${name}${issue.dataPath}: ${issue.message}.`);
    }
    continue;
  }
  if (fixtureIds.has(manifest.fixtureId)) {
    errors.push(`${name}: fixtureId duplicado (${manifest.fixtureId}).`);
  }
  fixtureIds.add(manifest.fixtureId);
  manifests.push(manifest);

  if (
    (manifest.source.kind === "SYNTHETIC_OFFICIAL_FORM" ||
      manifest.source.kind === "SYNTHETIC_FUNCTIONAL_VIEW") &&
    manifest.source.officialReference === null
  ) {
    errors.push(
      `${name}: un formulario sintético debe enlazar la referencia oficial contrastada.`,
    );
  }

  let pdfPath;
  try {
    pdfPath = safeAssetPath(manifest.asset.pdfPath);
  } catch (error) {
    errors.push(`${name}: ${error.message}`);
    continue;
  }
  if (!existsSync(pdfPath)) {
    errors.push(`${name}: no existe ${manifest.asset.pdfPath}.`);
  } else if (sha256(pdfPath) !== manifest.source.sha256) {
    errors.push(`${name}: la huella SHA-256 no coincide.`);
  }
  if (manifest.asset.extractedTextPath) {
    try {
      const textPath = safeAssetPath(manifest.asset.extractedTextPath);
      if (!existsSync(textPath)) {
        errors.push(`${name}: no existe ${manifest.asset.extractedTextPath}.`);
      }
    } catch (error) {
      errors.push(`${name}: ${error.message}`);
    }
  }
}

if (requireAssets) {
  const bySemanticCase = new Map();
  for (const manifest of manifests) {
    const group = bySemanticCase.get(manifest.semanticCaseId) ?? [];
    group.push(manifest);
    bySemanticCase.set(manifest.semanticCaseId, group);
  }

  const baseCounts = new Map();
  for (const [semanticCaseId, group] of bySemanticCase) {
    const bases = group.filter((manifest) => manifest.parentFixtureId === null);
    if (bases.length !== 1) {
      errors.push(
        `${semanticCaseId}: se esperaba exactamente un documento base y hay ${bases.length}.`,
      );
      continue;
    }
    const base = bases[0];
    baseCounts.set(
      base.documentType,
      (baseCounts.get(base.documentType) ?? 0) + 1,
    );
    const requiredVariants = screenTypes.has(base.documentType)
      ? ["SCREENSHOT", "COMPRESSED_SCREENSHOT", "CROPPED_SCREENSHOT"]
      : ["NATIVE_PDF", "SCANNED_PDF", "LOW_RESOLUTION_SCAN", "ROTATED_SCAN"];
    const presentVariants = new Set(
      group.map((manifest) => manifest.visualVariant),
    );
    for (const variant of requiredVariants) {
      if (!presentVariants.has(variant)) {
        errors.push(`${semanticCaseId}: falta la variante ${variant}.`);
      }
    }
    for (const manifest of group) {
      if (manifest.documentType !== base.documentType) {
        errors.push(
          `${manifest.fixtureId}: cambia el tipo del caso semántico.`,
        );
      }
      if (
        manifest.parentFixtureId !== null &&
        manifest.parentFixtureId !== base.fixtureId
      ) {
        errors.push(
          `${manifest.fixtureId}: parentFixtureId no apunta a su documento base.`,
        );
      }
    }
  }

  for (const [documentType, expectedCount] of expectedBaseCounts) {
    const actualCount = baseCounts.get(documentType) ?? 0;
    if (actualCount !== expectedCount) {
      errors.push(
        `${documentType}: se esperaban ${expectedCount} casos base y hay ${actualCount}.`,
      );
    }
  }
  if (bySemanticCase.size !== 41) {
    errors.push(
      `El corpus completo exige 41 casos semánticos y contiene ${bySemanticCase.size}.`,
    );
  }
}

if (errors.length > 0) {
  for (const error of errors) process.stderr.write(`- ${error}\n`);
  process.exitCode = 1;
} else {
  process.stdout.write(
    `Corpus fiscal válido: ${manifestFiles.length} manifiestos comprobados${
      requireAssets ? " con assets obligatorios" : ""
    }.\n`,
  );
}
