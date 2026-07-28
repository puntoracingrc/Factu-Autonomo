import assert from "node:assert/strict";
import { execFile, execFileSync } from "node:child_process";
import { randomUUID } from "node:crypto";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);
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
  "Remote database tests are blocked unless CENTRAL_INVOICE_AUTHORITY_ALLOW_REMOTE_TEST=true.",
);

function sqlLiteral(value) {
  return `'${String(value).replaceAll("'", "''")}'`;
}

function runSql(sql) {
  return execFileSync(
    "psql",
    [databaseUrl, "-X", "-v", "ON_ERROR_STOP=1", "-At", "-c", sql],
    { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] },
  ).trim();
}

async function runSqlAsync(sql) {
  const { stdout } = await execFileAsync(
    "psql",
    [databaseUrl, "-X", "-v", "ON_ERROR_STOP=1", "-At", "-c", sql],
    { encoding: "utf8" },
  );
  return stdout.trim();
}

function issueSql({
  userId,
  localId,
  idempotencyKey,
  requestHash,
  kind = "invoice",
  issuerNif,
  seriesCode,
  rectifiesIdentityId = null,
}) {
  const rectified = rectifiesIdentityId
    ? `${sqlLiteral(rectifiesIdentityId)}::uuid`
    : "null";
  const payload =
    '{"number":"__CENTRAL_AUTHORITY_FULL_NUMBER__","fixture":"synthetic"}';

  return `
    select set_config('request.jwt.claim.role', 'service_role', false);
    select
      result_status,
      identity_id,
      full_number,
      sequence,
      document_version
    from public.issue_central_invoice_v1(
      ${sqlLiteral(userId)}::uuid,
      'postgres-test-device',
      'postgres-test-session',
      ${sqlLiteral(idempotencyKey)},
      ${sqlLiteral(requestHash)},
      ${sqlLiteral(kind)},
      ${sqlLiteral(localId)},
      0,
      ${sqlLiteral(`draft-${localId}`)},
      'test',
      ${sqlLiteral(issuerNif)},
      ${sqlLiteral(seriesCode)},
      2026,
      '2026-07-28T00:00:00Z'::timestamptz,
      ${sqlLiteral(payload)}::jsonb,
      ${sqlLiteral(payload)}::jsonb,
      'client-provisional-hash',
      ${rectified}
    );
  `;
}

function resultRow(output) {
  const line = output.split("\n").at(-1);
  const [status, identityId, fullNumber, sequence, version] = line.split("|");
  return {
    status,
    identityId,
    fullNumber,
    sequence: Number(sequence),
    version: Number(version),
  };
}

const scope = randomUUID().replaceAll("-", "").slice(0, 10).toUpperCase();
const ownerA = randomUUID();
const ownerB = randomUUID();
const invoiceSeries = `T${scope}`;
const rectificationSeries = `R${scope}`;

const commandA = {
  userId: ownerA,
  localId: `concurrency-a-${scope}`,
  idempotencyKey: `idem-a-${scope}`,
  requestHash: `request-a-${scope}`,
  issuerNif: "B12345678",
  seriesCode: invoiceSeries,
};
const commandB = {
  userId: ownerA,
  localId: `concurrency-b-${scope}`,
  idempotencyKey: `idem-b-${scope}`,
  requestHash: `request-b-${scope}`,
  issuerNif: "B12345678",
  seriesCode: invoiceSeries,
};

const [first, second] = await Promise.all([
  runSqlAsync(issueSql(commandA)).then(resultRow),
  runSqlAsync(issueSql(commandB)).then(resultRow),
]);

assert.deepEqual(
  [first.sequence, second.sequence].sort((a, b) => a - b),
  [1, 2],
);
assert.notEqual(first.fullNumber, second.fullNumber);
assert.equal(first.status, "committed");
assert.equal(second.status, "committed");

const replay = resultRow(runSql(issueSql(commandA)));
assert.equal(replay.status, "replayed");
assert.equal(replay.identityId, first.identityId);
assert.equal(replay.fullNumber, first.fullNumber);

const foreignInvoice = resultRow(
  runSql(
    issueSql({
      userId: ownerB,
      localId: `foreign-${scope}`,
      idempotencyKey: `idem-foreign-${scope}`,
      requestHash: `request-foreign-${scope}`,
      issuerNif: "C12345678",
      seriesCode: invoiceSeries,
    }),
  ),
);

assert.throws(
  () =>
    runSql(
      issueSql({
        userId: ownerA,
        localId: `cross-tenant-${scope}`,
        idempotencyKey: `idem-cross-${scope}`,
        requestHash: `request-cross-${scope}`,
        kind: "rectification",
        issuerNif: "B12345678",
        seriesCode: rectificationSeries,
        rectifiesIdentityId: foreignInvoice.identityId,
      }),
    ),
  /central rectified identity scope mismatch/i,
);

assert.throws(
  () =>
    runSql(`
      set role anon;
      select public.list_central_invoice_events_v1(
        ${sqlLiteral(ownerA)}::uuid,
        'postgres-test-device',
        null,
        null,
        1
      );
    `),
  /permission denied for function list_central_invoice_events_v1/i,
);

console.log(
  "central invoice authority PostgreSQL acceptance: concurrency, replay, tenant isolation, and RPC privileges OK",
);
