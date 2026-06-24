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

function assertBefore(source, before, after, label) {
  const beforeIndex = source.indexOf(before);
  const afterIndex = source.indexOf(after);
  if (beforeIndex === -1) {
    errors.push(`Missing ordering anchor for ${label}: ${before}`);
    return;
  }
  if (afterIndex === -1) {
    errors.push(`Missing ordering target for ${label}: ${after}`);
    return;
  }
  if (beforeIndex > afterIndex) {
    errors.push(`Expected ${before} before ${after} (${label}).`);
  }
}

const route = read(files.route);
const handler = read(files.handler);
const flag = read(files.flag);
const safeResponse = read(files.safeResponse);
const wiring = read(files.wiring);
const routeTest = read(files.routeTest);

assertContains(
  flag,
  '"SERVER_DOCUMENT_INGEST_ROUTE_ENABLED"',
  "private ingest route flag",
);
assertContains(
  flag,
  'env[SERVER_DOCUMENT_INGEST_ROUTE_FLAG] === "true"',
  "strict true-only flag check",
);
assertNotContains(
  flag,
  "NEXT_PUBLIC_SERVER_DOCUMENT_INGEST_ROUTE_ENABLED",
  "public ingest route flag",
);

assertContains(route, "export async function POST", "POST route export");
assertContains(route, "handleServerDocumentIngestRoute", "server route handler");
assertNotContains(route, "use client", "client route directive");
assertNotContains(route, "SUPABASE_SERVICE_ROLE_KEY", "service role in route");

assertBefore(
  handler,
  "if (!isEnabled())",
  "const parsed = await parseJsonBody(request);",
  "flag before JSON parsing",
);
assertBefore(
  handler,
  "if (!isEnabled())",
  "const authenticate = dependencies.authenticate ?? getUserFromBearer;",
  "flag before auth",
);
assertBefore(
  handler,
  "if (!isEnabled())",
  "const getSupabaseClient",
  "flag before Supabase client",
);
assertBefore(
  handler,
  "if (!isEnabled())",
  "const handleIngest",
  "flag before ingest service",
);
assertContains(handler, "{ status: 404 }", "disabled route 404 response");
assertContains(
  handler,
  "stripClientControlledClaims(parsed.body)",
  "body authority stripping before ingest",
);

for (const key of [
  '"authenticatedUserId"',
  '"entitlement"',
  '"entitlements"',
  '"plan"',
  '"status"',
  '"user_id"',
  '"userId"',
]) {
  assertContains(handler, key, `client-controlled key stripping ${key}`);
}

for (const sensitive of [
  "payload",
  "documentSnapshot",
  "pdfSnapshot",
  "document_snapshot",
  "pdf_snapshot",
  "xml_payload",
  "response_body",
]) {
  assertNotContains(
    handler,
    `"${sensitive}"`,
    `raw sensitive response field in route handler`,
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

for (const forbidden of [
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
]) {
  for (const [label, source] of [
    [files.route, route],
    [files.handler, handler],
    [files.flag, flag],
    [files.safeResponse, safeResponse],
    [files.wiring, wiring],
  ]) {
    if (forbidden.test(source)) {
      errors.push(`Forbidden runtime route pattern ${forbidden} in ${label}.`);
    }
  }
}

for (const [label, source] of [
  [files.route, route],
  [files.handler, handler],
  [files.flag, flag],
  [files.safeResponse, safeResponse],
  [files.wiring, wiring],
]) {
  assertNotContains(
    source,
    "NEXT_PUBLIC_SERVER_DOCUMENT_INGEST_ROUTE_ENABLED",
    `public flag in ${label}`,
  );
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
  "queda desactivada si el flag no existe",
  "queda desactivada con flag",
  "solo se activa explicitamente con flag true",
  "si esta desactivada no autentica",
  "no inicializa Supabase",
  "no llama al ingest",
  "metodo no permitido activo devuelve error seguro",
  "content-type invalido devuelve error seguro",
  "rechaza JSON invalido",
  "ignora autoridad enviada en el body",
  "no devuelve payload ni snapshots",
  "no filtra errores internos",
  "no son cliente ni exponen variables privadas",
]) {
  assertContains(routeTest, expected, `route safety test ${expected}`);
}

if (errors.length > 0) {
  console.error("Phase 2B.3E ingest route safety validation failed:");
  for (const error of errors) {
    console.error(`- ${error}`);
  }
  process.exit(1);
}

console.log("Phase 2B.3E ingest route safety validation passed.");
