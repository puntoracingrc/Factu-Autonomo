import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const root = path.resolve(new URL("../", import.meta.url).pathname);
const moduleDir = path.join(root, "src", "lib", "verifactu-synthetic-fixtures");
const moduleRelative = "src/lib/verifactu-synthetic-fixtures";
const scriptRelative =
  "scripts/validate-phase2b6a-synthetic-fixture-guardrails.mjs";
const docRelative = "docs/phase2b6a-synthetic-fixture-guardrails-v1.md";
const packageRelative = "package.json";
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
  const filePath = absolute(relativePath);
  return fs.existsSync(filePath) ? fs.readFileSync(filePath, "utf8") : "";
}

function listFilesRecursive(dir) {
  if (!fs.existsSync(dir)) return [];
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  return entries.flatMap((entry) => {
    const entryPath = path.join(dir, entry.name);
    if (entry.isDirectory()) return listFilesRecursive(entryPath);
    return [entryPath];
  });
}

function toRelative(filePath) {
  return path.relative(root, filePath).split(path.sep).join("/");
}

function expectFile(relativePath) {
  if (!fs.existsSync(absolute(relativePath))) {
    fail(`Missing ${relativePath}.`);
  }
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

function trackedOrWorkingChanges() {
  const files = new Set([
    ...gitLines(["diff", "--name-only"]),
    ...gitLines(["diff", "--name-only", "--cached"]),
    ...gitLines(["diff", "--name-only", "main...HEAD"]),
    ...gitLines(["diff", "--name-only", "origin/main...HEAD"]),
  ]);

  for (const line of gitLines(["status", "--short", "--untracked-files=all"])) {
    const file = line.slice(3).replace(/.* -> /, "").trim();
    if (file && !file.startsWith("docs/vida-screenshots-local/")) {
      files.add(file);
    }
  }

  return [...files].sort();
}

function forbidPattern(label, relativePath, source, pattern) {
  if (pattern.test(source)) fail(`Forbidden ${label} in ${relativePath}.`);
}

function forbidTerm(label, relativePath, source, term) {
  if (source.toLowerCase().includes(term.toLowerCase())) {
    fail(`Forbidden ${label} in ${relativePath}.`);
  }
}

expectFile(`${moduleRelative}/types.ts`);
expectFile(`${moduleRelative}/errors.ts`);
expectFile(`${moduleRelative}/fixture-policy.ts`);
expectFile(`${moduleRelative}/fixture-policy.test.ts`);
expectFile(`${moduleRelative}/index.ts`);
expectFile(scriptRelative);
expectFile(docRelative);

const packageJson = JSON.parse(read(packageRelative) || "{}");
if (
  packageJson.scripts?.["validate:phase2b6a-synthetic-fixture-guardrails"] !==
  "node scripts/validate-phase2b6a-synthetic-fixture-guardrails.mjs"
) {
  fail("Missing npm script validate:phase2b6a-synthetic-fixture-guardrails.");
}

const moduleFiles = listFilesRecursive(moduleDir).map(toRelative).sort();
const scopedFiles = [
  ...moduleFiles,
  scriptRelative,
  docRelative,
  packageRelative,
].filter((value, index, list) => list.indexOf(value) === index);
const newRouteFiles = [
  ...moduleFiles,
  scriptRelative,
  docRelative,
];

if (!moduleFiles.some((file) => file.endsWith("fixture-policy.test.ts"))) {
  fail("Missing synthetic fixture policy tests.");
}

for (const relativePath of newRouteFiles) {
  if (/\.xml$/i.test(relativePath)) fail(`Forbidden XML file ${relativePath}.`);
  if (/\.(?:pfx|p12|pem|key|crt|cer)$/i.test(relativePath)) {
    fail(`Forbidden credential-like file ${relativePath}.`);
  }
}

const sourceFiles = scopedFiles.filter((file) => /\.(?:ts|mjs)$/.test(file));
const moduleSource = moduleFiles.map(read).join("\n");

for (const relativePath of scopedFiles) {
  const source = read(relativePath);
  forbidTerm("XML declaration", relativePath, source, joinTerms("<", "?xml"));
  forbidTerm("Registro tag", relativePath, source, joinTerms("<", "Registro"));
  forbidTerm("Factura tag", relativePath, source, joinTerms("<", "Factura"));
  forbidTerm("public certificate block", relativePath, source, joinTerms("BEGIN ", "CERTIFICATE"));
  forbidTerm("private material block", relativePath, source, joinTerms("PRIVATE ", "KEY"));
  forbidTerm("service role literal", relativePath, source, joinTerms("service", "_role"));
  forbidTerm(
    "Supabase service role literal",
    relativePath,
    source,
    joinTerms("SUPABASE", "_SERVICE", "_ROLE"),
  );
  forbidTerm(
    "Stripe secret literal",
    relativePath,
    source,
    joinTerms("STRIPE", "_SECRET"),
  );
  forbidTerm(
    "transport attempts table literal",
    relativePath,
    source,
    joinTerms("fiscal", "_transport", "_attempts"),
  );
  forbidPattern(
    "transportable true",
    relativePath,
    source,
    /transportable\s*:\s*true/i,
  );
  forbidTerm(
    "productive VeriFactu claim",
    relativePath,
    source,
    joinTerms("Veri", "Factu productivo"),
  );
  forbidTerm("homologation claim", relativePath, source, joinTerms("homo", "logado"));

  if (!relativePath.startsWith("docs/")) {
    forbidTerm(
      "certificate claim",
      relativePath,
      source,
      joinTerms("cert", "ificado"),
    );
  }

  forbidPattern(
    "operational tax endpoint",
    relativePath,
    source,
    new RegExp(
      `https?:\\/\\/[^\\s"']*(?:${joinTerms("agencia", "tributaria")}|aeat\\.es)`,
      "i",
    ),
  );
}

for (const relativePath of sourceFiles) {
  const source = read(relativePath);
  forbidPattern(
    "sensitive file extension",
    relativePath,
    source,
    /(^|[^A-Za-z0-9_])\.(?:pfx|p12|pem|key|crt|cer)\b/i,
  );
}

forbidPattern(
  "UI import in synthetic fixture module",
  moduleRelative,
  moduleSource,
  /from\s+["']react["']|lucide-react|@\/components|@\/app\//i,
);
forbidPattern(
  "real Supabase client import in synthetic fixture module",
  moduleRelative,
  moduleSource,
  /@supabase\/supabase-js|createClient\s*\(/i,
);

for (const changedFile of trackedOrWorkingChanges()) {
  if (/^(?:vercel\.json|\.vercel\/)|\/vercel\.json$/i.test(changedFile)) {
    fail(`Vercel config touched: ${changedFile}.`);
  }
  if (/vida/i.test(changedFile) && !changedFile.startsWith("docs/vida-screenshots-local/")) {
    fail(`ViDA path touched: ${changedFile}.`);
  }
}

if (gitLines(["ls-files", "docs/vida-screenshots-local"]).length > 0) {
  fail("docs/vida-screenshots-local is tracked in git.");
}

for (const expected of [
  "SyntheticFixtureDescriptor",
  "SyntheticFixtureKind",
  "SyntheticFixtureValidationResult",
  "SyntheticFixturePolicyError",
  "SyntheticFixtureRiskFlag",
  "SyntheticFixtureValidationStatus",
  "validateSyntheticFixtureDescriptor",
]) {
  if (!moduleSource.includes(expected)) fail(`Missing ${expected}.`);
}

if (errors.length > 0) {
  console.error("Phase 2B.6A synthetic fixture guardrails validation failed:");
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}

console.log("Phase 2B.6A synthetic fixture guardrails validation passed.");
