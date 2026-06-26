import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const root = path.resolve(new URL("../", import.meta.url).pathname);
const errors = [];
const requiredFiles = [
  "src/lib/verifactu-candidate-pipeline/validate-xml-candidate.ts",
  "src/lib/verifactu-candidate-pipeline/validate-xml-candidate.test.ts",
  "src/lib/verifactu-candidate-pipeline/pipeline.ts",
  "src/lib/verifactu-candidate-pipeline/pipeline.test.ts",
  "docs/phase2b6g-local-synthetic-xml-candidate-validation-v1.md",
];

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
  const filePath = absolute(relativePath);
  return fs.existsSync(filePath) ? fs.readFileSync(filePath, "utf8") : "";
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

function listModuleFiles() {
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

for (const file of requiredFiles) expectFile(file);

const packageJson = JSON.parse(read("package.json") || "{}");
if (
  packageJson.scripts?.["validate:phase2b6g-local-xml-candidate-validation"] !==
  "node scripts/validate-phase2b6g-local-xml-candidate-validation.mjs"
) {
  fail("Missing npm script validate:phase2b6g-local-xml-candidate-validation.");
}

const validationSource = read("src/lib/verifactu-candidate-pipeline/validate-xml-candidate.ts");
const pipelineSource = [
  read("src/lib/verifactu-candidate-pipeline/types.ts"),
  read("src/lib/verifactu-candidate-pipeline/pipeline.ts"),
].join("\n");
for (const marker of [
  "validateSyntheticXmlCandidate",
  "digest_mismatch",
  "candidate_hash_mismatch",
  "previous_hash_mismatch",
  "blocked_material_detected",
]) {
  if (!validationSource.includes(marker)) fail(`Missing validation marker ${marker}.`);
}
for (const marker of [
  "runSyntheticCandidateXmlPipeline",
  "accepted_candidate",
  "rejected_candidate",
  "buildSyntheticXmlCandidateArtifact",
]) {
  if (!pipelineSource.includes(marker)) fail(`Missing pipeline marker ${marker}.`);
}

for (const relativePath of listModuleFiles()) {
  if (/\.xml$/i.test(relativePath)) fail(`Forbidden XML file ${relativePath}.`);
  const source = read(relativePath);
  for (const [label, term] of [
    ["XML declaration", joinTerms("<", "?xml")],
    ["Registro tag", joinTerms("<", "Registro")],
    ["Factura tag", joinTerms("<", "Factura")],
    ["public identity block", joinTerms("BEGIN ", "CERTIFICATE")],
    ["private identity block", joinTerms("PRIVATE ", "KEY")],
    ["tax agency host", joinTerms("sede.", "aeat")],
    ["tax agency host", joinTerms("www1.", "aeat")],
    ["tax agency host", joinTerms("www2.", "aeat")],
    ["transport attempts table literal", joinTerms("fiscal", "_transport", "_attempts")],
    ["Supabase import", "@supabase"],
    ["filesystem import", "node:fs"],
    ["http import", "node:http"],
    ["https import", "node:https"],
    ["network call", "fetch("],
    ["file write", "writeFile"],
    ["file append", "appendFile"],
    ["file stream", "createWriteStream"],
  ]) {
    forbidTerm(label, relativePath, source, term);
  }
  if (/transportable\s*:\s*true/i.test(source) || /transportable="true"/i.test(source)) {
    fail(`Forbidden transportable true in ${relativePath}.`);
  }
  if (/console\.log\s*\(/.test(source)) {
    fail(`Forbidden console.log in ${relativePath}.`);
  }
}

for (const changedPath of changedFiles()) {
  if (/^supabase\//.test(changedPath)) fail(`Supabase path touched: ${changedPath}.`);
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
  execFileSync("npx", ["vitest", "run", "src/lib/verifactu-candidate-pipeline/validate-xml-candidate.test.ts", "src/lib/verifactu-candidate-pipeline/pipeline.test.ts"], {
    cwd: root,
    encoding: "utf8",
    stdio: "pipe",
  });
} catch (error) {
  fail(`Local XML candidate validation tests failed: ${error.message}`);
}

if (errors.length > 0) {
  console.error("Phase 2B.6G local XML candidate validation failed:");
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}

console.log("Phase 2B.6G local XML candidate validation passed.");
