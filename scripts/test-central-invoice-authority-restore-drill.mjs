import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { createHash, randomUUID } from "node:crypto";
import {
  mkdtempSync,
  readFileSync,
  rmSync,
  statSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const databaseUrl = process.env.CENTRAL_INVOICE_AUTHORITY_TEST_DATABASE_URL;
const allowRemote =
  process.env.CENTRAL_INVOICE_AUTHORITY_ALLOW_REMOTE_TEST === "true";

assert.ok(
  databaseUrl,
  "Set CENTRAL_INVOICE_AUTHORITY_TEST_DATABASE_URL to an isolated PostgreSQL database.",
);

const parsedUrl = new URL(databaseUrl);
assert.ok(
  allowRemote || ["127.0.0.1", "localhost", "::1"].includes(parsedUrl.hostname),
  "Remote restore drills are blocked unless CENTRAL_INVOICE_AUTHORITY_ALLOW_REMOTE_TEST=true.",
);

const suffix = randomUUID().replaceAll("-", "").slice(0, 12);
const sourceDatabase = `authority_restore_source_${suffix}`;
const targetDatabase = `authority_restore_target_${suffix}`;
const temporaryDirectory = mkdtempSync(
  join(tmpdir(), "factu-central-authority-restore-"),
);
const dumpPath = join(temporaryDirectory, "central-authority.dump");
const migrations = [
  "20260727175229_central_invoice_authority_ledger_schema.sql",
  "20260727181804_central_invoice_authority_issue_rpc.sql",
  "20260727190823_central_invoice_authority_materialized_snapshot.sql",
  "20260727193609_central_invoice_authority_outbox_pull.sql",
  "20260728100752_central_invoice_authority_realtime_wakeups.sql",
  "20260728164325_central_invoice_authority_tenant_guard.sql",
  "20260728172000_central_invoice_authority_indexes.sql",
];

function databaseUrlFor(name) {
  const url = new URL(databaseUrl);
  url.pathname = `/${name}`;
  return url.toString();
}

const adminUrl = databaseUrlFor("postgres");
const sourceUrl = databaseUrlFor(sourceDatabase);
const targetUrl = databaseUrlFor(targetDatabase);

function run(command, args, options = {}) {
  return execFileSync(command, args, {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
    ...options,
  }).trim();
}

function psql(url, args) {
  return run("psql", [url, "-X", "-v", "ON_ERROR_STOP=1", ...args]);
}

function safeCounts(url) {
  return JSON.parse(
    psql(url, [
      "-At",
      "-c",
      `
        select jsonb_build_object(
          'documents', (select count(*) from public.central_invoice_documents),
          'identities', (select count(*) from public.central_invoice_identities),
          'commands', (select count(*) from public.central_invoice_commands),
          'outbox', (select count(*) from public.central_invoice_outbox),
          'wakeups', (select count(*) from public.central_invoice_event_wakeups)
        )::text;
      `,
    ]),
  );
}

function identityDigest(url) {
  return psql(url, [
    "-At",
    "-c",
    `
      select md5(
        coalesce(
          string_agg(
            id::text || ':' || full_number || ':' || sequence::text,
            ','
            order by id
          ),
          ''
        )
      )
      from public.central_invoice_identities;
    `,
  ]);
}

function dropDatabase(name) {
  run("dropdb", [
    "--if-exists",
    "--force",
    `--maintenance-db=${adminUrl}`,
    name,
  ]);
}

try {
  run("createdb", [`--maintenance-db=${adminUrl}`, sourceDatabase]);
  psql(sourceUrl, [
    "-c",
    `
      create schema if not exists auth;
      create schema if not exists extensions;
      create extension if not exists pgcrypto with schema extensions;
      create or replace function auth.role()
      returns text
      language sql
      stable
      as $$
        select coalesce(current_setting('request.jwt.claim.role', true), '')
      $$;
      create or replace function auth.uid()
      returns uuid
      language sql
      stable
      as $$
        select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid
      $$;
    `,
  ]);

  for (const migration of migrations) {
    psql(sourceUrl, ["-f", `supabase/migrations/${migration}`]);
  }

  run(
    process.execPath,
    ["scripts/test-central-invoice-authority-postgres.mjs"],
    {
      env: {
        ...process.env,
        CENTRAL_INVOICE_AUTHORITY_TEST_DATABASE_URL: sourceUrl,
      },
    },
  );

  run("pg_dump", [
    sourceUrl,
    "--format=custom",
    "--no-owner",
    `--file=${dumpPath}`,
  ]);

  run("createdb", [`--maintenance-db=${adminUrl}`, targetDatabase]);
  run("pg_restore", [
    `--dbname=${targetUrl}`,
    "--no-owner",
    "--exit-on-error",
    dumpPath,
  ]);

  const sourceCounts = safeCounts(sourceUrl);
  const targetCounts = safeCounts(targetUrl);
  assert.deepEqual(targetCounts, sourceCounts);
  assert.equal(identityDigest(targetUrl), identityDigest(sourceUrl));

  run(
    process.execPath,
    ["scripts/test-central-invoice-authority-postgres.mjs"],
    {
      env: {
        ...process.env,
        CENTRAL_INVOICE_AUTHORITY_TEST_DATABASE_URL: targetUrl,
      },
    },
  );

  const dumpBytes = statSync(dumpPath).size;
  const dumpDigest = createHash("sha256")
    .update(readFileSync(dumpPath))
    .digest("hex")
    .slice(0, 16);

  console.log(
    `central invoice authority isolated restore drill: OK; source counts=${JSON.stringify(
      sourceCounts,
    )}; dump bytes=${dumpBytes}; digest=${dumpDigest}`,
  );
} finally {
  dropDatabase(sourceDatabase);
  dropDatabase(targetDatabase);
  rmSync(temporaryDirectory, { recursive: true, force: true });
}
