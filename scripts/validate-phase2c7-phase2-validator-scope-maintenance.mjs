import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const root = path.resolve(new URL("../", import.meta.url).pathname);
const errors = [];

function fail(message) {
  errors.push(message);
}

function absolute(relativePath) {
  return path.join(root, relativePath);
}

function read(relativePath) {
  return fs.existsSync(absolute(relativePath))
    ? fs.readFileSync(absolute(relativePath), "utf8")
    : "";
}

function run(scriptName) {
  try {
    execFileSync("npm", ["run", scriptName], {
      cwd: root,
      encoding: "utf8",
      stdio: "pipe",
    });
  } catch (error) {
    fail(`${scriptName} failed: ${error.message}`);
  }
}

const qU = read("scripts/validate-phase2b7q-u-official-artifact-readiness-tooling.mjs");
const vZ = read("scripts/validate-phase2b7v-z-official-artifact-unlock-preparation.mjs");
const c1To6 = read("scripts/validate-phase2c1-6-server-sync-integrity-foundation.mjs");
const doc = read("docs/phase2c7-phase2-validator-scope-maintenance-v1.md");
const packageJson = JSON.parse(read("package.json") || "{}");

for (const marker of [
  "PHASE2C7_PHASE2_VALIDATOR_SCOPE_MAINTENANCE_V1",
  "falsos positivos",
  "Seguridad conservada",
  "validate-phase2c1-6-server-sync-integrity-foundation.mjs",
]) {
  if (!doc.includes(marker)) fail(`2C.7 doc missing marker ${marker}.`);
}

for (const marker of [
  "phase2b7qURuntimeFiles",
  "local-artifact-intake.ts",
  "readiness-report.ts",
]) {
  if (!qU.includes(marker)) fail(`2B.7Q-U validator missing scoped marker ${marker}.`);
}

for (const marker of [
  "unrelatedLaterPhasePatterns",
  "document-sync-integrity",
  "validate-phase2c",
]) {
  if (!vZ.includes(marker)) fail(`2B.7V-Z validator missing scoped marker ${marker}.`);
}

for (const marker of [
  "unrelatedLaterPhasePatterns",
  "phase2c10",
  "phase2c(?:7|10|11|12)",
]) {
  if (!c1To6.includes(marker)) fail(`2C.1-2C.6 validator missing scoped marker ${marker}.`);
}

if (!packageJson.scripts?.["validate:phase2c7-phase2-validator-scope-maintenance"]) {
  fail("Missing npm script validate:phase2c7-phase2-validator-scope-maintenance.");
}

run("validate:phase2b7q-u-official-artifact-readiness-tooling");
run("validate:phase2b7v-z-official-artifact-unlock-preparation");

if (errors.length > 0) {
  console.error("Phase 2C.7 validator scope maintenance validation failed:");
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}

console.log("Phase 2C.7 validator scope maintenance validation passed.");
