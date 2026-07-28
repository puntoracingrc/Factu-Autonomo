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

function reconcileSql({
  userId,
  idempotencyKey,
  requestHash,
  issuerNif,
  seriesCode,
  observedMax,
  sourceCount,
  sourceDigest = `sha256:${"a".repeat(64)}`,
}) {
  return `
    select set_config('request.jwt.claim.role', 'service_role', false);
    select
      result_status,
      reconciliation_id,
      previous_sequence,
      resulting_sequence
    from public.reconcile_central_invoice_series_v1(
      ${sqlLiteral(userId)}::uuid,
      'postgres-test-device',
      'postgres-test-session',
      ${sqlLiteral(idempotencyKey)},
      ${sqlLiteral(requestHash)},
      'test',
      ${sqlLiteral(issuerNif)},
      ${sqlLiteral(seriesCode)},
      2026,
      ${observedMax},
      ${sourceCount},
      ${sqlLiteral(sourceDigest)}
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

function reconciliationResultRow(output) {
  const line = output.split("\n").at(-1);
  const [status, reconciliationId, previousSequence, resultingSequence] =
    line.split("|");
  return {
    status,
    reconciliationId,
    previousSequence: Number(previousSequence),
    resultingSequence: Number(resultingSequence),
  };
}

const scope = randomUUID().replaceAll("-", "").slice(0, 10).toUpperCase();
const ownerA = randomUUID();
const ownerB = randomUUID();
const invoiceSeries = `T${scope}`;
const rectificationSeries = `R${scope}`;
const unreconciledSeries = `U${scope}`;

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

assert.throws(
  () =>
    runSql(
      issueSql({
        ...commandA,
        localId: `unreconciled-${scope}`,
        idempotencyKey: `idem-unreconciled-${scope}`,
        requestHash: `request-unreconciled-${scope}`,
        seriesCode: unreconciledSeries,
      }),
    ),
  /central invoice series baseline not reconciled/i,
);

const ownerABaseline = {
  userId: ownerA,
  idempotencyKey: `baseline-a-${scope}`,
  requestHash: `baseline-request-a-${scope}`,
  issuerNif: commandA.issuerNif,
  seriesCode: invoiceSeries,
  observedMax: 2954,
  sourceCount: 936,
};
const baseline = reconciliationResultRow(
  runSql(reconcileSql(ownerABaseline)),
);
assert.equal(baseline.status, "committed");
assert.equal(baseline.previousSequence, 0);
assert.equal(baseline.resultingSequence, 2954);

const baselineReplay = reconciliationResultRow(
  runSql(reconcileSql(ownerABaseline)),
);
assert.equal(baselineReplay.status, "replayed");
assert.equal(baselineReplay.reconciliationId, baseline.reconciliationId);
assert.equal(baselineReplay.resultingSequence, 2954);

assert.throws(
  () =>
    runSql(
      reconcileSql({
        ...ownerABaseline,
        requestHash: `baseline-request-conflict-${scope}`,
      }),
    ),
  /series reconciliation idempotency key reused with different request/i,
);

const lowerBaseline = reconciliationResultRow(
  runSql(
    reconcileSql({
      ...ownerABaseline,
      idempotencyKey: `baseline-a-lower-${scope}`,
      requestHash: `baseline-request-a-lower-${scope}`,
      observedMax: 10,
      sourceCount: 10,
      sourceDigest: `sha256:${"b".repeat(64)}`,
    }),
  ),
);
assert.equal(lowerBaseline.previousSequence, 2954);
assert.equal(lowerBaseline.resultingSequence, 2954);

const [first, second] = await Promise.all([
  runSqlAsync(issueSql(commandA)).then(resultRow),
  runSqlAsync(issueSql(commandB)).then(resultRow),
]);

assert.deepEqual(
  [first.sequence, second.sequence].sort((a, b) => a - b),
  [2955, 2956],
);
assert.notEqual(first.fullNumber, second.fullNumber);
assert.equal(first.status, "committed");
assert.equal(second.status, "committed");

const replay = resultRow(runSql(issueSql(commandA)));
assert.equal(replay.status, "replayed");
assert.equal(replay.identityId, first.identityId);
assert.equal(replay.fullNumber, first.fullNumber);

runSql(
  reconcileSql({
    userId: ownerB,
    idempotencyKey: `baseline-foreign-${scope}`,
    requestHash: `baseline-request-foreign-${scope}`,
    issuerNif: "C12345678",
    seriesCode: invoiceSeries,
    observedMax: 0,
    sourceCount: 0,
    sourceDigest: `sha256:${"c".repeat(64)}`,
  }),
);

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

runSql(
  reconcileSql({
    userId: ownerA,
    idempotencyKey: `baseline-rectification-${scope}`,
    requestHash: `baseline-request-rectification-${scope}`,
    issuerNif: "B12345678",
    seriesCode: rectificationSeries,
    observedMax: 0,
    sourceCount: 0,
    sourceDigest: `sha256:${"d".repeat(64)}`,
  }),
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

assert.throws(
  () =>
    runSql(`
      set role anon;
      select public.reconcile_central_invoice_series_v1(
        ${sqlLiteral(ownerA)}::uuid,
        'postgres-test-device',
        'postgres-test-session',
        'anon-baseline',
        'anon-request',
        'test',
        'B12345678',
        ${sqlLiteral(invoiceSeries)},
        2026,
        2954,
        936,
        ${sqlLiteral(`sha256:${"e".repeat(64)}`)}
      );
    `),
  /permission denied for function reconcile_central_invoice_series_v1/i,
);

assert.throws(
  () =>
    runSql(`
      set role service_role;
      update public.central_invoice_series_reconciliations
        set resulting_sequence = resulting_sequence
        where user_id = ${sqlLiteral(ownerA)}::uuid;
    `),
  /permission denied for table central_invoice_series_reconciliations/i,
);

assert.throws(
  () =>
    runSql(`
      update public.central_invoice_series_reconciliations
        set resulting_sequence = resulting_sequence
        where id = ${sqlLiteral(baseline.reconciliationId)}::uuid;
    `),
  /central invoice series reconciliation is immutable/i,
);

const expectedIndexes = [
  "central_invoice_documents_identity_uidx",
  "central_invoice_identities_rectifies_idx",
  "central_invoice_commands_result_document_idx",
  "central_invoice_commands_result_identity_idx",
  "central_invoice_commands_result_outbox_idx",
  "central_invoice_outbox_document_idx",
  "central_invoice_outbox_identity_idx",
  "central_invoice_outbox_user_cursor_idx",
  "central_invoice_series_reconciliations_idempotency_uidx",
  "central_invoice_series_reconciliations_scope_idx",
];
const installedIndexes = new Set(
  runSql(`
    select indexname
    from pg_indexes
    where schemaname = 'public'
      and indexname = any (
        array[${expectedIndexes.map(sqlLiteral).join(", ")}]::text[]
      )
    order by indexname;
  `)
    .split("\n")
    .filter(Boolean),
);
assert.deepEqual(
  [...installedIndexes].sort(),
  [...expectedIndexes].sort(),
);

const expectedDenyPolicies = [
  "central_invoice_commands|central_invoice_commands_deny_clients_v1",
  "central_invoice_document_versions|central_invoice_document_versions_deny_clients_v1",
  "central_invoice_documents|central_invoice_documents_deny_clients_v1",
  "central_invoice_identities|central_invoice_identities_deny_clients_v1",
  "central_invoice_outbox|central_invoice_outbox_deny_clients_v1",
  "central_invoice_series_reconciliations|central_invoice_series_reconciliations_deny_clients_v1",
  "central_invoice_series_state|central_invoice_series_state_deny_clients_v1",
];
const installedDenyPolicies = runSql(`
  select tablename || '|' || policyname
  from pg_policies
  where schemaname = 'public'
    and policyname like 'central_invoice_%_deny_clients_v1'
    and permissive = 'RESTRICTIVE'
    and cmd = 'ALL'
    and roles = array['anon', 'authenticated']::name[]
    and qual = 'false'
    and with_check = 'false'
  order by tablename;
`)
  .split("\n")
  .filter(Boolean);
assert.deepEqual(installedDenyPolicies, expectedDenyPolicies);

console.log(
  "central invoice authority PostgreSQL acceptance: reconciled historical sequence, monotonic baseline, concurrency, replay, tenant isolation, RPC privileges, indexes, and explicit client denies OK",
);
