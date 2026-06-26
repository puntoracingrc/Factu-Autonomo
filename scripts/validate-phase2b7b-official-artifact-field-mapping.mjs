import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const root = path.resolve(new URL("../", import.meta.url).pathname);
const errors = [];

function joinTerms(...parts) {
  return parts.join("");
}

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

function expectFile(relativePath) {
  if (!fs.existsSync(absolute(relativePath))) fail(`Missing ${relativePath}.`);
}

function gitLines(args) {
  try {
    return execFileSync("git", args, {
      cwd: root,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
    })
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean);
  } catch {
    return [];
  }
}

for (const file of [
  "src/lib/verifactu-official-alignment/types.ts",
  "src/lib/verifactu-official-alignment/errors.ts",
  "src/lib/verifactu-official-alignment/artifact-manifest.ts",
  "src/lib/verifactu-official-alignment/field-map.ts",
  "src/lib/verifactu-official-alignment/map-candidate-record.ts",
  "docs/phase2b7b-official-artifact-field-mapping-v1.md",
]) {
  expectFile(file);
}

const packageJson = JSON.parse(read("package.json") || "{}");
if (
  packageJson.scripts?.["validate:phase2b7b-official-artifact-field-mapping"] !==
  "node scripts/validate-phase2b7b-official-artifact-field-mapping.mjs"
) {
  fail("Missing npm script validate:phase2b7b-official-artifact-field-mapping.");
}

const manifestSource = read("src/lib/verifactu-official-alignment/artifact-manifest.ts");
for (const marker of [
  "AEAT_VERIFACTU_RECORD_DESIGN_XLSX_V1_0",
  "AEAT_VERIFACTU_SUMINISTRO_LR_XSD_TIKE_V1_0",
  "AEAT_VERIFACTU_SUMINISTRO_INFORMACION_XSD_TIKE_V1_0",
  "AEAT_VERIFACTU_HASH_SPEC_PDF_V0_1_2",
  "AEAT_VERIFACTU_VALIDATIONS_ERRORS_PDF_V1_2_2",
  "AEAT_VERIFACTU_SERVICE_SPEC_PDF_V1_0_3",
  "BLOCKED_NO_SAFE_OFFLINE_XSD_VALIDATOR",
]) {
  if (!manifestSource.includes(marker)) fail(`Missing manifest marker ${marker}.`);
}

const fieldMapSource = read("src/lib/verifactu-official-alignment/field-map.ts");
for (const marker of [
  "RegistroAlta/IDFactura/IDEmisorFactura",
  "RegistroAlta/IDFactura/NumSerieFactura",
  "RegistroAnulacion/IDFactura/IDEmisorFacturaAnulada",
  "mappingStatus: \"blocked\"",
  "mappingStatus: \"pending\"",
]) {
  if (!fieldMapSource.includes(marker)) fail(`Missing field mapping marker ${marker}.`);
}

for (const changedPath of [
  ...gitLines(["diff", "--name-only"]),
  ...gitLines(["diff", "--name-only", "--cached"]),
  ...gitLines(["diff", "--name-only", "main...HEAD"]),
  ...gitLines(["diff", "--name-only", "origin/main...HEAD"]),
]) {
  if (/^test\/fixtures\/verifactu-official-artifacts\/.*\.(?:pdf|xlsx)$/i.test(changedPath)) {
    fail(`Forbidden committed official document fixture ${changedPath}.`);
  }
  if (/^supabase\//.test(changedPath)) fail(`Supabase path touched: ${changedPath}.`);
  if (/vida/i.test(changedPath) && !changedPath.startsWith("docs/vida-screenshots-local/")) {
    fail(`ViDA path touched: ${changedPath}.`);
  }
  if (/^(?:vercel\.json|\.vercel\/)|\/vercel\.json$/i.test(changedPath)) {
    fail(`Vercel config touched: ${changedPath}.`);
  }
}

for (const relativePath of fs
  .readdirSync(absolute("src/lib/verifactu-official-alignment"))
  .filter((file) => file.endsWith(".ts"))
  .map((file) => `src/lib/verifactu-official-alignment/${file}`)) {
  const source = read(relativePath);
  for (const [label, term] of [
    ["Supabase import", "@supabase"],
    ["network call", joinTerms("fetch", "(")],
    ["filesystem import", "node:fs"],
    ["transport attempts table", joinTerms("fiscal", "_transport", "_attempts")],
  ]) {
    if (source.toLowerCase().includes(term.toLowerCase())) {
      fail(`Forbidden ${label} in ${relativePath}.`);
    }
  }
}

try {
  execFileSync("npx", ["vitest", "run", "src/lib/verifactu-official-alignment"], {
    cwd: root,
    encoding: "utf8",
    stdio: "pipe",
  });
} catch (error) {
  fail(`2B.7B official alignment tests failed: ${error.message}`);
}

if (errors.length > 0) {
  console.error("Phase 2B.7B official artifact field mapping validation failed:");
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}

console.log("Phase 2B.7B official artifact field mapping validation passed.");
