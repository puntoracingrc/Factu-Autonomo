import fs from "node:fs";
import path from "node:path";

const root = path.resolve(new URL("../", import.meta.url).pathname);

const files = {
  route: "src/app/api/server-documents/ingest/route.ts",
  handler: "src/lib/server-documents/route-handler.ts",
  flag: "src/lib/server-documents/route-flag.ts",
  safeResponse: "src/lib/server-documents/safe-response.ts",
  wiring: "src/lib/server-documents/ingest-wiring.ts",
  routeTest: "src/app/api/server-documents/ingest/route.test.ts",
  docs: "docs/phase2b3g-controlled-ingest-route-local-staging-v1.md",
};

const errors = [];

function read(relativePath) {
  const absolute = path.join(root, relativePath);
  if (!fs.existsSync(absolute)) {
    errors.push(`Missing required file: ${relativePath}`);
    return "";
  }
  return fs.readFileSync(absolute, "utf8");
}

function listFiles(dir) {
  const absolute = path.join(root, dir);
  if (!fs.existsSync(absolute)) return [];
  const result = [];
  for (const entry of fs.readdirSync(absolute, { withFileTypes: true })) {
    if (entry.name === "node_modules" || entry.name === ".next") continue;
    const relative = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      result.push(...listFiles(relative));
    } else if (entry.isFile()) {
      result.push(relative);
    }
  }
  return result;
}

function assertContains(source, needle, label) {
  if (!source.includes(needle)) errors.push(`Missing ${label}: ${needle}`);
}

function assertNotContains(source, needle, label) {
  if (source.includes(needle)) errors.push(`Forbidden ${label}: ${needle}`);
}

const route = read(files.route);
const handler = read(files.handler);
const flag = read(files.flag);
const safeResponse = read(files.safeResponse);
const wiring = read(files.wiring);
const routeTest = read(files.routeTest);
const docs = read(files.docs);

assertContains(
  flag,
  'env[SERVER_DOCUMENT_INGEST_ROUTE_FLAG] === "true"',
  "strict true-only server flag",
);
assertContains(handler, '"role"', "role stripping from client body authority");
assertContains(
  handler,
  "stripClientControlledClaims(parsed.body)",
  "sanitized body passed to ingest",
);
assertContains(
  handler,
  "sanitizeServerDocumentIngestResult(result)",
  "safe response serializer usage",
);

for (const expected of [
  "createDraft valido con flag activa en test",
  "updateDraft valido con flag activa en test",
  "updateDraft sin expectedVersion con flag activa",
  "error de ingest con flag activa no filtra detalles internos",
  "queda desactivada con flag",
]) {
  assertContains(routeTest, expected, `controlled route test ${expected}`);
}

for (const value of ['"1"', '"yes"', '"TRUE"', '" True "']) {
  assertContains(routeTest, value, `non-enabling flag value ${value}`);
}

for (const sensitive of [
  '"payload"',
  '"documentSnapshot"',
  '"pdfSnapshot"',
  '"document_snapshot"',
  '"pdf_snapshot"',
  '"xml_payload"',
  '"response_body"',
]) {
  assertNotContains(
    safeResponse,
    sensitive,
    `sensitive field allow-list entry ${sensitive}`,
  );
}

for (const [label, source] of [
  [files.route, route],
  [files.handler, handler],
  [files.flag, flag],
  [files.safeResponse, safeResponse],
  [files.wiring, wiring],
]) {
  assertNotContains(source, "console.", `runtime logging in ${label}`);
  assertNotContains(
    source,
    "NEXT_PUBLIC_SERVER_DOCUMENT_INGEST_ROUTE_ENABLED",
    `public flag in ${label}`,
  );
  assertNotContains(source, "SUPABASE_SERVICE_ROLE_KEY", `service role in ${label}`);
}

for (const configFile of [
  "vercel.json",
  ".vercel/project.json",
  ".github/workflows/ci.yml",
  "next.config.js",
  "next.config.mjs",
  "next.config.ts",
  "package.json",
]) {
  const absolute = path.join(root, configFile);
  if (!fs.existsSync(absolute)) continue;
  const source = fs.readFileSync(absolute, "utf8");
  assertNotContains(
    source,
    "SERVER_DOCUMENT_INGEST_ROUTE_ENABLED",
    `active ingest route flag in config ${configFile}`,
  );
}

const forbiddenRuntimePatterns = [
  /agenciatributaria\.gob\.es/i,
  /suministro(?:lr)?facturas/i,
  /begin certificate/i,
  /begin private key/i,
  /cert_pem/i,
  /private_key/i,
  /pkcs12/i,
  /pfx/i,
  /\bfiscal_records\b/i,
  /\bfiscal_chain_state\b/i,
];

for (const pattern of forbiddenRuntimePatterns) {
  for (const [label, source] of [
    [files.route, route],
    [files.handler, handler],
    [files.flag, flag],
    [files.safeResponse, safeResponse],
    [files.wiring, wiring],
  ]) {
    if (pattern.test(source)) {
      errors.push(`Forbidden runtime route pattern ${pattern} in ${label}.`);
    }
  }
}

const clientDirectiveRegex = /^\s*["']use client["'];?/m;
const clientFiles = listFiles("src").filter((file) => {
  if (file.endsWith(".test.ts") || file.endsWith(".test.tsx")) return false;
  const source = fs.readFileSync(path.join(root, file), "utf8");
  return clientDirectiveRegex.test(source);
});

for (const file of clientFiles) {
  const source = fs.readFileSync(path.join(root, file), "utf8");
  assertNotContains(
    source,
    "SUPABASE_SERVICE_ROLE_KEY",
    `service role in client file ${file}`,
  );
  assertNotContains(
    source,
    "SERVER_DOCUMENT_INGEST_ROUTE_ENABLED",
    `private ingest route flag in client file ${file}`,
  );
}

for (const expectedDocText of [
  "Supabase local/staging queda pendiente",
  "Rate limiting",
  "Auditoria",
  "No se activo produccion",
  "No hay AEAT real",
  "No hay certificados reales",
  "No hay VeriFactu funcional",
]) {
  assertContains(docs, expectedDocText, `documentation note ${expectedDocText}`);
}

if (errors.length > 0) {
  console.error("Phase 2B.3G controlled ingest route validation failed:");
  for (const error of errors) {
    console.error(`- ${error}`);
  }
  process.exit(1);
}

console.log("Phase 2B.3G controlled ingest route validation passed.");
