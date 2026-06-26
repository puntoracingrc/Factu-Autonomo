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

function changedFiles() {
  const files = new Set([
    ...gitLines(["diff", "--name-only"]),
    ...gitLines(["diff", "--name-only", "--cached"]),
    ...gitLines(["diff", "--name-only", "main...HEAD"]),
    ...gitLines(["diff", "--name-only", "origin/main...HEAD"]),
  ]);
  for (const line of gitLines(["status", "--short", "--untracked-files=all"])) {
    const file = line.slice(3).replace(/.* -> /, "").trim();
    if (file && !file.startsWith("docs/vida-screenshots-local/")) files.add(file);
  }
  return [...files].sort();
}

function listCandidateFiles() {
  return fs
    .readdirSync(absolute("src/lib/verifactu-candidate-pipeline"))
    .filter((file) => file.endsWith(".ts"))
    .map((file) => `src/lib/verifactu-candidate-pipeline/${file}`);
}

function forbidTerm(label, relativePath, source, term) {
  if (source.toLowerCase().includes(term.toLowerCase())) {
    fail(`Forbidden ${label} in ${relativePath}.`);
  }
}

expectFile("src/lib/verifactu-candidate-pipeline/hardening.test.ts");
expectFile("docs/phase2b7a-synthetic-pipeline-technical-review-v1.md");

const packageJson = JSON.parse(read("package.json") || "{}");
if (
  packageJson.scripts?.["validate:phase2b7a-synthetic-pipeline-technical-review"] !==
  "node scripts/validate-phase2b7a-synthetic-pipeline-technical-review.mjs"
) {
  fail("Missing npm script validate:phase2b7a-synthetic-pipeline-technical-review.");
}

const hardening = read("src/lib/verifactu-candidate-pipeline/hardening.test.ts");
for (const marker of [
  "determinismo independiente de locale",
  "determinismo independiente de timezone",
  "saltos de linea internos",
  "caracteres de control XML",
  "no copia campos inesperados",
  "mutacion de la entrada original",
  "inspeccion Node",
  "no devuelve rutas ni marcadores de disco",
  "mantiene los cuatro positivos aceptados",
  "mantiene los cuatro negativos rechazados",
]) {
  if (!hardening.includes(marker)) fail(`Missing hardening marker ${marker}.`);
}

for (const relativePath of listCandidateFiles()) {
  const source = read(relativePath);
  for (const [label, term] of [
    ["Supabase import", "@supabase"],
    ["filesystem import", "node:fs"],
    ["http import", "node:http"],
    ["https import", "node:https"],
    ["network call", joinTerms("fetch", "(")],
    ["file write", "writeFile"],
    ["file append", "appendFile"],
    ["file stream", "createWriteStream"],
    ["transport attempts table", joinTerms("fiscal", "_transport", "_attempts")],
  ]) {
    forbidTerm(label, relativePath, source, term);
  }
  if (/console\.log\s*\(/.test(source)) fail(`Forbidden console.log in ${relativePath}.`);
  if (/transportable\s*:\s*true/i.test(source)) fail(`Forbidden transportable true in ${relativePath}.`);
}

for (const changedPath of changedFiles()) {
  const isPhase2C20LocalSyncSchemaPath =
    /^supabase\/migrations\/\d{14}_phase2c20_document_sync_local_schema\.sql$/.test(changedPath) ||
    /^supabase\/rollbacks\/\d{14}_phase2c20_document_sync_local_schema\.down\.sql$/.test(changedPath);
  if (!isPhase2C20LocalSyncSchemaPath && /^supabase\//.test(changedPath)) {
    fail(`Supabase path touched: ${changedPath}.`);
  }
  if (/^(?:vercel\.json|\.vercel\/)|\/vercel\.json$/i.test(changedPath)) {
    fail(`Vercel config touched: ${changedPath}.`);
  }
  if (/vida/i.test(changedPath) && !changedPath.startsWith("docs/vida-screenshots-local/")) {
    fail(`ViDA path touched: ${changedPath}.`);
  }
  if (/\.xml$/i.test(changedPath)) fail(`XML file touched: ${changedPath}.`);
}

if (gitLines(["ls-files", "docs/vida-screenshots-local"]).length > 0) {
  fail("docs/vida-screenshots-local is tracked in git.");
}

try {
  execFileSync("npx", ["vitest", "run", "src/lib/verifactu-candidate-pipeline/hardening.test.ts"], {
    cwd: root,
    encoding: "utf8",
    stdio: "pipe",
  });
} catch (error) {
  fail(`2B.7A hardening tests failed: ${error.message}`);
}

if (errors.length > 0) {
  console.error("Phase 2B.7A synthetic pipeline technical review validation failed:");
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}

console.log("Phase 2B.7A synthetic pipeline technical review validation passed.");
