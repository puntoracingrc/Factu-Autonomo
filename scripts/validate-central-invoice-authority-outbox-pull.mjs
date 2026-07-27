import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";

function read(path) {
  return readFileSync(path, "utf8");
}

function runBin(bin, args) {
  execFileSync(bin, args, {
    encoding: "utf8",
    stdio: "pipe",
  });
}

const marker = "CENTRAL_INVOICE_AUTHORITY_OUTBOX_PULL_V1";
const migrationPath =
  "supabase/migrations/20260727193609_central_invoice_authority_outbox_pull.sql";
const migration = read(migrationPath);
const adapter = read("src/lib/central-invoice-authority/events-rpc-adapter.ts");
const routeHandler = read(
  "src/lib/central-invoice-authority/events-route-handler.ts",
);
const route = read("src/app/api/central-invoice-authority/events/route.ts");
const doc = read("docs/architecture/central-invoice-authority-outbox-pull-v1.md");
const packageJson = JSON.parse(read("package.json"));
const body = `${migration}\n${adapter}\n${routeHandler}\n${route}\n${doc}`;

for (const required of [
  marker,
  "CENTRAL_INVOICE_AUTHORITY_EVENTS_RPC_ADAPTER_V1",
  "CENTRAL_INVOICE_AUTHORITY_EVENTS_ROUTE_V1",
  "create or replace function public.list_central_invoice_events_v1",
  "security definer",
  "set search_path = ''",
  "auth.role() <> 'service_role'",
  "central_invoice_outbox",
  "central_invoice_documents",
  "central_invoice_identities",
  "revoke all on function public.list_central_invoice_events_v1",
  "from public, anon, authenticated",
  "grant execute on function public.list_central_invoice_events_v1",
  "to service_role",
  "listCentralInvoiceAuthorityEventsThroughRpc",
  "createCentralInvoiceAuthorityEventsRouteHandler",
  "ensureCloudDeviceAccess",
  "hashCloudDeviceToken",
  "checkRateLimit",
  "nextCursor",
]) {
  assert.match(
    body,
    new RegExp(required.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i"),
  );
}

for (const forbidden of [
  /\bgrant\s+execute\s+on\s+function\s+public\.list_central_invoice_events_v1[\s\S]*\bto\s+(?:anon|authenticated)\b/i,
  /\bgrant\s+.+\bto\s+(?:anon|authenticated)\b/i,
  /\bdrop\s+table\b/i,
  /\btruncate\b/i,
  /\bdelete\s+from\b/i,
  /\bupdate\s+public\.(?!central_invoice_)/i,
  /\binsert\s+into\s+public\.(?!central_invoice_)/i,
  /\bemitted_snapshot\b/i,
  /\buser_backups\b/i,
  /\bsync_entities\b/i,
]) {
  assert.doesNotMatch(migration, forbidden, `Forbidden outbox pull SQL: ${forbidden}`);
}

for (const forbidden of [
  /getSupabaseAdmin\(/,
  /SUPABASE_SERVICE_ROLE_KEY/,
  /NEXT_PUBLIC_SUPABASE_URL/,
  /localStorage/,
  /window\./,
]) {
  assert.doesNotMatch(adapter, forbidden, `Forbidden events adapter coupling: ${forbidden}`);
}

assert.doesNotMatch(routeHandler, /readBody/i);
assert.match(route, /export\s+async\s+function\s+GET\b/);
assert.match(route, /export\s+async\s+function\s+OPTIONS\b/);
assert.match(route, /export\s+async\s+function\s+POST\b/);
assert.doesNotMatch(route, /readJsonBody|readTextBody/);

assert.equal(
  packageJson.scripts["validate:central-invoice-authority-outbox-pull"],
  "node scripts/validate-central-invoice-authority-outbox-pull.mjs",
);
assert.match(
  packageJson.scripts["check:authority-central-release-gate"],
  /validate:central-invoice-authority-outbox-pull/,
);

runBin("npx", [
  "vitest",
  "run",
  "src/lib/central-invoice-authority/events-rpc-adapter.test.ts",
  "src/lib/central-invoice-authority/events-route-handler.test.ts",
]);

console.log("central invoice authority outbox pull: OK");
