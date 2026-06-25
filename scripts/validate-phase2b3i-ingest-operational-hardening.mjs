import fs from "node:fs";
import path from "node:path";

const root = path.resolve(new URL("../", import.meta.url).pathname);

const files = {
  route: "src/app/api/server-documents/ingest/route.ts",
  handler: "src/lib/server-documents/route-handler.ts",
  operational: "src/lib/server-documents/operational-hardening.ts",
  safeResponse: "src/lib/server-documents/safe-response.ts",
  routeTest: "src/app/api/server-documents/ingest/route.test.ts",
  localAcceptance:
    "src/app/api/server-documents/ingest/route.local-acceptance.test.ts",
  docs: "docs/phase2b3i-ingest-route-operational-hardening-v1.md",
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
const operational = read(files.operational);
const safeResponse = read(files.safeResponse);
const routeTest = read(files.routeTest);
const localAcceptance = read(files.localAcceptance);
const docs = read(files.docs);

for (const expected of [
  "resolveServerDocumentRequestId",
  "createMemoryServerDocumentIngestRateLimiter",
  "MemoryServerDocumentIngestAuditRecorder",
  "buildServerDocumentRateLimitKey",
]) {
  assertContains(operational, expected, `operational helper ${expected}`);
}

for (const expected of [
  "x-request-id",
  "rateLimiter.check",
  "auditRecorder.record",
  "rate_limited",
]) {
  assertContains(handler, expected, `route hardening ${expected}`);
}

for (const forbidden of [
  "payload:",
  "documentSnapshot",
  "pdfSnapshot",
  "xml_payload",
  "response_body",
  "authorization",
  "token",
  "SUPABASE_SERVICE_ROLE_KEY",
]) {
  assertNotContains(
    operational,
    forbidden,
    `sensitive audit/rate-limit field ${forbidden}`,
  );
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
  [files.operational, operational],
]) {
  assertNotContains(source, "console.", `runtime logging in ${label}`);
  assertNotContains(
    source,
    "NEXT_PUBLIC_SERVER_DOCUMENT_INGEST_ROUTE_ENABLED",
    `public flag in ${label}`,
  );
  assertNotContains(source, "SUPABASE_SERVICE_ROLE_KEY", `service role in ${label}`);
  for (const forbidden of [
    /\bfiscal_records\b/i,
    /\bfiscal_chain_state\b/i,
    /\bfiscal_transport_attempts\b/i,
    /agenciatributaria\.gob\.es/i,
    /suministro(?:lr)?facturas/i,
    /begin certificate/i,
    /begin private key/i,
    /cert_pem/i,
    /private_key/i,
    /pkcs12/i,
    /pfx/i,
  ]) {
    if (forbidden.test(source)) {
      errors.push(`Forbidden runtime pattern ${forbidden} in ${label}.`);
    }
  }
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

for (const expected of [
  "genera requestId seguro",
  "rate limiting permite",
  "auditoria rejected, conflict y unauthorized",
  "allows only one concurrent update",
]) {
  const source = expected === "allows only one concurrent update"
    ? localAcceptance
    : routeTest;
  assertContains(source, expected, `test coverage ${expected}`);
}

for (const expectedDocText of [
  "Rate limiting",
  "Auditoria tecnica segura",
  "Request ID",
  "Concurrencia local",
  "No se activo produccion",
  "No hay AEAT real",
  "No hay certificados reales",
  "No hay VeriFactu funcional",
]) {
  assertContains(docs, expectedDocText, `documentation note ${expectedDocText}`);
}

if (errors.length > 0) {
  console.error("Phase 2B.3I ingest operational hardening validation failed:");
  for (const error of errors) {
    console.error(`- ${error}`);
  }
  process.exit(1);
}

console.log("Phase 2B.3I ingest operational hardening validation passed.");
