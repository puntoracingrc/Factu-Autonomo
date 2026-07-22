#!/usr/bin/env node
import { spawn, spawnSync } from "node:child_process";
import { randomUUID } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import Stripe from "stripe";
import { createClient } from "@supabase/supabase-js";

const root = path.resolve(new URL("../../", import.meta.url).pathname);
const prefix = `phase1_${randomUUID().replace(/-/g, "_")}`;
const stripeAtomicLedgerCutoverUnix = 1_783_906_500;
const monthKey = "2099-01";
const password = `Phase1-${randomUUID()}!`;

const sqlFiles = {
  base: [
    "supabase/schema.sql",
    "supabase/billing.sql",
    "supabase/billing-profile.sql",
    "supabase/billing-scans.sql",
    "supabase/billing-scan-credits.sql",
    "supabase/billing-ai-units.sql",
    "supabase/referrals.sql",
    "supabase/verifactu.sql",
  ],
  up: [
    "supabase/migrations/20260624000100_phase1_hardening.sql",
    "supabase/migrations/20260624000200_phase1_rpc_search_path_hardening.sql",
    "supabase/migrations/20260713001000_stripe_webhook_idempotency.sql",
  ],
  down: [
    "supabase/rollbacks/20260713001000_stripe_webhook_idempotency.down.sql",
    "supabase/rollbacks/20260624000200_phase1_rpc_search_path_hardening.down.sql",
    "supabase/rollbacks/20260624000100_phase1_hardening.down.sql",
  ],
};
const expenseLearningSql = {
  up: "supabase/migrations/20260721223000_expense_learning_storage_p1b.sql",
  down: "supabase/rollbacks/20260721223000_expense_learning_storage_p1b.down.sql",
};
const expenseLearningConsentSql = {
  up: "supabase/migrations/20260722050000_expense_learning_consent_p2a.sql",
  down: "supabase/rollbacks/20260722050000_expense_learning_consent_p2a.down.sql",
};
const expenseLearningIngestionSql = {
  up: "supabase/migrations/20260722110000_expense_learning_ingestion_p3a.sql",
  down: "supabase/rollbacks/20260722110000_expense_learning_ingestion_p3a.down.sql",
};
const expenseLearningRetentionSql = {
  up: "supabase/migrations/20260722190000_expense_learning_retention_p4a.sql",
  down:
    "supabase/rollbacks/20260722190000_expense_learning_retention_p4a.down.sql",
};
const expenseLearningPromotionSql = {
  up: "supabase/migrations/20260722230000_expense_learning_promotion_p4b.sql",
  down:
    "supabase/rollbacks/20260722230000_expense_learning_promotion_p4b.down.sql",
};

const requiredEnv = [
  "PHASE1_ACCEPTANCE_ALLOW_DESTRUCTIVE",
  "PHASE1_ACCEPTANCE_TARGET",
  "PHASE1_ACCEPTANCE_SUPABASE_URL",
  "PHASE1_ACCEPTANCE_ANON_KEY",
  "PHASE1_ACCEPTANCE_SERVICE_ROLE_KEY",
  "PHASE1_ACCEPTANCE_DATABASE_URL",
  "PHASE1_ACCEPTANCE_APP_URL",
  "PHASE1_ACCEPTANCE_STRIPE_WEBHOOK_SECRET",
];

function env(name) {
  return process.env[name] ?? "";
}

function fail(message) {
  throw new Error(message);
}

function assertSafeEnvironment() {
  for (const name of requiredEnv) {
    if (!env(name)) fail(`Missing required env var: ${name}`);
  }
  if (env("PHASE1_ACCEPTANCE_ALLOW_DESTRUCTIVE") !== "true") {
    fail(
      "Refusing destructive run: set PHASE1_ACCEPTANCE_ALLOW_DESTRUCTIVE=true",
    );
  }
  const target = env("PHASE1_ACCEPTANCE_TARGET");
  if (!["local", "staging"].includes(target)) {
    fail("PHASE1_ACCEPTANCE_TARGET must be local or staging");
  }
  if (
    target === "staging" &&
    env("PHASE1_ACCEPTANCE_STAGING_CONFIRM") !==
      "I_UNDERSTAND_THIS_IS_DESTRUCTIVE"
  ) {
    fail(
      "Staging runs require PHASE1_ACCEPTANCE_STAGING_CONFIRM=I_UNDERSTAND_THIS_IS_DESTRUCTIVE",
    );
  }
  const appHost = new URL(env("PHASE1_ACCEPTANCE_APP_URL")).hostname;
  const supabaseHost = new URL(env("PHASE1_ACCEPTANCE_SUPABASE_URL")).hostname;
  const forbidden = ["facturacion-autonomos.app", "factu-autonomo.vercel.app"];
  if (forbidden.includes(appHost) || forbidden.includes(supabaseHost)) {
    fail(`Refusing production-looking host: ${appHost} / ${supabaseHost}`);
  }
  if (
    target === "local" &&
    !["localhost", "127.0.0.1", "::1"].includes(appHost)
  ) {
    fail("Local target requires local app host");
  }
}

function run(cmd, args, options = {}) {
  const result = spawnSync(cmd, args, {
    cwd: root,
    encoding: "utf8",
    stdio: "pipe",
    ...options,
  });
  if (result.error) {
    fail(`${cmd} ${args.join(" ")} failed: ${result.error.message}`);
  }
  if (result.status !== 0) {
    fail(
      `${cmd} ${args.join(" ")} failed\nSTDOUT:\n${result.stdout}\nSTDERR:\n${result.stderr}`,
    );
  }
  return result.stdout.trim();
}

function applySql(file) {
  const absolute = path.join(root, file);
  if (!fs.existsSync(absolute)) fail(`Missing SQL file: ${file}`);
  run("psql", [
    env("PHASE1_ACCEPTANCE_DATABASE_URL"),
    "-v",
    "ON_ERROR_STOP=1",
    "-f",
    absolute,
  ]);
}

function applyInlineSql(sql) {
  run("psql", [
    env("PHASE1_ACCEPTANCE_DATABASE_URL"),
    "-v",
    "ON_ERROR_STOP=1",
    "-c",
    sql,
  ]);
}

function querySql(sql) {
  return run("psql", [
    env("PHASE1_ACCEPTANCE_DATABASE_URL"),
    "-X",
    "-A",
    "-t",
    "-v",
    "ON_ERROR_STOP=1",
    "-c",
    sql,
  ]);
}

function querySqlAsLearningOwner(sql) {
  const result = spawnSync(
    "psql",
    [
      env("PHASE1_ACCEPTANCE_DATABASE_URL"),
      "-X",
      "-q",
      "-A",
      "-t",
      "-v",
      "ON_ERROR_STOP=1",
      "-c",
      `begin; set local role expense_learning_storage_owner; ${sql}; commit;`,
    ],
    { cwd: root, encoding: "utf8", stdio: "pipe" },
  );
  if (result.error) fail(`Learning owner SQL failed: ${result.error.message}`);
  if (result.status !== 0) {
    fail(`Learning owner SQL failed: ${result.stderr.trim()}`);
  }
  return result.stdout.trim();
}

function querySqlAsync(sql, { learningOwner = false } = {}) {
  const statement = learningOwner
    ? `begin; set local role expense_learning_storage_owner; ${sql}; commit;`
    : sql;

  return new Promise((resolve, reject) => {
    const child = spawn(
      "psql",
      [
        env("PHASE1_ACCEPTANCE_DATABASE_URL"),
        "-X",
        "-q",
        "-A",
        "-t",
        "-v",
        "ON_ERROR_STOP=1",
        "-c",
        statement,
      ],
      { cwd: root, stdio: ["ignore", "pipe", "pipe"] },
    );
    let stdout = "";
    let stderr = "";
    child.stdout.on("data", (chunk) => {
      stdout += chunk.toString();
    });
    child.stderr.on("data", (chunk) => {
      stderr += chunk.toString();
    });
    child.on("error", reject);
    child.on("close", (code) => {
      if (code === 0) resolve(stdout.trim());
      else reject(new Error(`${stdout}\n${stderr}`.trim()));
    });
  });
}

function expectInlineSqlFailure(sql, expectedMessage) {
  const result = spawnSync(
    "psql",
    [
      env("PHASE1_ACCEPTANCE_DATABASE_URL"),
      "-X",
      "-v",
      "ON_ERROR_STOP=1",
      "-c",
      sql,
    ],
    { cwd: root, encoding: "utf8", stdio: "pipe" },
  );
  const output = `${result.stdout ?? ""}\n${result.stderr ?? ""}`;
  expect(
    result.status !== 0 && output.includes(expectedMessage),
    `Expected inline SQL to fail with ${expectedMessage}`,
  );
}

function expectSqlFileFailure(file, expectedMessage) {
  const absolute = path.join(root, file);
  const result = spawnSync(
    "psql",
    [
      env("PHASE1_ACCEPTANCE_DATABASE_URL"),
      "-v",
      "ON_ERROR_STOP=1",
      "-f",
      absolute,
    ],
    { cwd: root, encoding: "utf8", stdio: "pipe" },
  );
  const output = `${result.stdout ?? ""}\n${result.stderr ?? ""}`;
  expect(
    result.status !== 0 && output.includes(expectedMessage),
    `Expected ${file} to fail with ${expectedMessage}`,
  );
}

function applySqlSequence(files) {
  for (const file of files) applySql(file);
}

function supabaseClient(key) {
  return createClient(env("PHASE1_ACCEPTANCE_SUPABASE_URL"), key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

const anon = () => supabaseClient(env("PHASE1_ACCEPTANCE_ANON_KEY"));
const service = () => supabaseClient(env("PHASE1_ACCEPTANCE_SERVICE_ROLE_KEY"));

async function createUser(admin, label) {
  const email = `${prefix}_${label}@example.test`;
  const { data, error } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });
  if (error || !data.user)
    fail(`Could not create user ${label}: ${error?.message}`);
  const client = anon();
  const { error: signInError } = await client.auth.signInWithPassword({
    email,
    password,
  });
  if (signInError)
    fail(`Could not sign in user ${label}: ${signInError.message}`);
  return { id: data.user.id, email, client };
}

async function cleanup(admin, users) {
  await admin
    .from("stripe_events")
    .delete()
    .like("stripe_event_id", `${prefix}%`);
  await admin
    .from("payment_receipts")
    .delete()
    .like("description", `${prefix}%`);
  await admin.from("user_usage").delete().eq("month_key", monthKey);
  for (const user of users) {
    await admin.from("user_subscriptions").delete().eq("user_id", user.id);
    await admin.auth.admin.deleteUser(user.id);
  }
}

async function seedRows(admin, userA, userB) {
  const now = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
  const { error: subError } = await admin.from("user_subscriptions").upsert([
    {
      user_id: userA.id,
      plan: "pro",
      status: "active",
      current_period_end: now,
      scan_trial_remaining: 2,
      scan_credits: 0,
      ai_credit_units: 0,
    },
    {
      user_id: userB.id,
      plan: "free",
      status: "inactive",
      scan_trial_remaining: 2,
      scan_credits: 0,
      ai_credit_units: 0,
    },
  ]);
  if (subError) fail(`Could not seed subscriptions: ${subError.message}`);

  const { error: usageError } = await admin.from("user_usage").upsert([
    {
      user_id: userA.id,
      month_key: monthKey,
      documents_created: 0,
      expense_scans_created: 0,
      customer_ai_autofills_created: 0,
    },
    {
      user_id: userB.id,
      month_key: monthKey,
      documents_created: 0,
      expense_scans_created: 0,
      customer_ai_autofills_created: 0,
    },
  ]);
  if (usageError) fail(`Could not seed usage: ${usageError.message}`);

  const { error: receiptError } = await admin.from("payment_receipts").insert([
    {
      user_id: userA.id,
      stripe_event_id: `${prefix}_receipt_a`,
      amount_cents: 100,
      currency: "eur",
      description: `${prefix}_receipt_a`,
      customer_email: userA.email,
    },
    {
      user_id: userB.id,
      stripe_event_id: `${prefix}_receipt_b`,
      amount_cents: 200,
      currency: "eur",
      description: `${prefix}_receipt_b`,
      customer_email: userB.email,
    },
  ]);
  if (receiptError) fail(`Could not seed receipts: ${receiptError.message}`);

  const { error: stripeEventError } = await admin.from("stripe_events").insert([
    {
      stripe_event_id: `${prefix}_stripe_a`,
      event_type: "checkout.session.completed",
      status: "processed",
    },
  ]);
  if (stripeEventError)
    fail(`Could not seed stripe events: ${stripeEventError.message}`);
}

function opAllowed(result) {
  return !result.error;
}

function expect(condition, message) {
  if (!condition) fail(message);
}

function expenseLearningRuntimeRowCount() {
  return Number(
    querySql(`
      select
        (select count(*) from expense_learning_private.contribution_claims)
        + (select count(*) from expense_learning_private.contributor_week_limits)
        + (select count(*) from expense_learning_private.accumulator_memberships)
        + (select count(*) from expense_learning_private.protected_accumulators)
        + (select count(*) from expense_learning_private.closed_week_supported_metrics);
    `),
  );
}

function expenseLearningP3RuntimeRowCount() {
  return Number(
    querySql(`
      select
        (select count(*) from expense_learning_private.contribution_claims)
        + (select count(*) from expense_learning_private.contributor_week_limits)
        + (select count(*) from expense_learning_private.accumulator_memberships)
        + (select count(*) from expense_learning_private.protected_accumulators)
        + (select count(*) from expense_learning_private.closed_week_supported_metrics)
        + (select count(*) from expense_learning_private.contributor_revocation_links);
    `),
  );
}

function expenseLearningProtectedSourceRowCount() {
  return Number(
    querySql(`
      select
        (select count(*) from expense_learning_private.contribution_claims)
        + (select count(*) from expense_learning_private.contributor_week_limits)
        + (select count(*) from expense_learning_private.accumulator_memberships)
        + (select count(*) from expense_learning_private.protected_accumulators)
        + (select count(*) from expense_learning_private.contributor_revocation_links);
    `),
  );
}

function expenseLearningP3TableCounts() {
  return querySql(`
    select pg_catalog.concat_ws(
      ',',
      (select count(*) from expense_learning_private.contribution_claims),
      (select count(*) from expense_learning_private.contributor_week_limits),
      (select count(*) from expense_learning_private.accumulator_memberships),
      (select count(*) from expense_learning_private.protected_accumulators),
      (select count(*) from expense_learning_private.closed_week_supported_metrics),
      (select count(*) from expense_learning_private.contributor_revocation_links)
    );
  `);
}

function expenseLearningP4bTableCounts() {
  return querySql(`
    select pg_catalog.concat_ws(
      ',',
      (select count(*) from expense_learning_private.closed_week_promotion_batches),
      (select count(*) from expense_learning_private.closed_week_supported_metrics)
    );
  `);
}

function expectExpenseLearningP3Integrity(message) {
  expect(
    querySql(`
      with membership_support as (
        select
          contribution_schema_version,
          observation_schema_version,
          engine_version,
          privacy_policy_version,
          week_start,
          structural_archetype_group,
          metric_family,
          comparison_scope,
          metric_key,
          bucket_kind,
          bucket_value,
          pg_catalog.count(*)::integer as supporting_contributors
        from expense_learning_private.accumulator_memberships
        group by
          contribution_schema_version,
          observation_schema_version,
          engine_version,
          privacy_policy_version,
          week_start,
          structural_archetype_group,
          metric_family,
          comparison_scope,
          metric_key,
          bucket_kind,
          bucket_value
      )
      select not exists (
        select 1
        from expense_learning_private.protected_accumulators as accumulator
        full join membership_support as membership using (
          contribution_schema_version,
          observation_schema_version,
          engine_version,
          privacy_policy_version,
          week_start,
          structural_archetype_group,
          metric_family,
          comparison_scope,
          metric_key,
          bucket_kind,
          bucket_value
        )
        where accumulator.supporting_contributors is distinct from
          membership.supporting_contributors
      );
    `) === "t",
    message,
  );
}

function expenseLearningConsentRowCount(userId = null) {
  const filter = userId
    ? `where user_id = '${userId.replaceAll("'", "''")}'::uuid`
    : "";
  return Number(
    querySql(`
      select count(*)
      from expense_learning_private.learning_consent_decisions
      ${filter};
    `),
  );
}

function expenseLearningSchemaExists() {
  return (
    querySql(
      "select pg_catalog.to_regnamespace('expense_learning_private') is not null;",
    ) === "t"
  );
}

function expenseLearningCatalogSnapshot() {
  return querySql(`
    with catalog_rows as (
      select
        'role|' || rolname || '|' || rolcanlogin || '|' || rolinherit || '|'
          || rolsuper || '|' || rolbypassrls as value
      from pg_catalog.pg_roles
      where rolname = 'expense_learning_storage_owner'
      union all
      select
        'membership|' || granted.rolname || '|' || member.rolname || '|'
          || grantor.rolname || '|' || membership.admin_option || '|'
          || membership.inherit_option || '|' || membership.set_option
      from pg_catalog.pg_auth_members membership
      join pg_catalog.pg_roles granted on granted.oid = membership.roleid
      join pg_catalog.pg_roles member on member.oid = membership.member
      join pg_catalog.pg_roles grantor on grantor.oid = membership.grantor
      where granted.rolname = 'expense_learning_storage_owner'
      union all
      select
        'schema|' || n.nspname || '|' || pg_catalog.pg_get_userbyid(n.nspowner)
          || '|' || coalesce(n.nspacl::text, '')
      from pg_catalog.pg_namespace n
      where n.nspname = 'expense_learning_private'
      union all
      select
        'table|' || c.relname || '|' || pg_catalog.pg_get_userbyid(c.relowner)
          || '|' || c.relrowsecurity || '|' || c.relforcerowsecurity || '|'
          || coalesce(c.relacl::text, '')
      from pg_catalog.pg_class c
      join pg_catalog.pg_namespace n on n.oid = c.relnamespace
      where n.nspname = 'expense_learning_private'
        and c.relkind = 'r'
      union all
      select
        'constraint|' || c.relname || '|' || con.conname || '|'
          || pg_catalog.pg_get_constraintdef(con.oid, true)
      from pg_catalog.pg_constraint con
      join pg_catalog.pg_class c on c.oid = con.conrelid
      join pg_catalog.pg_namespace n on n.oid = c.relnamespace
      where n.nspname = 'expense_learning_private'
      union all
      select
        'function|' || n.nspname || '.' || p.proname || '('
          || pg_catalog.pg_get_function_identity_arguments(p.oid) || ')|'
          || pg_catalog.pg_get_userbyid(p.proowner) || '|' || p.prosecdef || '|'
          || coalesce(p.proconfig::text, '') || '|' || coalesce(p.proacl::text, '')
          || '|' || pg_catalog.md5(p.prosrc)
      from pg_catalog.pg_proc p
      join pg_catalog.pg_namespace n on n.oid = p.pronamespace
      where (
        n.nspname = 'expense_learning_private'
        or (
          n.nspname = 'public'
          and p.proname in (
            'submit_expense_learning_contribution_v1',
            'promote_expense_learning_closed_weeks_v1',
            'purge_expense_learning_retention_v1'
          )
        )
      )
    )
    select value from catalog_rows order by value;
  `);
}

function expenseLearningConsentCatalogSnapshot() {
  return querySql(`
    with catalog_rows as (
      select
        'table|' || c.relname || '|' || pg_catalog.pg_get_userbyid(c.relowner)
          || '|' || c.relrowsecurity || '|' || c.relforcerowsecurity || '|'
          || coalesce(c.relacl::text, '') as value
      from pg_catalog.pg_class c
      join pg_catalog.pg_namespace n on n.oid = c.relnamespace
      where n.nspname = 'expense_learning_private'
        and c.relname in (
          'learning_consent_decisions',
          'learning_consent_decisions_decision_id_seq'
        )
      union all
      select
        'constraint|' || c.relname || '|' || con.conname || '|'
          || pg_catalog.pg_get_constraintdef(con.oid, true)
      from pg_catalog.pg_constraint con
      join pg_catalog.pg_class c on c.oid = con.conrelid
      join pg_catalog.pg_namespace n on n.oid = c.relnamespace
      where n.nspname = 'expense_learning_private'
        and c.relname = 'learning_consent_decisions'
      union all
      select
        'index|' || index_class.relname || '|'
          || pg_catalog.pg_get_indexdef(index_class.oid)
      from pg_catalog.pg_index index_record
      join pg_catalog.pg_class table_class
        on table_class.oid = index_record.indrelid
      join pg_catalog.pg_class index_class
        on index_class.oid = index_record.indexrelid
      join pg_catalog.pg_namespace n on n.oid = table_class.relnamespace
      where n.nspname = 'expense_learning_private'
        and table_class.relname = 'learning_consent_decisions'
      union all
      select
        'policy|' || policy.polname || '|' || policy.polcmd::text || '|'
          || (
            select pg_catalog.string_agg(role.rolname, ',' order by role.rolname)
            from pg_catalog.pg_roles role
            where role.oid = any (policy.polroles)
          ) || '|'
          || coalesce(pg_catalog.pg_get_expr(policy.polqual, policy.polrelid), '')
          || '|'
          || coalesce(pg_catalog.pg_get_expr(policy.polwithcheck, policy.polrelid), '')
      from pg_catalog.pg_policy policy
      join pg_catalog.pg_class c on c.oid = policy.polrelid
      join pg_catalog.pg_namespace n on n.oid = c.relnamespace
      where n.nspname = 'expense_learning_private'
        and c.relname = 'learning_consent_decisions'
      union all
      select
        'function|' || p.proname || '(' ||
          pg_catalog.pg_get_function_identity_arguments(p.oid) || ')|'
          || pg_catalog.pg_get_userbyid(p.proowner) || '|' || p.prosecdef || '|'
          || coalesce(p.proconfig::text, '') || '|' || coalesce(p.proacl::text, '')
          || '|' || pg_catalog.md5(p.prosrc)
      from pg_catalog.pg_proc p
      join pg_catalog.pg_namespace n on n.oid = p.pronamespace
      where n.nspname = 'public'
        and p.proname in (
          'get_expense_learning_consent_v1',
          'set_expense_learning_consent_v1'
        )
    )
    select value from catalog_rows order by value;
  `);
}

function expenseLearningP3CatalogSnapshot() {
  const extensionsPrivileges = querySql(`
    select pg_catalog.concat_ws(
      '|',
      pg_catalog.has_schema_privilege(
        'expense_learning_storage_owner',
        'extensions',
        'USAGE'
      ),
      pg_catalog.has_schema_privilege(
        'expense_learning_storage_owner',
        'extensions',
        'CREATE'
      )
    );
  `);
  return `${expenseLearningCatalogSnapshot()}\n---consent---\n${expenseLearningConsentCatalogSnapshot()}\n---extensions---\n${extensionsPrivileges}`;
}

function expenseLearningP4CatalogSnapshot() {
  return expenseLearningP3CatalogSnapshot();
}

function testExpenseLearningDatabaseBoundary() {
  expect(
    querySql(`
      select rolcanlogin = false
        and rolinherit = false
        and rolsuper = false
        and rolbypassrls = false
      from pg_catalog.pg_roles
      where rolname = 'expense_learning_storage_owner';
    `) === "t",
    "expense learning owner is not a constrained NOLOGIN role",
  );
  expect(
    querySql(`
      select count(*) >= 1
        and pg_catalog.bool_and(member.rolname = 'postgres')
        and pg_catalog.bool_or(membership.set_option)
      from pg_catalog.pg_auth_members membership
      join pg_catalog.pg_roles granted on granted.oid = membership.roleid
      join pg_catalog.pg_roles member on member.oid = membership.member
      where granted.rolname = 'expense_learning_storage_owner';
    `) === "t",
    "expense learning owner lacks an exclusive SET-capable postgres membership",
  );
  expect(
    querySql(`
      select not pg_catalog.has_schema_privilege(
        'expense_learning_storage_owner',
        'public',
        'CREATE'
      );
    `) === "t",
    "expense learning owner retained CREATE on public schema",
  );
  expect(
    querySql(`
      select not pg_catalog.has_schema_privilege(
        'expense_learning_storage_owner',
        'auth',
        'USAGE'
      )
      and not pg_catalog.has_table_privilege(
        'expense_learning_storage_owner',
        'auth.users',
        'SELECT,INSERT,UPDATE,DELETE'
      );
    `) === "t",
    "expense learning owner unexpectedly reached auth schema or tables",
  );
  const rowsBeforeClaimChecks = expenseLearningRuntimeRowCount();
  expectInlineSqlFailure(
    "select public.promote_expense_learning_closed_weeks_v1();",
    "expense_learning_rpc_forbidden",
  );
  expectInlineSqlFailure(
    `set request.jwt.claims = '{';
     select public.promote_expense_learning_closed_weeks_v1();`,
    "expense_learning_rpc_forbidden",
  );
  expect(
    expenseLearningRuntimeRowCount() === rowsBeforeClaimChecks,
    "missing or malformed role claims changed expense learning rows",
  );
  expect(
    querySql(`
      select rolbypassrls
      from pg_catalog.pg_roles
      where rolname = 'service_role';
    `) === "t",
    "service_role is not BYPASSRLS; the ACL test would be meaningless",
  );
  expect(
    querySql(`
      select count(*) = 5
      from pg_catalog.pg_class c
      join pg_catalog.pg_namespace n on n.oid = c.relnamespace
      where n.nspname = 'expense_learning_private'
        and c.relkind = 'r'
        and c.relname in (
          'contribution_claims',
          'contributor_week_limits',
          'accumulator_memberships',
          'protected_accumulators',
          'closed_week_supported_metrics'
        )
        and c.relrowsecurity
        and c.relforcerowsecurity;
    `) === "t",
    "expense learning tables do not all have ENABLE + FORCE RLS",
  );
  expect(
    querySql(`
      select count(*) = 0
      from pg_catalog.pg_policy p
      join pg_catalog.pg_class c on c.oid = p.polrelid
      join pg_catalog.pg_namespace n on n.oid = c.relnamespace
      where n.nspname = 'expense_learning_private'
        and c.relname in (
          'contribution_claims',
          'contributor_week_limits',
          'accumulator_memberships',
          'protected_accumulators',
          'closed_week_supported_metrics'
        );
    `) === "t",
    "expense learning private tables unexpectedly have RLS policies",
  );
  expect(
    querySql(`
      select not pg_catalog.has_schema_privilege(
        'service_role',
        'expense_learning_private',
        'USAGE'
      );
    `) === "t",
    "service_role unexpectedly has USAGE on expense learning private schema",
  );

  expectInlineSqlFailure(
    `set role service_role;
     select count(*) from expense_learning_private.protected_accumulators;`,
    "permission denied for schema expense_learning_private",
  );
  expectInlineSqlFailure(
    `set role service_role;
     insert into expense_learning_private.contribution_claims (
       claim_token_digest,
       expires_at
     ) values (
       pg_catalog.decode(pg_catalog.repeat('00', 32), 'hex'),
       pg_catalog.statement_timestamp() + interval '1 hour'
     );`,
    "permission denied for schema expense_learning_private",
  );
}

function testExpenseLearningConstraints() {
  expectInlineSqlFailure(
    `insert into expense_learning_private.contribution_claims (
       claim_token_digest,
       claimed_at,
       expires_at
     ) values (
       pg_catalog.decode('00', 'hex'),
       timestamptz '2099-01-01 00:00:00+00',
       timestamptz '2099-01-01 01:00:00+00'
     );`,
    "contribution_claims_digest_length_v1",
  );
  expectInlineSqlFailure(
    `insert into expense_learning_private.contribution_claims (
       claim_token_digest,
       claimed_at,
       expires_at
     ) values (
       pg_catalog.decode(pg_catalog.repeat('01', 32), 'hex'),
       timestamptz '2099-01-01 00:00:00+00',
       timestamptz '2099-01-02 00:00:01+00'
     );`,
    "contribution_claims_ttl_v1",
  );
  expectInlineSqlFailure(
    `insert into expense_learning_private.contributor_week_limits (
       week_start,
       contributor_week_hmac,
       accepted_learning_contributions,
       first_accepted_at,
       expires_at
     ) values (
       date '2098-12-29',
       pg_catalog.decode(pg_catalog.repeat('02', 32), 'hex'),
       21,
       timestamptz '2099-01-01 00:00:00+00',
       timestamptz '2099-01-02 00:00:00+00'
     );`,
    "contributor_week_limits_learning_only_cap_v1",
  );
  expectInlineSqlFailure(
    `insert into expense_learning_private.closed_week_supported_metrics (
       contribution_schema_version,
       observation_schema_version,
       engine_version,
       privacy_policy_version,
       week_start,
       structural_archetype_group,
       metric_family,
       comparison_scope,
       metric_key,
       bucket_kind,
       bucket_value,
       supporting_contributors,
       promoted_at,
       expires_at
     ) values (
       'expense-engine-aggregate-contribution.v1',
       'expense-engine-observation.v1',
       'expense-local-engine.v1',
       '2026-07-21',
       date '2098-12-29',
       'TABLE',
       'SOURCE_QUALITY',
       'NONE',
       'VALUE',
       'EXACT',
       'HIGH',
       9,
       timestamptz '2099-01-08 00:00:00+00',
       timestamptz '2099-02-08 00:00:00+00'
     );`,
    "closed_week_supported_metrics_support_v1",
  );
  expect(
    querySql(`
      select
        expense_learning_private.is_canonical_metric_bucket_v1(
          'CRITICAL_FLAG',
          'NONE',
          'CREDIT_SIGN_CORRECTED',
          'EXACT',
          'NOT_OBSERVED'
        )
        and not expense_learning_private.is_canonical_metric_bucket_v1(
          'CRITICAL_FLAG',
          'NONE',
          'CREDIT_SIGN_CORRECTED',
          'EXACT',
          'PRESENT'
        )
        and not expense_learning_private.is_canonical_metric_bucket_v1(
          'CRITICAL_FLAG',
          'NONE',
          'CREDIT_SIGN_CORRECTED',
          'COARSENED_OTHER',
          'OTHER'
        );
    `) === "t",
    "reserved credit-sign metric accepted a non-aggregable bucket",
  );
  expectInlineSqlFailure(
    `insert into expense_learning_private.closed_week_supported_metrics (
       contribution_schema_version,
       observation_schema_version,
       engine_version,
       privacy_policy_version,
       week_start,
       structural_archetype_group,
       metric_family,
       comparison_scope,
       metric_key,
       bucket_kind,
       bucket_value,
       supporting_contributors,
       promoted_at,
       expires_at
     ) values (
       'expense-engine-aggregate-contribution.v1',
       'expense-engine-observation.v1',
       'expense-local-engine.v1',
       '2026-07-21',
       date '2098-12-29',
       'TABLE',
       'CRITICAL_FLAG',
       'NONE',
       'CREDIT_SIGN_CORRECTED',
       'EXACT',
       'PRESENT',
       10,
       timestamptz '2099-01-08 00:00:00+00',
       timestamptz '2099-02-08 00:00:00+00'
     );`,
    "closed_week_supported_metrics_bucket_v1",
  );
  expectInlineSqlFailure(
    `insert into expense_learning_private.closed_week_supported_metrics (
       contribution_schema_version,
       observation_schema_version,
       engine_version,
       privacy_policy_version,
       week_start,
       structural_archetype_group,
       metric_family,
       comparison_scope,
       metric_key,
       bucket_kind,
       bucket_value,
       supporting_contributors,
       promoted_at,
       expires_at
     ) values (
       'expense-engine-aggregate-contribution.v1',
       'expense-engine-observation.v1',
       'expense-local-engine.v1',
       '2026-07-21',
       date '2098-12-29',
       'TABLE',
       'CRITICAL_FLAG',
       'NONE',
       'CREDIT_SIGN_CORRECTED',
       'COARSENED_OTHER',
       'OTHER',
       10,
       timestamptz '2099-01-08 00:00:00+00',
       timestamptz '2099-02-08 00:00:00+00'
     );`,
    "closed_week_supported_metrics_bucket_v1",
  );
  expect(
    expenseLearningRuntimeRowCount() === 0,
    "failed expense learning constraints left runtime rows",
  );
}

async function waitForExpenseLearningRpc(admin) {
  for (let attempt = 0; attempt < 30; attempt += 1) {
    const result = await admin.rpc("promote_expense_learning_closed_weeks_v1");
    if (!result.error) return result;
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  fail("expense learning RPC did not enter the PostgREST schema cache");
}

async function testExpenseLearningDataApi(admin, userA) {
  for (const [role, client] of [
    ["anon", anon()],
    ["authenticated", userA.client],
    ["service_role", admin],
  ]) {
    for (const table of [
      "protected_accumulators",
      "learning_consent_decisions",
      "contributor_revocation_links",
      "closed_week_supported_metrics",
      "closed_week_promotion_batches",
    ]) {
      const result = await client
        .schema("expense_learning_private")
        .from(table)
        .select("*");
      expect(
        !opAllowed(result),
        `${role} unexpectedly reached expense_learning_private.${table} over Data API`,
      );
    }
  }

  const submitArgs = {
    p_user_id: userA.id,
    p_contribution: {},
    p_claim_token_digest: "a".repeat(64),
    p_contributor_week_hmac: "b".repeat(64),
  };
  const anonSubmit = await anon().rpc(
    "submit_expense_learning_contribution_v1",
    submitArgs,
  );
  expect(!opAllowed(anonSubmit), "anon executed expense learning submit RPC");
  const authSubmit = await userA.client.rpc(
    "submit_expense_learning_contribution_v1",
    submitArgs,
  );
  expect(
    !opAllowed(authSubmit),
    "authenticated executed expense learning submit RPC",
  );

  const promote = await waitForExpenseLearningRpc(admin);
  expect(
    promote.data === "NOTHING",
    "expense learning P4B promotion did not return an empty generic result",
  );
  const submit = await admin.rpc(
    "submit_expense_learning_contribution_v1",
    submitArgs,
  );
  expect(
    opAllowed(submit) && submit.data === "DISABLED",
    "expense learning submit stub was not safely disabled",
  );
  const purge = await admin.rpc("purge_expense_learning_retention_v1");
  expect(
    opAllowed(purge) && purge.data === "PURGED",
    "expense learning P4A purge did not complete the empty maintenance pass",
  );
  expect(
    expenseLearningRuntimeRowCount() === 0,
    "disabled expense learning RPC wrote runtime rows",
  );
  expect(
    querySql(`
      select pg_catalog.string_agg(p.proname, ',' order by p.proname)
      from pg_catalog.pg_proc p
      join pg_catalog.pg_namespace n on n.oid = p.pronamespace
      where n.nspname = 'public'
        and p.proname like '%expense_learning%';
    `) ===
      [
        "get_expense_learning_consent_v1",
        "promote_expense_learning_closed_weeks_v1",
        "purge_expense_learning_retention_v1",
        "set_expense_learning_consent_v1",
        "submit_expense_learning_contribution_v1",
      ].join(","),
    "unexpected public expense learning RPC exists",
  );
}

const consentDecision = (granted) => ({
  schemaVersion: "expense-engine-learning-consent.v1",
  noticeVersion: "expense-learning-notice.v1",
  purpose: "IMPROVE_LOCAL_EXPENSE_READER",
  privacyPolicyVersion: "2026-07-21",
  granted,
});

const expenseLearningFieldKeys = [
  "DOCUMENT_KIND",
  "EXPENSE_DATE",
  "SUPPLIER_IDENTITY_PRESENT",
  "CATEGORY",
  "TAX_RATE",
  "TAX_BASE",
  "TAX_AMOUNT",
  "SURCHARGE_AMOUNT",
  "WITHHOLDING_AMOUNT",
  "TOTAL_AMOUNT",
  "PAYMENT_METHOD",
  "LINE_COUNT",
  "LINE_UNITS",
  "LINE_TOTALS",
];
const expenseLearningMathKeys = [
  "LINE_EXTENSIONS",
  "LINES_TO_BASE",
  "TAX_FROM_BASE",
  "SURCHARGE_FROM_BASE",
  "DOCUMENT_TOTAL",
  "SIGN_CONSISTENCY",
];

function expenseLearningCanonicalContribution(
  structuralArchetypeGroup = "TABLE",
) {
  const metrics = [
    ["SOURCE_QUALITY", "NONE", "VALUE", "HIGH"],
    ["ROUTE_MODE", "NONE", "VALUE", "SHADOW_AI"],
    ["LOCAL_OUTCOME", "NONE", "VALUE", "CANDIDATE"],
    ["LOCAL_CONFIDENCE", "NONE", "VALUE", "HIGH"],
    ["ABSTENTION_REASON", "NONE", "VALUE", "NONE"],
    ["AI_FALLBACK_REASON", "NONE", "VALUE", "NONE"],
    ["AI_USAGE", "NONE", "VALUE", "ONE"],
    ["LOCAL_DURATION", "NONE", "VALUE", "LT_1_S"],
    ["HUMAN_REVIEW", "NONE", "VALUE", "CONFIRMED"],
  ].map(([family, comparisonScope, key, value]) => ({
    family,
    comparisonScope,
    key,
    value,
  }));

  for (const comparisonScope of [
    "LOCAL_VS_HUMAN",
    "AI_VS_HUMAN",
    "LOCAL_VS_AI",
  ]) {
    for (const key of expenseLearningFieldKeys) {
      metrics.push({
        family: "FIELD_VERDICT",
        comparisonScope,
        key,
        value: "MATCH",
      });
    }
  }
  for (const key of expenseLearningMathKeys) {
    metrics.push({
      family: "MATH_VERDICT",
      comparisonScope: "NONE",
      key,
      value: "MATCH",
    });
    metrics.push({
      family: "MATH_RESIDUAL",
      comparisonScope: "NONE",
      key,
      value: "EXACT",
    });
  }
  for (const key of [
    "EXPENSE_ACCEPTED_THEN_REJECTED",
    "TAX_TREATMENT_CORRECTED",
    "CREDIT_SIGN_CORRECTED",
    "DUPLICATE_ACCEPTED",
  ]) {
    metrics.push({
      family: "CRITICAL_FLAG",
      comparisonScope: "NONE",
      key,
      value: "NOT_OBSERVED",
    });
  }

  expect(metrics.length === 67, "P3A fixture did not contain 67 metrics");
  return {
    schemaVersion: "expense-engine-aggregate-contribution.v1",
    observationSchemaVersion: "expense-engine-observation.v1",
    engineVersion: "expense-local-engine.v1",
    privacyPolicyVersion: "2026-07-21",
    structuralArchetypeGroup,
    metrics,
    learningHints: null,
  };
}

function sqlJson(value) {
  return JSON.stringify(value).replaceAll("'", "''");
}

function stageExpenseLearningContributionSql(
  userId,
  claimHex,
  weekHmacHex,
  contribution,
  suffix = "",
) {
  return `select expense_learning_private.stage_expense_learning_contribution_v1(
    '${userId}'::uuid,
    '${sqlJson(contribution)}'::jsonb,
    pg_catalog.decode('${claimHex}', 'hex'),
    pg_catalog.decode('${weekHmacHex}', 'hex')
  )${suffix}`;
}

function stageExpenseLearningSql(userId, claimHex, weekHmacHex, suffix = "") {
  return stageExpenseLearningContributionSql(
    userId,
    claimHex,
    weekHmacHex,
    expenseLearningCanonicalContribution(),
    suffix,
  );
}

function stageExpenseLearning(userId, claimHex, weekHmacHex) {
  return querySqlAsLearningOwner(
    stageExpenseLearningSql(userId, claimHex, weekHmacHex),
  );
}

function randomExpenseLearningHex() {
  return `${randomUUID().replaceAll("-", "")}${randomUUID().replaceAll("-", "")}`;
}

function mutateExpenseLearningMetric(
  contribution,
  family,
  comparisonScope,
  key,
  value,
) {
  return {
    ...contribution,
    metrics: contribution.metrics.map((metric) =>
      metric.family === family &&
      metric.comparisonScope === comparisonScope &&
      metric.key === key
        ? { ...metric, value }
        : { ...metric },
    ),
  };
}

function expenseLearningContributionForReview(
  structuralArchetypeGroup,
  humanReview,
) {
  let contribution = expenseLearningCanonicalContribution(
    structuralArchetypeGroup,
  );
  if (humanReview === "CONFIRMED") return contribution;
  if (humanReview === "REJECTED") {
    contribution = mutateExpenseLearningMetric(
      contribution,
      "HUMAN_REVIEW",
      "NONE",
      "VALUE",
      "REJECTED",
    );
    return mutateExpenseLearningMetric(
      contribution,
      "CRITICAL_FLAG",
      "NONE",
      "EXPENSE_ACCEPTED_THEN_REJECTED",
      "PRESENT",
    );
  }
  expect(
    humanReview === "CORRECTED",
    `unsupported expense learning review fixture: ${humanReview}`,
  );
  contribution = mutateExpenseLearningMetric(
    contribution,
    "HUMAN_REVIEW",
    "NONE",
    "VALUE",
    "CORRECTED",
  );
  contribution = mutateExpenseLearningMetric(
    contribution,
    "FIELD_VERDICT",
    "AI_VS_HUMAN",
    "TOTAL_AMOUNT",
    "CORRECTED",
  );
  return mutateExpenseLearningMetric(
    contribution,
    "FIELD_VERDICT",
    "LOCAL_VS_AI",
    "TOTAL_AMOUNT",
    "CORRECTED",
  );
}

function delay(milliseconds) {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

async function waitForSqlSessionSleep(applicationName, message) {
  let sleeping = false;
  for (let attempt = 0; attempt < 400; attempt += 1) {
    sleeping =
      querySql(`
        select exists (
          select 1
          from pg_catalog.pg_stat_activity
          where application_name = '${applicationName}'
            and wait_event_type = 'Timeout'
            and wait_event = 'PgSleep'
        );
      `) === "t";
    if (sleeping) break;
    await delay(25);
  }
  expect(sleeping, message);
}

async function waitForSqlSessionAdvisoryLock(applicationName, message) {
  let waiting = false;
  for (let attempt = 0; attempt < 400; attempt += 1) {
    waiting =
      querySql(`
        select exists (
          select 1
          from pg_catalog.pg_stat_activity
          where application_name = '${applicationName}'
            and wait_event_type = 'Lock'
            and pg_catalog.lower(wait_event) = 'advisory'
        );
      `) === "t";
    if (waiting) break;
    await delay(25);
  }
  expect(waiting, message);
}

async function waitForSqlSessionLock(applicationName, message) {
  let waiting = false;
  for (let attempt = 0; attempt < 400; attempt += 1) {
    waiting =
      querySql(`
        select exists (
          select 1
          from pg_catalog.pg_stat_activity
          where application_name = '${applicationName}'
            and wait_event_type = 'Lock'
        );
      `) === "t";
    if (waiting) break;
    await delay(25);
  }
  expect(waiting, message);
}

async function setExpenseLearningConsent(admin, userId, granted, message) {
  const result = await admin.rpc("set_expense_learning_consent_v1", {
    p_user_id: userId,
    p_decision: consentDecision(granted),
  });
  expectConsentState(result, granted ? "GRANTED" : "REVOKED", message);
  return result;
}

function testExpenseLearningP3DatabaseBoundary() {
  expect(
    querySql(`
      select pg_catalog.has_schema_privilege(
        'expense_learning_storage_owner',
        'extensions',
        'USAGE'
      )
      and not pg_catalog.has_schema_privilege(
        'expense_learning_storage_owner',
        'extensions',
        'CREATE'
      );
    `) === "t",
    "P3A owner does not have the exact extensions schema privilege",
  );
  expect(
    querySql(`
      select count(*) = 4
        and count(*) filter (where policy.polcmd = 'r') = 1
        and count(*) filter (where policy.polcmd = 'a') = 1
        and count(*) filter (where policy.polcmd = 'd') = 1
        and count(*) filter (where policy.polcmd = 'w') = 1
        and count(*) filter (where policy.polcmd = '*') = 0
        and count(*) filter (
          where policy.polname =
              'expense_learning_revocation_links_owner_lock_v1'
            and pg_catalog.pg_get_expr(
              policy.polqual,
              policy.polrelid
            ) = 'true'
            and pg_catalog.pg_get_expr(
              policy.polwithcheck,
              policy.polrelid
            ) = 'false'
        ) = 1
        and pg_catalog.bool_and(
          policy.polroles = array[owner.oid]::oid[]
        )
      from pg_catalog.pg_policy policy
      join pg_catalog.pg_class relation on relation.oid = policy.polrelid
      join pg_catalog.pg_namespace namespace
        on namespace.oid = relation.relnamespace
      cross join pg_catalog.pg_roles owner
      where namespace.nspname = 'expense_learning_private'
        and relation.relname = 'contributor_revocation_links'
        and owner.rolname = 'expense_learning_storage_owner';
    `) === "t",
    "P4A revocation links do not have owner-only CRUD-denied row locking",
  );
  expect(
    querySql(`
      select pg_catalog.bool_and(
        not pg_catalog.has_function_privilege(
          role.rolname,
          function.oid,
          'EXECUTE'
        )
      )
      from pg_catalog.pg_roles role
      cross join pg_catalog.pg_proc function
      join pg_catalog.pg_namespace namespace
        on namespace.oid = function.pronamespace
      where role.rolname = any (array[
        'anon',
        'authenticated',
        'service_role'
      ]::name[])
        and namespace.nspname = 'expense_learning_private'
        and function.proname in (
          'stage_expense_learning_contribution_v1',
          'purge_expense_learning_link_v1',
          'lock_expense_learning_cells_v1'
        );
    `) === "t",
    "P3A private mutation functions are executable by an API role",
  );
  expectInlineSqlFailure(
    `begin;
     set local role service_role;
     select count(*)
     from expense_learning_private.contributor_revocation_links;
     rollback;`,
    "permission denied for schema expense_learning_private",
  );
  expect(
    expenseLearningP3RuntimeRowCount() === 0,
    "P3A boundary checks changed runtime storage",
  );
}

function testExpenseLearningP4DatabaseBoundary() {
  expect(
    querySql(`
      select count(*) = 3
        and count(*) filter (where policy.polcmd = 'r') = 1
        and count(*) filter (where policy.polcmd = 'a') = 1
        and count(*) filter (where policy.polcmd = 'd') = 1
        and count(*) filter (where policy.polcmd in ('w', '*')) = 0
        and pg_catalog.bool_and(
          policy.polroles = array[owner.oid]::oid[]
        )
      from pg_catalog.pg_policy policy
      join pg_catalog.pg_class relation on relation.oid = policy.polrelid
      join pg_catalog.pg_namespace namespace
        on namespace.oid = relation.relnamespace
      cross join pg_catalog.pg_roles owner
      where namespace.nspname = 'expense_learning_private'
        and relation.relname = 'closed_week_supported_metrics'
        and owner.rolname = 'expense_learning_storage_owner';
    `) === "t",
    "P4B closed metrics do not have exactly owner-only SELECT/INSERT/DELETE policies",
  );
  expect(
    querySql(`
      select count(*) = 3
        and count(*) filter (where policy.polcmd = 'r') = 1
        and count(*) filter (where policy.polcmd = 'a') = 1
        and count(*) filter (where policy.polcmd = 'd') = 1
        and count(*) filter (where policy.polcmd in ('w', '*')) = 0
        and pg_catalog.bool_and(
          policy.polroles = array[owner.oid]::oid[]
        )
      from pg_catalog.pg_policy policy
      join pg_catalog.pg_class relation on relation.oid = policy.polrelid
      join pg_catalog.pg_namespace namespace
        on namespace.oid = relation.relnamespace
      cross join pg_catalog.pg_roles owner
      where namespace.nspname = 'expense_learning_private'
        and relation.relname = 'closed_week_promotion_batches'
        and owner.rolname = 'expense_learning_storage_owner';
    `) === "t",
    "P4B markers do not have exactly owner-only SELECT/INSERT/DELETE policies",
  );
  expect(
    querySql(`
      select relation.relrowsecurity
        and relation.relforcerowsecurity
        and not pg_catalog.has_table_privilege(
          'service_role',
          relation.oid,
          'SELECT,INSERT,UPDATE,DELETE'
        )
      from pg_catalog.pg_class relation
      join pg_catalog.pg_namespace namespace
        on namespace.oid = relation.relnamespace
      where namespace.nspname = 'expense_learning_private'
        and relation.relname = 'closed_week_promotion_batches';
    `) === "t",
    "P4B marker storage is not FORCE RLS and ACL protected",
  );
  expect(
    querySql(`
      select not exists (
        select 1
        from pg_catalog.pg_attribute attribute
        join pg_catalog.pg_class relation
          on relation.oid = attribute.attrelid
        join pg_catalog.pg_namespace namespace
          on namespace.oid = relation.relnamespace
        where namespace.nspname = 'expense_learning_private'
          and relation.relname = 'closed_week_supported_metrics'
          and attribute.attname = 'supporting_contributors'
          and attribute.attnum > 0
          and not attribute.attisdropped
      ) and exists (
        select 1
        from pg_catalog.pg_attribute attribute
        join pg_catalog.pg_class relation
          on relation.oid = attribute.attrelid
        join pg_catalog.pg_namespace namespace
          on namespace.oid = relation.relnamespace
        where namespace.nspname = 'expense_learning_private'
          and relation.relname = 'closed_week_supported_metrics'
          and attribute.attname = 'support_band'
          and attribute.attnum > 0
          and not attribute.attisdropped
      );
    `) === "t",
    "P4B retained an exact promoted support count",
  );
  expect(
    querySql(`
      select pg_catalog.bool_and(
        not pg_catalog.has_function_privilege(
          role.rolname,
          function.oid,
          'EXECUTE'
        )
      )
      from pg_catalog.pg_roles role
      cross join pg_catalog.pg_proc function
      join pg_catalog.pg_namespace namespace
        on namespace.oid = function.pronamespace
      where role.rolname = any (array[
        'anon',
        'authenticated',
        'service_role'
      ]::name[])
        and namespace.nspname = 'expense_learning_private'
        and function.proname in (
          'is_expense_learning_week_source_canonical_v1',
          'is_expense_learning_week_accumulator_consistent_v1',
          'reconcile_expense_learning_week_v1',
          'attempt_expense_learning_link_cleanup_v1',
          'run_expense_learning_retention_v1',
          'expense_learning_support_band_v1',
          'is_expense_learning_promotion_source_safe_v1',
          'run_expense_learning_promotion_v1'
        );
    `) === "t",
    "P4A private maintenance functions are executable by an API role",
  );
  expectInlineSqlFailure(
    "select public.purge_expense_learning_retention_v1();",
    "expense_learning_rpc_forbidden",
  );
  expectInlineSqlFailure(
    `set request.jwt.claims = '{}';
     select public.purge_expense_learning_retention_v1();`,
    "expense_learning_rpc_forbidden",
  );
}

async function testExpenseLearningP3SemanticRejection(admin, users) {
  const user = await createUser(admin, "learning_p3_semantic_rejection");
  users.push(user);
  await setExpenseLearningConsent(
    admin,
    user.id,
    true,
    "P3A semantic rejection grant",
  );
  const canonical = expenseLearningCanonicalContribution();
  const invalidContributions = [
    ["null schema version", { ...canonical, schemaVersion: null }],
    ["null structural group", { ...canonical, structuralArchetypeGroup: null }],
    [
      "null non-cross metric bucket",
      mutateExpenseLearningMetric(
        canonical,
        "LOCAL_DURATION",
        "NONE",
        "VALUE",
        null,
      ),
    ],
    [
      "candidate with abstention",
      mutateExpenseLearningMetric(
        canonical,
        "ABSTENTION_REASON",
        "NONE",
        "VALUE",
        "LOW_CONFIDENCE",
      ),
    ],
    [
      "local route with AI usage",
      mutateExpenseLearningMetric(
        canonical,
        "ROUTE_MODE",
        "NONE",
        "VALUE",
        "LOCAL_ONLY",
      ),
    ],
    [
      "unreadable candidate",
      mutateExpenseLearningMetric(
        canonical,
        "SOURCE_QUALITY",
        "NONE",
        "VALUE",
        "UNREADABLE",
      ),
    ],
    [
      "impossible field triple",
      mutateExpenseLearningMetric(
        canonical,
        "FIELD_VERDICT",
        "LOCAL_VS_HUMAN",
        "TOTAL_AMOUNT",
        "MISSING",
      ),
    ],
    [
      "corrected review without correction",
      mutateExpenseLearningMetric(
        canonical,
        "HUMAN_REVIEW",
        "NONE",
        "VALUE",
        "CORRECTED",
      ),
    ],
    [
      "incoherent math pair",
      mutateExpenseLearningMetric(
        canonical,
        "MATH_VERDICT",
        "NONE",
        "DOCUMENT_TOTAL",
        "MISMATCH",
      ),
    ],
    [
      "fabricated critical flag",
      mutateExpenseLearningMetric(
        canonical,
        "CRITICAL_FLAG",
        "NONE",
        "EXPENSE_ACCEPTED_THEN_REJECTED",
        "PRESENT",
      ),
    ],
  ];

  expect(
    querySqlAsLearningOwner(`
      select expense_learning_private.is_canonical_contribution_v1(
        '${sqlJson(canonical)}'::jsonb
      )
    `) === "t",
    "P3A SQL rejected the canonical semantic fixture",
  );

  for (const [label, contribution] of invalidContributions) {
    expect(
      querySqlAsLearningOwner(`
        select expense_learning_private.is_canonical_contribution_v1(
          '${sqlJson(contribution)}'::jsonb
        )
      `) === "f",
      `P3A SQL accepted ${label}`,
    );
    let stageRejected = false;
    try {
      querySqlAsLearningOwner(
        stageExpenseLearningContributionSql(
          user.id,
          randomExpenseLearningHex(),
          randomExpenseLearningHex(),
          contribution,
        ),
      );
    } catch (error) {
      stageRejected = error.message.includes(
        "expense_learning_ingestion_invalid_argument",
      );
    }
    expect(stageRejected, `P3A stage did not reject ${label}`);
    expect(
      expenseLearningP3RuntimeRowCount() === 0,
      `P3A semantic rejection left rows for ${label}`,
    );
  }

  const { error } = await admin.auth.admin.deleteUser(user.id);
  expect(!error, "could not delete P3A semantic rejection user");
}

async function testExpenseLearningP3Behavior(admin, users) {
  const userA = await createUser(admin, "learning_p3_behavior_a");
  const userB = await createUser(admin, "learning_p3_behavior_b");
  const conflictUser = await createUser(admin, "learning_p3_conflict");
  users.push(userA, userB, conflictUser);
  await Promise.all([
    setExpenseLearningConsent(admin, userA.id, true, "P3A grant A"),
    setExpenseLearningConsent(admin, userB.id, true, "P3A grant B"),
    setExpenseLearningConsent(
      admin,
      conflictUser.id,
      true,
      "P3A conflict grant",
    ),
  ]);

  const claimA = randomExpenseLearningHex();
  const claimB = randomExpenseLearningHex();
  const weekHmacA = randomExpenseLearningHex();
  const weekHmacB = randomExpenseLearningHex();
  const weekHmacConflict = randomExpenseLearningHex();
  expect(userA.id !== userB.id, "P3A synthetic users were not distinct");
  expect(weekHmacA !== weekHmacB, "P3A synthetic HMACs were not distinct");
  const accepted = await Promise.all([
    querySqlAsync(stageExpenseLearningSql(userA.id, claimA, weekHmacA), {
      learningOwner: true,
    }),
    querySqlAsync(stageExpenseLearningSql(userB.id, claimB, weekHmacB), {
      learningOwner: true,
    }),
  ]);
  expect(
    accepted.every((result) => result === "ACCEPTED"),
    "concurrent P3A submissions were not accepted",
  );
  console.log("  P3A behavior: initial contributors accepted");
  expect(
    expenseLearningP3TableCounts() === "2,2,134,67,0,2",
    "two contributors did not produce bounded per-coordinate support",
  );
  expectExpenseLearningP3Integrity(
    "concurrent submissions desynchronized accumulators and memberships",
  );

  const beforeReplay = expenseLearningP3TableCounts();
  expect(
    stageExpenseLearning(userA.id, claimA, weekHmacA) === "REPLAYED",
    "same-link replay was not idempotent",
  );
  console.log("  P3A behavior: same-link replay confirmed");
  expect(
    expenseLearningP3TableCounts() === beforeReplay,
    "same-link replay changed P3A storage",
  );

  let conflictRejected = false;
  try {
    stageExpenseLearning(conflictUser.id, claimA, weekHmacConflict);
  } catch (error) {
    conflictRejected = error.message.includes(
      "expense_learning_ingestion_claim_conflict",
    );
  }
  expect(conflictRejected, "cross-link claim conflict did not fail closed");
  console.log("  P3A behavior: cross-link claim rejected");
  expect(
    expenseLearningP3TableCounts() === beforeReplay &&
      querySql(`
        select count(*) = 0
        from expense_learning_private.contributor_revocation_links
        where user_id = '${conflictUser.id}'::uuid;
      `) === "t",
    "cross-link claim conflict left a link or raw mutation",
  );

  const revokeAndSubmit = await Promise.all([
    setExpenseLearningConsent(admin, userA.id, false, "P3A revoke A"),
    querySqlAsync(
      stageExpenseLearningSql(userB.id, randomExpenseLearningHex(), weekHmacB),
      { learningOwner: true },
    ),
  ]);
  expect(
    revokeAndSubmit[1] === "ACCEPTED",
    "concurrent revoke and unrelated submit did not serialize",
  );
  console.log("  P3A behavior: revoke/submit race serialized");
  expect(
    expenseLearningP3TableCounts() === "2,1,67,67,0,1",
    "revoke did not purge only the revoked contributor",
  );
  expectExpenseLearningP3Integrity(
    "revoke/submit race desynchronized accumulators and memberships",
  );

  await setExpenseLearningConsent(admin, userA.id, true, "P3A regrant A");
  console.log("  P3A behavior: contributor regranted for cooldown check");
  expect(
    stageExpenseLearning(
      userA.id,
      randomExpenseLearningHex(),
      randomExpenseLearningHex(),
    ) === "WITHDRAWAL_COOLDOWN",
    "same-week regrant bypassed withdrawal cooldown",
  );
  expect(
    expenseLearningP3TableCounts() === "2,1,67,67,0,1",
    "withdrawal cooldown changed P3A storage",
  );

  const { error: deleteBError } = await admin.auth.admin.deleteUser(userB.id);
  expect(!deleteBError, "could not delete P3A behavior user B");
  expect(
    expenseLearningP3RuntimeRowCount() === 0,
    "account deletion did not purge all separable P3A rows",
  );
  expectExpenseLearningP3Integrity(
    "account deletion desynchronized accumulators and memberships",
  );
  for (const user of [userA, conflictUser]) {
    const { error } = await admin.auth.admin.deleteUser(user.id);
    expect(!error, `could not delete P3A behavior user ${user.id}`);
  }
}

async function testExpenseLearningP3ClaimRace(admin, users) {
  const userA = await createUser(admin, "learning_p3_claim_race_a");
  const userB = await createUser(admin, "learning_p3_claim_race_b");
  users.push(userA, userB);
  await Promise.all([
    setExpenseLearningConsent(admin, userA.id, true, "P3A race grant A"),
    setExpenseLearningConsent(admin, userB.id, true, "P3A race grant B"),
  ]);

  const sharedClaim = randomExpenseLearningHex();
  const results = await Promise.allSettled([
    querySqlAsync(
      stageExpenseLearningSql(
        userA.id,
        sharedClaim,
        randomExpenseLearningHex(),
      ),
      { learningOwner: true },
    ),
    querySqlAsync(
      stageExpenseLearningSql(
        userB.id,
        sharedClaim,
        randomExpenseLearningHex(),
      ),
      { learningOwner: true },
    ),
  ]);
  expect(
    results.filter(
      (result) => result.status === "fulfilled" && result.value === "ACCEPTED",
    ).length === 1 &&
      results.filter(
        (result) =>
          result.status === "rejected" &&
          result.reason.message.includes(
            "expense_learning_ingestion_claim_conflict",
          ),
      ).length === 1,
    "same-token cross-account race did not accept exactly one contributor",
  );
  expect(
    expenseLearningP3TableCounts() === "1,1,67,67,0,1",
    "same-token race left a losing link or partial raw rows",
  );
  expectExpenseLearningP3Integrity(
    "same-token race desynchronized accumulators and memberships",
  );

  const deletions = await Promise.all(
    [userA, userB].map((user) => admin.auth.admin.deleteUser(user.id)),
  );
  expect(
    deletions.every(({ error }) => !error),
    "parallel P3A account purges failed",
  );
  expect(
    expenseLearningP3RuntimeRowCount() === 0,
    "parallel P3A account purges left separable rows",
  );
}

async function runExpenseLearningDeleteRace(
  admin,
  users,
  { existingLink, submitFirst },
) {
  const label = `learning_p3_delete_${existingLink ? "existing" : "new"}_${submitFirst ? "submit" : "delete"}`;
  const user = await createUser(admin, label);
  users.push(user);
  await setExpenseLearningConsent(admin, user.id, true, `${label} grant`);
  const weekHmac = randomExpenseLearningHex();
  if (existingLink) {
    expect(
      stageExpenseLearning(user.id, randomExpenseLearningHex(), weekHmac) ===
        "ACCEPTED",
      `${label} could not seed the existing link`,
    );
  }

  if (submitFirst) {
    const applicationName = `${label}_submit`;
    const submit = querySqlAsync(
      `
        set local application_name = '${applicationName}';
        ${stageExpenseLearningSql(
          user.id,
          randomExpenseLearningHex(),
          weekHmac,
          "; select pg_catalog.pg_sleep(0.4)",
        )}
      `,
      { learningOwner: true },
    );
    await waitForSqlSessionSleep(
      applicationName,
      `${label} submit did not reach the lock barrier`,
    );
    const deletion = admin.auth.admin.deleteUser(user.id);
    const [submitResult, deleteResult] = await Promise.all([submit, deletion]);
    expect(submitResult === "ACCEPTED", `${label} submit did not complete`);
    expect(!deleteResult.error, `${label} account deletion failed`);
  } else {
    const applicationName = `${label}_delete`;
    const deletion = querySqlAsync(`
      begin;
      set local application_name = '${applicationName}';
      delete from auth.users where id = '${user.id}'::uuid;
      select pg_catalog.pg_sleep(0.4);
      commit;
    `);
    await waitForSqlSessionSleep(
      applicationName,
      `${label} delete did not reach the lock barrier`,
    );
    const submit = querySqlAsync(
      stageExpenseLearningSql(user.id, randomExpenseLearningHex(), weekHmac),
      { learningOwner: true },
    );
    const [deleteResult, submitResult] = await Promise.allSettled([
      deletion,
      submit,
    ]);
    expect(deleteResult.status === "fulfilled", `${label} delete deadlocked`);
    expect(
      submitResult.status === "rejected" ||
        submitResult.value === "NOT_CONSENTED",
      `${label} submit survived an account deletion`,
    );
  }

  expect(
    expenseLearningP3RuntimeRowCount() === 0 &&
      expenseLearningConsentRowCount(user.id) === 0,
    `${label} left identity-linked or separable rows`,
  );
  expectExpenseLearningP3Integrity(
    `${label} desynchronized accumulators and memberships`,
  );
}

async function testExpenseLearningP3AccountDeleteRaces(admin, users) {
  for (const existingLink of [false, true]) {
    for (const submitFirst of [true, false]) {
      await runExpenseLearningDeleteRace(admin, users, {
        existingLink,
        submitFirst,
      });
    }
  }
}

async function testExpenseLearningP4HistoricalDebtBoundary(admin, users) {
  const user = await createUser(admin, "learning_p4_history_boundary");
  users.push(user);
  const previousWeekHmac = randomExpenseLearningHex();
  const nextWeekHmac = randomExpenseLearningHex();

  applyInlineSql(`
    begin;
    set local role expense_learning_storage_owner;

    insert into expense_learning_private.learning_consent_decisions (
      user_id,
      schema_version,
      notice_version,
      purpose,
      privacy_policy_version,
      granted,
      decided_at
    ) values
      (
        '${user.id}'::uuid,
        'expense-engine-learning-consent.v1',
        'expense-learning-notice.v1',
        'IMPROVE_LOCAL_EXPENSE_READER',
        '2026-07-21',
        false,
        timestamptz '2026-07-19 23:59:59+00'
      ),
      (
        '${user.id}'::uuid,
        'expense-engine-learning-consent.v1',
        'expense-learning-notice.v1',
        'IMPROVE_LOCAL_EXPENSE_READER',
        '2026-07-21',
        true,
        timestamptz '2026-07-20 00:00:01+00'
      );

    insert into expense_learning_private.contributor_revocation_links (
      user_id,
      week_start,
      contributor_week_hmac,
      expires_at
    ) values
      (
        '${user.id}'::uuid,
        date '2026-07-13',
        pg_catalog.decode('${previousWeekHmac}', 'hex'),
        timestamptz '2026-08-17 00:00:00+00'
      ),
      (
        '${user.id}'::uuid,
        date '2026-07-20',
        pg_catalog.decode('${nextWeekHmac}', 'hex'),
        timestamptz '2026-08-24 00:00:00+00'
      );

    do $p4_history$
    begin
      if expense_learning_private.is_expense_learning_link_cleanup_eligible_v1(
        '${user.id}'::uuid,
        date '2026-07-13',
        timestamptz '2026-07-20 12:00:00+00'
      ) is distinct from true then
        raise exception 'expense_learning_history_previous_week_hidden';
      end if;

      if expense_learning_private.is_expense_learning_link_cleanup_eligible_v1(
        '${user.id}'::uuid,
        date '2026-07-20',
        timestamptz '2026-07-20 12:00:00+00'
      ) is distinct from false then
        raise exception 'expense_learning_history_next_week_captured';
      end if;
    end;
    $p4_history$;

    rollback;
  `);

  const { error } = await admin.auth.admin.deleteUser(user.id);
  expect(!error, "could not delete P4A historical boundary user");
}

async function testExpenseLearningP4MultiArchetype(admin, users) {
  const user = await createUser(admin, "learning_p4_multi_archetype");
  users.push(user);
  const weekHmac = randomExpenseLearningHex();
  await setExpenseLearningConsent(admin, user.id, true, "P4A multi grant");
  expect(
    stageExpenseLearning(user.id, randomExpenseLearningHex(), weekHmac) ===
      "ACCEPTED",
    "P4A TABLE contribution was not accepted",
  );
  expect(
    querySqlAsLearningOwner(
      stageExpenseLearningContributionSql(
        user.id,
        randomExpenseLearningHex(),
        weekHmac,
        expenseLearningCanonicalContribution("SUMMARY"),
      ),
    ) === "ACCEPTED",
    "P4A SUMMARY contribution was not accepted",
  );
  expect(
    expenseLearningP3TableCounts() === "2,1,134,134,0,1",
    "P4A did not retain two complete structural groups",
  );
  expect(
    querySqlAsLearningOwner(`
      select count(*) = 1
      from (
        select link.user_id
        from expense_learning_private.contributor_revocation_links as link
        where link.user_id = '${user.id}'::uuid
        for update skip locked
      ) as locked_link;
    `) === "t",
    "P4A owner could not acquire the revocation-link row lock",
  );
  expectInlineSqlFailure(
    `begin;
     set local role expense_learning_storage_owner;
     update expense_learning_private.contributor_revocation_links
     set expires_at = expires_at
     where user_id = '${user.id}'::uuid;
     rollback;`,
    "new row violates row-level security policy",
  );

  await setExpenseLearningConsent(admin, user.id, false, "P4A multi revoke");
  expect(
    expenseLearningP3RuntimeRowCount() === 0,
    "P4A treated a complete multi-archetype source as corruption",
  );
  const { error } = await admin.auth.admin.deleteUser(user.id);
  expect(!error, "could not delete P4A multi-archetype user");

  const ttlUser = await createUser(admin, "learning_p4_multi_ttl");
  users.push(ttlUser);
  const ttlWeekHmac = randomExpenseLearningHex();
  await setExpenseLearningConsent(admin, ttlUser.id, true, "P4A multi TTL grant");
  expect(
    stageExpenseLearning(
      ttlUser.id,
      randomExpenseLearningHex(),
      ttlWeekHmac,
    ) === "ACCEPTED" &&
      querySqlAsLearningOwner(
        stageExpenseLearningContributionSql(
          ttlUser.id,
          randomExpenseLearningHex(),
          ttlWeekHmac,
          expenseLearningCanonicalContribution("SUMMARY"),
        ),
      ) === "ACCEPTED",
    "P4A multi-archetype TTL fixture was not accepted",
  );
  expect(
    querySqlAsLearningOwner(`
      select expense_learning_private.run_expense_learning_retention_v1(
        pg_catalog.clock_timestamp() + interval '36 days'
      );
    `) === "PURGED" && expenseLearningP3RuntimeRowCount() === 0,
    "P4A multi-archetype TTL purge failed",
  );
  const { error: ttlDeleteError } = await admin.auth.admin.deleteUser(ttlUser.id);
  expect(!ttlDeleteError, "could not delete P4A multi-archetype TTL user");

  const cascadeUser = await createUser(admin, "learning_p4_multi_cascade");
  users.push(cascadeUser);
  const cascadeWeekHmac = randomExpenseLearningHex();
  await setExpenseLearningConsent(
    admin,
    cascadeUser.id,
    true,
    "P4A multi cascade grant",
  );
  expect(
    stageExpenseLearning(
      cascadeUser.id,
      randomExpenseLearningHex(),
      cascadeWeekHmac,
    ) === "ACCEPTED" &&
      querySqlAsLearningOwner(
        stageExpenseLearningContributionSql(
          cascadeUser.id,
          randomExpenseLearningHex(),
          cascadeWeekHmac,
          expenseLearningCanonicalContribution("SUMMARY"),
        ),
      ) === "ACCEPTED",
    "P4A multi-archetype cascade fixture was not accepted",
  );
  const { error: cascadeDeleteError } =
    await admin.auth.admin.deleteUser(cascadeUser.id);
  expect(
    !cascadeDeleteError && expenseLearningP3RuntimeRowCount() === 0,
    "P4A multi-archetype account deletion left separable raw",
  );
}

async function testExpenseLearningP4SemanticSourceGate(admin, users) {
  const user = await createUser(admin, "learning_p4_semantic_source");
  users.push(user);
  const weekHmac = randomExpenseLearningHex();
  await setExpenseLearningConsent(admin, user.id, true, "P4A semantic grant");
  expect(
    stageExpenseLearning(user.id, randomExpenseLearningHex(), weekHmac) ===
      "ACCEPTED",
    "P4A semantic fixture was not accepted",
  );
  applyInlineSql(`
    update expense_learning_private.accumulator_memberships
    set bucket_value = 'FAILED'
    where metric_family = 'LOCAL_OUTCOME'
      and comparison_scope = 'NONE'
      and metric_key = 'VALUE';
    update expense_learning_private.protected_accumulators
    set bucket_value = 'FAILED'
    where metric_family = 'LOCAL_OUTCOME'
      and comparison_scope = 'NONE'
      and metric_key = 'VALUE';
  `);

  await setExpenseLearningConsent(
    admin,
    user.id,
    false,
    "P4A semantic revoke",
  );
  const rejected = await admin.rpc("purge_expense_learning_retention_v1");
  expect(
    opAllowed(rejected) && rejected.data === "RETRY_REQUIRED" &&
      querySql(`
        select count(*) = 1
        from expense_learning_private.contributor_revocation_links
        where user_id = '${user.id}'::uuid;
      `) === "t",
    "P4A repaired a vocabulary-valid but semantically impossible source",
  );

  applyInlineSql(`
    update expense_learning_private.accumulator_memberships
    set bucket_value = 'CANDIDATE'
    where metric_family = 'LOCAL_OUTCOME'
      and comparison_scope = 'NONE'
      and metric_key = 'VALUE';
    update expense_learning_private.protected_accumulators
    set bucket_value = 'CANDIDATE'
    where metric_family = 'LOCAL_OUTCOME'
      and comparison_scope = 'NONE'
      and metric_key = 'VALUE';
  `);
  const repaired = await admin.rpc("purge_expense_learning_retention_v1");
  expect(
    opAllowed(repaired),
    "P4A semantic source retry RPC failed",
  );
  expect(
    repaired.data === "PURGED",
    `P4A semantic source retry returned ${String(repaired.data)}`,
  );
  expect(
    expenseLearningP3RuntimeRowCount() === 0,
    "P4A semantic source retry left separable raw",
  );
  const { error } = await admin.auth.admin.deleteUser(user.id);
  expect(!error, "could not delete P4A semantic source user");

  const splitUser = await createUser(admin, "learning_p4_split_group");
  users.push(splitUser);
  const splitWeekHmac = randomExpenseLearningHex();
  await setExpenseLearningConsent(
    admin,
    splitUser.id,
    true,
    "P4A split-group grant",
  );
  expect(
    stageExpenseLearning(
      splitUser.id,
      randomExpenseLearningHex(),
      splitWeekHmac,
    ) === "ACCEPTED",
    "P4A split-group fixture was not accepted",
  );
  applyInlineSql(`
    update expense_learning_private.accumulator_memberships as membership
    set
      structural_archetype_group = 'SUMMARY',
      contributor_coordinate_hmac =
        expense_learning_private.expense_learning_coordinate_hmac_v1(
          pg_catalog.decode('${splitWeekHmac}', 'hex'),
          membership.contribution_schema_version,
          membership.observation_schema_version,
          membership.engine_version,
          membership.privacy_policy_version,
          membership.week_start,
          'SUMMARY',
          membership.metric_family,
          membership.comparison_scope,
          membership.metric_key
        )
    where membership.metric_family = 'LOCAL_DURATION'
      and membership.comparison_scope = 'NONE'
      and membership.metric_key = 'VALUE';
    update expense_learning_private.protected_accumulators
    set structural_archetype_group = 'SUMMARY'
    where metric_family = 'LOCAL_DURATION'
      and comparison_scope = 'NONE'
      and metric_key = 'VALUE';
  `);
  await setExpenseLearningConsent(
    admin,
    splitUser.id,
    false,
    "P4A split-group revoke",
  );
  const splitRejected = await admin.rpc("purge_expense_learning_retention_v1");
  expect(
    opAllowed(splitRejected) && splitRejected.data === "RETRY_REQUIRED" &&
      querySql(`
        select count(*) = 1
        from expense_learning_private.contributor_revocation_links
        where user_id = '${splitUser.id}'::uuid;
      `) === "t",
    "P4A repaired a source split across structural groups",
  );
  applyInlineSql(`
    update expense_learning_private.accumulator_memberships as membership
    set
      structural_archetype_group = 'TABLE',
      contributor_coordinate_hmac =
        expense_learning_private.expense_learning_coordinate_hmac_v1(
          pg_catalog.decode('${splitWeekHmac}', 'hex'),
          membership.contribution_schema_version,
          membership.observation_schema_version,
          membership.engine_version,
          membership.privacy_policy_version,
          membership.week_start,
          'TABLE',
          membership.metric_family,
          membership.comparison_scope,
          membership.metric_key
        )
    where membership.structural_archetype_group = 'SUMMARY';
    update expense_learning_private.protected_accumulators
    set structural_archetype_group = 'TABLE'
    where structural_archetype_group = 'SUMMARY';
  `);
  const splitRepaired = await admin.rpc("purge_expense_learning_retention_v1");
  expect(
    opAllowed(splitRepaired) && splitRepaired.data === "PURGED" &&
      expenseLearningP3RuntimeRowCount() === 0,
    "P4A split-group source did not recover after exact repair",
  );
  const { error: splitDeleteError } =
    await admin.auth.admin.deleteUser(splitUser.id);
  expect(!splitDeleteError, "could not delete P4A split-group user");
}

async function testExpenseLearningP4LateCandidateSnapshot(admin, users) {
  const firstUser = await createUser(admin, "learning_p4_snapshot_first");
  const lateUser = await createUser(admin, "learning_p4_snapshot_late");
  users.push(firstUser, lateUser);
  await Promise.all([
    setExpenseLearningConsent(admin, firstUser.id, true, "P4A snapshot A"),
    setExpenseLearningConsent(admin, lateUser.id, true, "P4A snapshot B"),
  ]);
  expect(
    stageExpenseLearning(
      firstUser.id,
      randomExpenseLearningHex(),
      randomExpenseLearningHex(),
    ) === "ACCEPTED" &&
      stageExpenseLearning(
        lateUser.id,
        randomExpenseLearningHex(),
        randomExpenseLearningHex(),
      ) === "ACCEPTED",
    "P4A late-candidate fixtures were not accepted",
  );
  applyInlineSql(`
    update expense_learning_private.protected_accumulators
    set supporting_contributors = 3;
  `);
  await setExpenseLearningConsent(
    admin,
    firstUser.id,
    false,
    "P4A snapshot first revoke",
  );

  const blocker = querySqlAsync(
    `
      select pg_catalog.pg_advisory_xact_lock(
        pg_catalog.hashtextextended(
          'expense-learning-consent-v1:${firstUser.id}',
          0
        )
      );
      select pg_catalog.pg_sleep(0.4);
    `,
    { learningOwner: true },
  );
  await delay(50);
  const firstPass = querySqlAsync(
    `
      set local application_name = 'phase1_p4_late_candidate';
      select expense_learning_private.run_expense_learning_retention_v1(
        pg_catalog.clock_timestamp()
      );
    `,
    { learningOwner: true },
  );

  let waitingOnFrozenCandidate = false;
  for (let attempt = 0; attempt < 40; attempt += 1) {
    waitingOnFrozenCandidate =
      querySql(`
        select exists (
          select 1
          from pg_catalog.pg_stat_activity
          where application_name = 'phase1_p4_late_candidate'
            and wait_event_type = 'Lock'
            and wait_event = 'advisory'
        );
      `) === "t";
    if (waitingOnFrozenCandidate) break;
    await delay(25);
  }
  expect(
    waitingOnFrozenCandidate,
    "P4A late-candidate barrier did not freeze the initial snapshot",
  );
  await setExpenseLearningConsent(
    admin,
    lateUser.id,
    false,
    "P4A snapshot late revoke",
  );
  await blocker;
  expect(
    (await firstPass) === "RETRY_REQUIRED",
    "P4A first snapshot did not report the newly visible debt",
  );
  expect(
    querySql(`
      select
        count(*) filter (where user_id = '${firstUser.id}'::uuid) = 0
        and count(*) filter (where user_id = '${lateUser.id}'::uuid) = 1
      from expense_learning_private.contributor_revocation_links;
    `) === "t",
    "P4A processed a late candidate without its advisory lock",
  );
  const secondPass = await admin.rpc("purge_expense_learning_retention_v1");
  expect(
    opAllowed(secondPass) && secondPass.data === "PURGED" &&
      expenseLearningP3RuntimeRowCount() === 0,
    "P4A second snapshot did not clear the late candidate",
  );

  for (const user of [firstUser, lateUser]) {
    const { error } = await admin.auth.admin.deleteUser(user.id);
    expect(!error, "could not delete P4A snapshot user");
  }
}

async function runExpenseLearningP4PurgeStageRace(
  admin,
  users,
  purgeFirst,
) {
  const label = `learning_p4_purge_stage_${purgeFirst ? "purge" : "stage"}`;
  const user = await createUser(admin, label);
  users.push(user);
  const weekHmac = randomExpenseLearningHex();
  await setExpenseLearningConsent(admin, user.id, true, `${label} grant`);
  expect(
    stageExpenseLearning(user.id, randomExpenseLearningHex(), weekHmac) ===
      "ACCEPTED",
    `${label} could not seed raw`,
  );
  applyInlineSql(`
    update expense_learning_private.protected_accumulators
    set supporting_contributors = 2;
  `);
  await setExpenseLearningConsent(admin, user.id, false, `${label} revoke`);
  await setExpenseLearningConsent(admin, user.id, true, `${label} regrant`);

  const userLockAndPause = `
    select pg_catalog.pg_advisory_xact_lock(
      pg_catalog.hashtextextended(
        'expense-learning-consent-v1:${user.id}',
        0
      )
    );
    select pg_catalog.pg_sleep(0.2);
  `;
  const purgeSql = `
    ${purgeFirst ? userLockAndPause : ""}
    select expense_learning_private.run_expense_learning_retention_v1(
      pg_catalog.clock_timestamp()
    );
  `;
  const stageSql = `
    ${purgeFirst ? "" : userLockAndPause}
    ${stageExpenseLearningSql(
      user.id,
      randomExpenseLearningHex(),
      weekHmac,
    )}
  `;

  const first = querySqlAsync(purgeFirst ? purgeSql : stageSql, {
    learningOwner: true,
  });
  await delay(50);
  const second = querySqlAsync(purgeFirst ? stageSql : purgeSql, {
    learningOwner: true,
  });
  const [firstResult, secondResult] = await Promise.all([first, second]);
  const purgeResult = purgeFirst ? firstResult : secondResult;
  const stageResult = purgeFirst ? secondResult : firstResult;
  expect(
    purgeResult === "PURGED" && stageResult === "WITHDRAWAL_COOLDOWN",
    `${label} did not serialize purge and stage`,
  );
  expect(
    expenseLearningP3RuntimeRowCount() === 0,
    `${label} left separable raw`,
  );
  expectExpenseLearningP3Integrity(
    `${label} desynchronized accumulators and memberships`,
  );

  const { error } = await admin.auth.admin.deleteUser(user.id);
  expect(!error, `could not delete ${label} user`);
}

async function testExpenseLearningP4PurgeStageRaces(admin, users) {
  await runExpenseLearningP4PurgeStageRace(admin, users, true);
  await runExpenseLearningP4PurgeStageRace(admin, users, false);
}

async function runExpenseLearningP4PurgeDeleteRace(
  admin,
  users,
  purgeFirst,
) {
  const label = `learning_p4_purge_delete_${purgeFirst ? "purge" : "delete"}`;
  const user = await createUser(admin, label);
  users.push(user);
  await setExpenseLearningConsent(admin, user.id, true, `${label} grant`);
  const currentWeekHmac = randomExpenseLearningHex();
  expect(
    stageExpenseLearning(
      user.id,
      randomExpenseLearningHex(),
      currentWeekHmac,
    ) === "ACCEPTED",
    `${label} could not seed raw`,
  );
  const previousWeekHmac = randomExpenseLearningHex();
  applyInlineSql(`
    with current_link as (
      select link.week_start
      from expense_learning_private.contributor_revocation_links as link
      where link.user_id = '${user.id}'::uuid
    )
    insert into expense_learning_private.contributor_revocation_links (
      user_id,
      week_start,
      contributor_week_hmac,
      expires_at
    )
    select
      '${user.id}'::uuid,
      current_link.week_start - 7,
      pg_catalog.decode('${previousWeekHmac}', 'hex'),
      ((current_link.week_start - 7)::timestamp at time zone 'UTC') +
        interval '35 days'
    from current_link;

    with current_link as (
      select link.week_start
      from expense_learning_private.contributor_revocation_links as link
      where link.user_id = '${user.id}'::uuid
      order by link.week_start desc
      limit 1
    )
    insert into expense_learning_private.accumulator_memberships (
      contribution_schema_version,
      observation_schema_version,
      engine_version,
      privacy_policy_version,
      week_start,
      structural_archetype_group,
      metric_family,
      comparison_scope,
      metric_key,
      bucket_kind,
      bucket_value,
      contributor_coordinate_hmac,
      expires_at
    )
    select
      membership.contribution_schema_version,
      membership.observation_schema_version,
      membership.engine_version,
      membership.privacy_policy_version,
      current_link.week_start - 7,
      membership.structural_archetype_group,
      membership.metric_family,
      membership.comparison_scope,
      membership.metric_key,
      membership.bucket_kind,
      membership.bucket_value,
      expense_learning_private.expense_learning_coordinate_hmac_v1(
        pg_catalog.decode('${previousWeekHmac}', 'hex'),
        membership.contribution_schema_version,
        membership.observation_schema_version,
        membership.engine_version,
        membership.privacy_policy_version,
        current_link.week_start - 7,
        membership.structural_archetype_group,
        membership.metric_family,
        membership.comparison_scope,
        membership.metric_key
      ),
      ((current_link.week_start - 7)::timestamp at time zone 'UTC') +
        interval '35 days'
    from expense_learning_private.accumulator_memberships as membership
    cross join current_link
    where membership.week_start = current_link.week_start;

    with current_link as (
      select link.week_start
      from expense_learning_private.contributor_revocation_links as link
      where link.user_id = '${user.id}'::uuid
      order by link.week_start desc
      limit 1
    )
    insert into expense_learning_private.protected_accumulators (
      contribution_schema_version,
      observation_schema_version,
      engine_version,
      privacy_policy_version,
      week_start,
      structural_archetype_group,
      metric_family,
      comparison_scope,
      metric_key,
      bucket_kind,
      bucket_value,
      supporting_contributors,
      expires_at
    )
    select
      accumulator.contribution_schema_version,
      accumulator.observation_schema_version,
      accumulator.engine_version,
      accumulator.privacy_policy_version,
      current_link.week_start - 7,
      accumulator.structural_archetype_group,
      accumulator.metric_family,
      accumulator.comparison_scope,
      accumulator.metric_key,
      accumulator.bucket_kind,
      accumulator.bucket_value,
      accumulator.supporting_contributors,
      ((current_link.week_start - 7)::timestamp at time zone 'UTC') +
        interval '35 days'
    from expense_learning_private.protected_accumulators as accumulator
    cross join current_link
    where accumulator.week_start = current_link.week_start;
  `);
  expect(
    querySql(`
      select
        (select count(*)
         from expense_learning_private.contributor_revocation_links
         where user_id = '${user.id}'::uuid) = 2
        and (select count(*)
             from expense_learning_private.accumulator_memberships) = 134
        and (select count(*)
             from expense_learning_private.protected_accumulators) = 134;
    `) === "t",
    `${label} did not create two complete canonical weeks`,
  );

  const blocker = querySqlAsync(
    `
      select pg_catalog.pg_advisory_xact_lock(
        pg_catalog.hashtextextended(
          'expense-learning-accumulator-mutation-v1',
          0
        )
      );
      select pg_catalog.pg_sleep(0.4);
    `,
    { learningOwner: true },
  );
  await delay(50);

  const purge = () => querySqlAsync(
    `
      set local application_name = '${label}_purge';
      select expense_learning_private.run_expense_learning_retention_v1(
        pg_catalog.clock_timestamp() + interval '36 days'
      );
    `,
    { learningOwner: true },
  );
  const deletion = () => querySqlAsync(`
    begin;
    set local application_name = '${label}_delete';
    delete from auth.users where id = '${user.id}'::uuid;
    commit;
  `);

  const first = purgeFirst ? purge() : deletion();
  await delay(75);
  const second = purgeFirst ? deletion() : purge();
  const [firstResult, secondResult] = await Promise.all([first, second]);
  await blocker;
  const purgeResult = purgeFirst ? firstResult : secondResult;
  expect(
    ["PURGED", "RETRY_REQUIRED"].includes(purgeResult),
    `${label} returned an invalid retention state`,
  );
  if (purgeResult === "RETRY_REQUIRED") {
    const retry = await admin.rpc("purge_expense_learning_retention_v1");
    expect(
      opAllowed(retry) && retry.data === "PURGED",
      `${label} did not converge on the retry pass`,
    );
  }
  expect(
    expenseLearningP3RuntimeRowCount() === 0 &&
      querySql(`select count(*) = 0 from auth.users where id = '${user.id}'::uuid;`) ===
        "t",
    `${label} deadlocked or left identity-linked raw`,
  );
}

async function testExpenseLearningP4PurgeDeleteRaces(admin, users) {
  await runExpenseLearningP4PurgeDeleteRace(admin, users, true);
  await runExpenseLearningP4PurgeDeleteRace(admin, users, false);
}

async function testExpenseLearningP4RepairAndRetention(admin, users) {
  await testExpenseLearningP4HistoricalDebtBoundary(admin, users);
  await testExpenseLearningP4MultiArchetype(admin, users);
  await testExpenseLearningP4SemanticSourceGate(admin, users);
  await testExpenseLearningP4LateCandidateSnapshot(admin, users);
  await testExpenseLearningP4PurgeStageRaces(admin, users);
  await testExpenseLearningP4PurgeDeleteRaces(admin, users);
  const repairUser = await createUser(admin, "learning_p4_repair");
  users.push(repairUser);
  await setExpenseLearningConsent(
    admin,
    repairUser.id,
    true,
    "P4A repair grant",
  );
  const repairWeekHmac = randomExpenseLearningHex();
  expect(
    stageExpenseLearning(
      repairUser.id,
      randomExpenseLearningHex(),
      repairWeekHmac,
    ) === "ACCEPTED",
    "P4A repair fixture was not accepted",
  );
  applyInlineSql(`
    update expense_learning_private.protected_accumulators
    set supporting_contributors = 2;
  `);

  await setExpenseLearningConsent(
    admin,
    repairUser.id,
    false,
    "P4A repairable revoke",
  );
  expect(
    expenseLearningP3TableCounts() === "1,1,67,67,0,1",
    "P4A repairable revoke did not preserve raw for maintenance retry",
  );
  expect(
    stageExpenseLearning(
      repairUser.id,
      randomExpenseLearningHex(),
      repairWeekHmac,
    ) === "NOT_CONSENTED",
    "P4A REVOKED ledger did not block a future contribution",
  );
  const repaired = await admin.rpc("purge_expense_learning_retention_v1");
  expect(
    opAllowed(repaired) && repaired.data === "PURGED",
    "P4A did not repair and purge a derived accumulator",
  );
  expect(
    expenseLearningP3RuntimeRowCount() === 0,
    "P4A repaired purge left separable raw",
  );
  const idempotent = await admin.rpc("purge_expense_learning_retention_v1");
  expect(
    opAllowed(idempotent) && idempotent.data === "PURGED",
    "P4A empty retry was not idempotent",
  );
  const { error: repairDeleteError } =
    await admin.auth.admin.deleteUser(repairUser.id);
  expect(!repairDeleteError, "could not delete P4A repair user");

  const corruptUser = await createUser(admin, "learning_p4_corrupt");
  const healthyUser = await createUser(admin, "learning_p4_healthy");
  users.push(corruptUser, healthyUser);
  await Promise.all([
    setExpenseLearningConsent(
      admin,
      corruptUser.id,
      true,
      "P4A corrupt grant",
    ),
    setExpenseLearningConsent(
      admin,
      healthyUser.id,
      true,
      "P4A healthy grant",
    ),
  ]);
  const corruptWeekHmac = randomExpenseLearningHex();
  const healthyWeekHmac = randomExpenseLearningHex();
  expect(
    stageExpenseLearning(
      corruptUser.id,
      randomExpenseLearningHex(),
      corruptWeekHmac,
    ) === "ACCEPTED" &&
      stageExpenseLearning(
        healthyUser.id,
        randomExpenseLearningHex(),
        healthyWeekHmac,
      ) === "ACCEPTED",
    "P4A mixed corruption fixtures were not accepted",
  );

  const corruptMembershipHmac = randomExpenseLearningHex();
  const corruptedMembership = querySql(`
    with target as (
      select membership.ctid,
        pg_catalog.encode(
          membership.contributor_coordinate_hmac,
          'hex'
        ) as original_hmac
      from expense_learning_private.accumulator_memberships as membership
      join expense_learning_private.contributor_revocation_links as link
        on link.user_id = '${corruptUser.id}'::uuid
       and link.week_start = membership.week_start
      where membership.contributor_coordinate_hmac =
        expense_learning_private.expense_learning_coordinate_hmac_v1(
          link.contributor_week_hmac,
          membership.contribution_schema_version,
          membership.observation_schema_version,
          membership.engine_version,
          membership.privacy_policy_version,
          membership.week_start,
          membership.structural_archetype_group,
          membership.metric_family,
          membership.comparison_scope,
          membership.metric_key
        )
      order by membership.metric_family,
        membership.comparison_scope,
        membership.metric_key
      limit 1
    ), changed as (
      update expense_learning_private.accumulator_memberships as membership
      set contributor_coordinate_hmac =
        pg_catalog.decode('${corruptMembershipHmac}', 'hex')
      from target
      where membership.ctid = target.ctid
      returning target.original_hmac
    )
    select original_hmac from changed;
  `);
  expect(
    corruptedMembership.length === 64,
    "P4A did not corrupt exactly one synthetic membership",
  );

  await Promise.all([
    setExpenseLearningConsent(
      admin,
      corruptUser.id,
      false,
      "P4A irreparable revoke",
    ),
    setExpenseLearningConsent(
      admin,
      healthyUser.id,
      false,
      "P4A healthy revoke",
    ),
  ]);
  expect(
    querySql(`
      select count(*) = 1
      from expense_learning_private.contributor_revocation_links
      where user_id = '${corruptUser.id}'::uuid;
    `) === "t" &&
      querySql(`
        select count(*) = 0
        from expense_learning_private.contributor_revocation_links
        where user_id = '${healthyUser.id}'::uuid;
      `) === "t",
    "P4A corrupt unit reverted or blocked a healthy purge",
  );
  const retryRequired = await admin.rpc(
    "purge_expense_learning_retention_v1",
  );
  expect(
    opAllowed(retryRequired) && retryRequired.data === "RETRY_REQUIRED",
    "P4A irreparable source did not report a generic retry state",
  );
  expect(
    querySqlAsLearningOwner(`
      select expense_learning_private.run_expense_learning_retention_v1(
        pg_catalog.clock_timestamp() + interval '36 days'
      );
    `) === "RETRY_REQUIRED" &&
      querySqlAsLearningOwner(`
        select expense_learning_private.run_expense_learning_retention_v1(
          pg_catalog.clock_timestamp() + interval '36 days'
        );
      `) === "RETRY_REQUIRED" &&
      querySql(`
        select
          (select count(*)
           from expense_learning_private.contributor_revocation_links
           where user_id = '${corruptUser.id}'::uuid) = 1
          and (select count(*)
               from expense_learning_private.accumulator_memberships) = 67
          and (select count(*)
               from expense_learning_private.protected_accumulators) = 67;
      `) === "t",
    "P4A expiry destroyed irreparable source evidence",
  );

  const failedDelete = await admin.auth.admin.deleteUser(corruptUser.id);
  expect(
    Boolean(failedDelete.error),
    "P4A irreparable account deletion did not fail closed",
  );
  expect(
    querySql(`select count(*) = 1 from auth.users where id = '${corruptUser.id}'::uuid;`) ===
      "t",
    "P4A failed account deletion removed the identity but kept raw",
  );

  applyInlineSql(`
    with target as (
      select membership.ctid
      from expense_learning_private.accumulator_memberships as membership
      join expense_learning_private.contributor_revocation_links as link
        on link.user_id = '${corruptUser.id}'::uuid
       and link.week_start = membership.week_start
      where not exists (
        select 1
        from expense_learning_private.contributor_revocation_links as candidate
        where candidate.week_start = membership.week_start
          and membership.contributor_coordinate_hmac =
            expense_learning_private.expense_learning_coordinate_hmac_v1(
              candidate.contributor_week_hmac,
              membership.contribution_schema_version,
              membership.observation_schema_version,
              membership.engine_version,
              membership.privacy_policy_version,
              membership.week_start,
              membership.structural_archetype_group,
              membership.metric_family,
              membership.comparison_scope,
              membership.metric_key
            )
      )
      limit 1
    )
    update expense_learning_private.accumulator_memberships as membership
    set contributor_coordinate_hmac =
      pg_catalog.decode('${corruptedMembership}', 'hex')
    from target
    where membership.ctid = target.ctid;
  `);
  const repairedRetry = await admin.rpc(
    "purge_expense_learning_retention_v1",
  );
  expect(
    opAllowed(repairedRetry) && repairedRetry.data === "PURGED",
    "P4A repaired source did not clear its retry debt",
  );
  const { error: corruptDeleteError } =
    await admin.auth.admin.deleteUser(corruptUser.id);
  expect(!corruptDeleteError, "could not delete repaired P4A user");
  const { error: healthyDeleteError } =
    await admin.auth.admin.deleteUser(healthyUser.id);
  expect(!healthyDeleteError, "could not delete P4A healthy user");

  const ttlUser = await createUser(admin, "learning_p4_ttl");
  users.push(ttlUser);
  await setExpenseLearningConsent(admin, ttlUser.id, true, "P4A TTL grant");
  const ttlWeekHmac = randomExpenseLearningHex();
  expect(
    stageExpenseLearning(
      ttlUser.id,
      randomExpenseLearningHex(),
      ttlWeekHmac,
    ) === "ACCEPTED",
    "P4A TTL fixture was not accepted",
  );
  expect(
    querySqlAsLearningOwner(`
      select expense_learning_private.run_expense_learning_retention_v1(
        pg_catalog.clock_timestamp() + interval '25 hours'
      )
    `) === "PURGED",
    "P4A did not purge an expired 24-hour claim",
  );
  expect(
    querySql(`
      select
        (select count(*) from expense_learning_private.contribution_claims) = 0
        and (select count(*) from expense_learning_private.contributor_revocation_links) = 1;
    `) === "t",
    "P4A claim TTL purge removed or retained the wrong protected rows",
  );
  expect(
    querySqlAsLearningOwner(`
      select expense_learning_private.run_expense_learning_retention_v1(
        pg_catalog.clock_timestamp() + interval '36 days'
      )
    `) === "PURGED" && expenseLearningP3RuntimeRowCount() === 0,
    "P4A did not purge 35-day link/raw retention",
  );

  applyInlineSql(`
    insert into expense_learning_private.closed_week_supported_metrics (
      contribution_schema_version,
      observation_schema_version,
      engine_version,
      privacy_policy_version,
      week_start,
      structural_archetype_group,
      metric_family,
      comparison_scope,
      metric_key,
      bucket_kind,
      bucket_value,
      support_band,
      promoted_at,
      expires_at
    ) values (
      'expense-engine-aggregate-contribution.v1',
      'expense-engine-observation.v1',
      'expense-local-engine.v1',
      '2026-07-21',
      date '2025-01-06',
      'TABLE',
      'HUMAN_REVIEW',
      'NONE',
      'VALUE',
      'EXACT',
      'CONFIRMED',
      'K10_19',
      timestamptz '2025-01-13 00:00:00+00',
      timestamptz '2026-02-13 00:00:00+00'
    );
  `);
  const promotedBefore = querySql(
    "select count(*) from expense_learning_private.closed_week_supported_metrics;",
  );
  expect(promotedBefore === "1", "P4A promoted TTL fixture was not inserted");
  const promotedPurge = await admin.rpc(
    "purge_expense_learning_retention_v1",
  );
  expect(
    opAllowed(promotedPurge) && promotedPurge.data === "PURGED" &&
      querySql(
        "select count(*) from expense_learning_private.closed_week_supported_metrics;",
      ) === "0",
    "P4A did not purge an expired promoted metric",
  );
  expect(
    (await admin.rpc("promote_expense_learning_closed_weeks_v1")).data ===
      "NOTHING" &&
      (
        await admin.rpc("submit_expense_learning_contribution_v1", {
          p_user_id: ttlUser.id,
          p_contribution: {},
          p_claim_token_digest: "a".repeat(64),
          p_contributor_week_hmac: "b".repeat(64),
        })
      ).data === "DISABLED",
    "P4B changed the dormant submit or empty promotion behavior",
  );
  const { error: ttlDeleteError } = await admin.auth.admin.deleteUser(
    ttlUser.id,
  );
  expect(!ttlDeleteError, "could not delete P4A TTL user");
}

function clearExpenseLearningP4bOutputs() {
  const remaining = querySqlAsLearningOwner(`
    delete from expense_learning_private.closed_week_supported_metrics;
    delete from expense_learning_private.closed_week_promotion_batches;
    select pg_catalog.concat_ws(
      ',',
      (select count(*) from expense_learning_private.closed_week_promotion_batches),
      (select count(*) from expense_learning_private.closed_week_supported_metrics)
    )
  `);
  expect(remaining === "0,0", "P4B synthetic output cleanup did not converge");
}

async function testExpenseLearningP4bWeekFenceRollback(admin, users) {
  const user = await createUser(admin, "learning_p4b_week_fence");
  users.push(user);
  await setExpenseLearningConsent(admin, user.id, true, "P4B week fence grant");
  const claimHex = randomExpenseLearningHex();
  const weekHmacHex = randomExpenseLearningHex();
  const contribution = expenseLearningCanonicalContribution("TABLE");
  const previousWeek = querySql(`
    select (
      pg_catalog.date_trunc(
        'week',
        pg_catalog.clock_timestamp() at time zone 'UTC'
      )::date - 7
    )::text
  `);

  const obsoleteWeek = await Promise.allSettled([
    querySqlAsync(
      `
        insert into expense_learning_private.contributor_revocation_links (
          user_id,
          week_start,
          contributor_week_hmac,
          expires_at
        ) values (
          '${user.id}'::uuid,
          date '${previousWeek}',
          pg_catalog.decode('${weekHmacHex}', 'hex'),
          (date '${previousWeek}'::timestamp at time zone 'UTC') + interval '35 days'
        );
        insert into expense_learning_private.contribution_claims (
          claim_token_digest,
          claimed_at,
          expires_at,
          week_start,
          contributor_week_hmac
        ) values (
          pg_catalog.decode('${claimHex}', 'hex'),
          pg_catalog.clock_timestamp(),
          pg_catalog.clock_timestamp() + interval '24 hours',
          date '${previousWeek}',
          pg_catalog.decode('${weekHmacHex}', 'hex')
        );
        insert into expense_learning_private.contributor_week_limits (
          week_start,
          contributor_week_hmac,
          accepted_learning_contributions,
          expires_at
        ) values (
          date '${previousWeek}',
          pg_catalog.decode('${weekHmacHex}', 'hex'),
          1,
          (date '${previousWeek}'::timestamp at time zone 'UTC') + interval '35 days'
        );
        select expense_learning_private.lock_expense_learning_cells_v1(
          '${sqlJson(contribution)}'::jsonb,
          date '${previousWeek}'
        )
      `,
      { learningOwner: true },
    ),
  ]);
  expect(
    obsoleteWeek[0].status === "rejected" &&
      obsoleteWeek[0].reason.message.includes(
        "expense_learning_ingestion_week_changed",
      ),
    "P4B obsolete-week fence did not execute in PostgreSQL",
  );
  expect(
    querySql(`
      select
        not exists (
          select 1
          from expense_learning_private.contributor_revocation_links
          where user_id = '${user.id}'::uuid
        )
        and not exists (
          select 1
          from expense_learning_private.contribution_claims
          where claim_token_digest = pg_catalog.decode('${claimHex}', 'hex')
        )
        and not exists (
          select 1
          from expense_learning_private.contributor_week_limits
          where contributor_week_hmac = pg_catalog.decode('${weekHmacHex}', 'hex')
        )
        and not exists (
          select 1
          from expense_learning_private.accumulator_memberships
          where week_start = date '${previousWeek}'
        )
    `) === "t",
    "P4B obsolete-week fence did not roll back provisional link/claim/cap DML",
  );
  expect(
    querySqlAsLearningOwner(`
      select expense_learning_private.lock_expense_learning_cells_v1(
        '${sqlJson(contribution)}'::jsonb,
        pg_catalog.date_trunc(
          'week',
          pg_catalog.clock_timestamp() at time zone 'UTC'
        )::date
      );
      select 'CURRENT_WEEK_OK'
    `) === "CURRENT_WEEK_OK",
    "P4B current-week fence rejected an open marker-less batch",
  );

  const { error } = await admin.auth.admin.deleteUser(user.id);
  expect(!error, "could not delete P4B week-fence user");
}

async function testExpenseLearningP4bMarkerlessDebt(admin, users) {
  const user = await createUser(admin, "learning_p4b_markerless_debt");
  users.push(user);
  const weekHmacHex = randomExpenseLearningHex();
  await setExpenseLearningConsent(
    admin,
    user.id,
    true,
    "P4B marker-less debt grant",
  );
  expect(
    stageExpenseLearning(
      user.id,
      randomExpenseLearningHex(),
      weekHmacHex,
    ) === "ACCEPTED",
    "P4B marker-less debt fixture was not accepted",
  );

  querySqlAsLearningOwner(`
    delete from expense_learning_private.accumulator_memberships
    where metric_family = 'HUMAN_REVIEW'
      and comparison_scope = 'NONE'
      and metric_key = 'VALUE'
  `);
  expect(
    querySqlAsLearningOwner(`
      select expense_learning_private.run_expense_learning_promotion_v1(
        pg_catalog.clock_timestamp() + interval '8 days'
      )
    `) === "RETRY_REQUIRED" && expenseLearningP4bTableCounts() === "0,0",
    "P4B missing HUMAN_REVIEW source was silenced or produced output",
  );

  querySqlAsLearningOwner(`
    insert into expense_learning_private.accumulator_memberships (
      contribution_schema_version,
      observation_schema_version,
      engine_version,
      privacy_policy_version,
      week_start,
      structural_archetype_group,
      metric_family,
      comparison_scope,
      metric_key,
      bucket_kind,
      bucket_value,
      contributor_coordinate_hmac,
      expires_at
    )
    select
      accumulator.contribution_schema_version,
      accumulator.observation_schema_version,
      accumulator.engine_version,
      accumulator.privacy_policy_version,
      accumulator.week_start,
      accumulator.structural_archetype_group,
      accumulator.metric_family,
      accumulator.comparison_scope,
      accumulator.metric_key,
      accumulator.bucket_kind,
      accumulator.bucket_value,
      expense_learning_private.expense_learning_coordinate_hmac_v1(
        link.contributor_week_hmac,
        accumulator.contribution_schema_version,
        accumulator.observation_schema_version,
        accumulator.engine_version,
        accumulator.privacy_policy_version,
        accumulator.week_start,
        accumulator.structural_archetype_group,
        accumulator.metric_family,
        accumulator.comparison_scope,
        accumulator.metric_key
      ),
      accumulator.expires_at
    from expense_learning_private.protected_accumulators as accumulator
    join expense_learning_private.contributor_revocation_links as link
      on link.user_id = '${user.id}'::uuid
     and link.week_start = accumulator.week_start
    where accumulator.metric_family = 'HUMAN_REVIEW'
      and accumulator.comparison_scope = 'NONE'
      and accumulator.metric_key = 'VALUE'
  `);
  querySqlAsLearningOwner(`
    delete from expense_learning_private.accumulator_memberships
  `);
  expect(
    querySqlAsLearningOwner(`
      select expense_learning_private.run_expense_learning_promotion_v1(
        pg_catalog.clock_timestamp() + interval '8 days'
      )
    `) === "RETRY_REQUIRED" && expenseLearningP4bTableCounts() === "0,0",
    "P4B accumulator-only marker-less debt was silenced or produced output",
  );

  querySqlAsLearningOwner(`
    delete from expense_learning_private.protected_accumulators
  `);
  expect(
    stageExpenseLearning(
      user.id,
      randomExpenseLearningHex(),
      weekHmacHex,
    ) === "ACCEPTED",
    "P4B marker-less debt fixture could not be restored",
  );
  await setExpenseLearningConsent(
    admin,
    user.id,
    false,
    "P4B marker-less debt revoke",
  );
  expect(
    expenseLearningProtectedSourceRowCount() === 0,
    "P4B marker-less debt cleanup left protected source",
  );
  const { error } = await admin.auth.admin.deleteUser(user.id);
  expect(!error, "could not delete P4B marker-less debt user");
}

async function testExpenseLearningP4bLockFences(admin, users) {
  const cohort = [];
  for (let index = 0; index < 11; index += 1) {
    const user = await createUser(admin, `learning_p4b_lock_${index}`);
    users.push(user);
    cohort.push(user);
    await setExpenseLearningConsent(
      admin,
      user.id,
      true,
      `P4B lock cohort grant ${index}`,
    );
  }
  for (let index = 0; index < 10; index += 1) {
    expect(
      stageExpenseLearning(
        cohort[index].id,
        randomExpenseLearningHex(),
        randomExpenseLearningHex(),
      ) === "ACCEPTED",
      `P4B lock cohort contribution ${index} was not accepted`,
    );
  }

  const stageApplication = `learning_p4b_stage_first_${randomUUID()}`;
  const promotionApplication = `learning_p4b_stage_wait_${randomUUID()}`;
  const stageFirst = querySqlAsync(
    `
      set local application_name = '${stageApplication}';
      ${stageExpenseLearningSql(
        cohort[10].id,
        randomExpenseLearningHex(),
        randomExpenseLearningHex(),
        "; select pg_catalog.pg_sleep(1.2)",
      )}
    `,
    { learningOwner: true },
  );
  await waitForSqlSessionSleep(
    stageApplication,
    "P4B stage-first fixture did not hold the global mutex",
  );
  const promotionBehindStage = querySqlAsync(
    `
      set local application_name = '${promotionApplication}';
      select expense_learning_private.run_expense_learning_promotion_v1(
        pg_catalog.clock_timestamp() + interval '8 days'
      )
    `,
    { learningOwner: true },
  );
  await waitForSqlSessionAdvisoryLock(
    promotionApplication,
    "P4B promotion did not wait behind the stage-first mutex",
  );
  const [stageResult, stageFirstPromotion] = await Promise.all([
    stageFirst,
    promotionBehindStage,
  ]);
  expect(
    stageResult === "ACCEPTED" &&
      stageFirstPromotion === "RETRY_REQUIRED" &&
      expenseLearningP4bTableCounts() === "0,0",
    "P4B stage-first race did not defer the late candidate atomically",
  );

  const rowLockApplication = `learning_p4b_row_lock_${randomUUID()}`;
  const rowBlocker = querySqlAsync(
    `
      set local application_name = '${rowLockApplication}';
      select link.user_id
      from expense_learning_private.contributor_revocation_links as link
      where link.user_id = '${cohort[0].id}'::uuid
      for update;
      select pg_catalog.pg_sleep(1.2)
    `,
    { learningOwner: true },
  );
  await waitForSqlSessionSleep(
    rowLockApplication,
    "P4B row-lock fixture did not hold the candidate link",
  );
  expect(
    querySqlAsLearningOwner(`
      select expense_learning_private.run_expense_learning_promotion_v1(
        pg_catalog.clock_timestamp() + interval '8 days'
      )
    `) === "RETRY_REQUIRED" && expenseLearningP4bTableCounts() === "0,0",
    "P4B expected-links fence did not reject a SKIP LOCKED candidate",
  );
  await rowBlocker;
  expect(
    querySqlAsLearningOwner(`
      select expense_learning_private.run_expense_learning_promotion_v1(
        pg_catalog.clock_timestamp() + interval '8 days'
      )
    `) === "PROMOTED" && expenseLearningP4bTableCounts() === "1,1" &&
      querySqlAsLearningOwner(`
        select expense_learning_private.run_expense_learning_promotion_v1(
          pg_catalog.clock_timestamp() + interval '8 days'
        )
      `) === "NOTHING",
    "P4B clean retry did not produce exactly one closed batch",
  );

  for (const [index, user] of cohort.entries()) {
    await setExpenseLearningConsent(
      admin,
      user.id,
      false,
      `P4B lock cohort revoke ${index}`,
    );
    const { error } = await admin.auth.admin.deleteUser(user.id);
    expect(!error, `could not delete P4B lock cohort user ${index}`);
  }
  expect(
    expenseLearningProtectedSourceRowCount() === 0,
    "P4B lock cohort cleanup left protected source",
  );
  clearExpenseLearningP4bOutputs();
}

async function testExpenseLearningP4bConsentDeleteRaces(admin, users) {
  const cohort = [];
  for (let index = 0; index < 12; index += 1) {
    const user = await createUser(admin, `learning_p4b_mutation_${index}`);
    users.push(user);
    cohort.push(user);
    await setExpenseLearningConsent(
      admin,
      user.id,
      true,
      `P4B mutation cohort grant ${index}`,
    );
    expect(
      querySqlAsLearningOwner(
        stageExpenseLearningContributionSql(
          user.id,
          randomExpenseLearningHex(),
          randomExpenseLearningHex(),
          expenseLearningCanonicalContribution("SUMMARY"),
        ),
      ) === "ACCEPTED",
      `P4B mutation cohort contribution ${index} was not accepted`,
    );
  }

  const promotionFirstRevokeApp = `p4b_pfr_${randomUUID()}`;
  const waitingRevokeApp = `p4b_wr_${randomUUID()}`;
  const promotionFirstRevoke = querySqlAsync(
    `
      set local application_name = '${promotionFirstRevokeApp}';
      do $p4b_lock_users$
      declare
        v_user_id uuid;
      begin
        for v_user_id in
          select distinct link.user_id
          from expense_learning_private.contributor_revocation_links as link
          order by link.user_id
        loop
          perform pg_catalog.pg_advisory_xact_lock(
            pg_catalog.hashtextextended(
              'expense-learning-consent-v1:' || v_user_id::text,
              0
            )
          );
        end loop;

      end;
      $p4b_lock_users$;
      select pg_catalog.pg_advisory_xact_lock(
        pg_catalog.hashtextextended(
          'expense-learning-accumulator-mutation-v1',
          0
        )
      );
      do $p4b_lock_rows$
      declare
        v_user_id uuid;
      begin
        for v_user_id in
          select link.user_id
          from expense_learning_private.contributor_revocation_links as link
          order by link.user_id
          for update
        loop
          null;
        end loop;
      end;
      $p4b_lock_rows$;
      select pg_catalog.pg_sleep(1.2);
      select expense_learning_private.run_expense_learning_promotion_v1(
        pg_catalog.clock_timestamp() + interval '8 days'
      )
    `,
    { learningOwner: true },
  );
  await waitForSqlSessionSleep(
    promotionFirstRevokeApp,
    "P4B promotion-first revoke fixture did not hold its locks",
  );
  const waitingRevoke = querySqlAsync(`
    begin;
    set local application_name = '${waitingRevokeApp}';
    select pg_catalog.set_config(
      'request.jwt.claims',
      '{"role":"service_role"}',
      true
    );
    select public.set_expense_learning_consent_v1(
      '${cohort[0].id}'::uuid,
      '${sqlJson(consentDecision(false))}'::jsonb
    );
    commit;
  `);
  await waitForSqlSessionAdvisoryLock(
    waitingRevokeApp,
    "P4B revoke did not wait behind promotion user locks",
  );
  const [promotionBeforeRevoke, revokeAfterPromotion] = await Promise.all([
    promotionFirstRevoke,
    waitingRevoke,
  ]);
  expect(
    promotionBeforeRevoke === "PROMOTED" &&
      revokeAfterPromotion.includes("REVOKED") &&
      expenseLearningP4bTableCounts() === "1,1",
    "P4B promotion-first revoke race deadlocked or left partial output",
  );
  clearExpenseLearningP4bOutputs();

  const revokeFirstApp = `p4b_rf_${randomUUID()}`;
  const promotionAfterRevokeApp = `p4b_par_${randomUUID()}`;
  const revokeFirst = querySqlAsync(`
    begin;
    set local application_name = '${revokeFirstApp}';
    select pg_catalog.set_config(
      'request.jwt.claims',
      '{"role":"service_role"}',
      true
    );
    select public.set_expense_learning_consent_v1(
      '${cohort[1].id}'::uuid,
      '${sqlJson(consentDecision(false))}'::jsonb
    );
    select pg_catalog.pg_sleep(1.2);
    commit;
  `);
  await waitForSqlSessionSleep(
    revokeFirstApp,
    "P4B revoke-first fixture did not hold its locks",
  );
  const promotionAfterRevoke = querySqlAsync(
    `
      set local application_name = '${promotionAfterRevokeApp}';
      select expense_learning_private.run_expense_learning_promotion_v1(
        pg_catalog.clock_timestamp() + interval '8 days'
      )
    `,
    { learningOwner: true },
  );
  await waitForSqlSessionAdvisoryLock(
    promotionAfterRevokeApp,
    "P4B promotion did not wait behind a revoke-first advisory",
  );
  const [, promotionAfterRevokeResult] = await Promise.all([
    revokeFirst,
    promotionAfterRevoke,
  ]);
  expect(
    promotionAfterRevokeResult === "PROMOTED" &&
      expenseLearningP4bTableCounts() === "1,1",
    "P4B revoke-first promotion did not converge atomically",
  );
  clearExpenseLearningP4bOutputs();

  const deleteFirstApp = `p4b_df_${randomUUID()}`;
  const promotionAfterDeleteApp = `p4b_pad_${randomUUID()}`;
  const deleteFirst = querySqlAsync(`
    begin;
    set local application_name = '${deleteFirstApp}';
    delete from auth.users where id = '${cohort[2].id}'::uuid;
    select pg_catalog.pg_sleep(1.2);
    commit;
  `);
  await waitForSqlSessionSleep(
    deleteFirstApp,
    "P4B delete-first fixture did not hold its locks",
  );
  const promotionAfterDelete = querySqlAsync(
    `
      set local application_name = '${promotionAfterDeleteApp}';
      select expense_learning_private.run_expense_learning_promotion_v1(
        pg_catalog.clock_timestamp() + interval '8 days'
      )
    `,
    { learningOwner: true },
  );
  await waitForSqlSessionAdvisoryLock(
    promotionAfterDeleteApp,
    "P4B promotion did not wait behind delete-first cleanup",
  );
  const [, promotionAfterDeleteResult] = await Promise.all([
    deleteFirst,
    promotionAfterDelete,
  ]);
  expect(
    promotionAfterDeleteResult === "NOTHING" &&
      expenseLearningP4bTableCounts() === "1,0",
    "P4B delete-first promotion did not close the reduced batch atomically",
  );
  clearExpenseLearningP4bOutputs();

  const promotionFirstDeleteApp = `p4b_pfd_${randomUUID()}`;
  const waitingDeleteApp = `p4b_wd_${randomUUID()}`;
  const promotionFirstDelete = querySqlAsync(
    `
      set local application_name = '${promotionFirstDeleteApp}';
      do $p4b_lock_users$
      declare
        v_user_id uuid;
      begin
        for v_user_id in
          select distinct link.user_id
          from expense_learning_private.contributor_revocation_links as link
          order by link.user_id
        loop
          perform pg_catalog.pg_advisory_xact_lock(
            pg_catalog.hashtextextended(
              'expense-learning-consent-v1:' || v_user_id::text,
              0
            )
          );
        end loop;

      end;
      $p4b_lock_users$;
      select pg_catalog.pg_advisory_xact_lock(
        pg_catalog.hashtextextended(
          'expense-learning-accumulator-mutation-v1',
          0
        )
      );
      do $p4b_lock_rows$
      declare
        v_user_id uuid;
      begin
        for v_user_id in
          select link.user_id
          from expense_learning_private.contributor_revocation_links as link
          order by link.user_id
          for update
        loop
          null;
        end loop;
      end;
      $p4b_lock_rows$;
      select pg_catalog.pg_sleep(1.2);
      select expense_learning_private.run_expense_learning_promotion_v1(
        pg_catalog.clock_timestamp() + interval '8 days'
      )
    `,
    { learningOwner: true },
  );
  await waitForSqlSessionSleep(
    promotionFirstDeleteApp,
    "P4B promotion-first delete fixture did not hold its locks",
  );
  const waitingDelete = querySqlAsync(`
    begin;
    set local application_name = '${waitingDeleteApp}';
    delete from auth.users where id = '${cohort[3].id}'::uuid;
    commit;
  `);
  await waitForSqlSessionLock(
    waitingDeleteApp,
    "P4B account deletion did not wait behind promotion",
  );
  const [promotionBeforeDelete, deleteAfterPromotion] = await Promise.all([
    promotionFirstDelete,
    waitingDelete,
  ]);
  expect(
    promotionBeforeDelete === "NOTHING" &&
      deleteAfterPromotion === "" &&
      expenseLearningP4bTableCounts() === "1,0",
    "P4B promotion-first account deletion deadlocked or left partial output",
  );

  const remainingIndexes = [
    0,
    1,
    ...Array.from({ length: 8 }, (_, index) => index + 4),
  ];
  for (const index of remainingIndexes) {
    const { error } = await admin.auth.admin.deleteUser(cohort[index].id);
    expect(!error, `could not delete P4B mutation cohort user ${index}`);
  }
  expect(
    expenseLearningProtectedSourceRowCount() === 0,
    "P4B mutation races left protected source",
  );
  clearExpenseLearningP4bOutputs();
}

async function testExpenseLearningP4bPromotion(admin, users) {
  await testExpenseLearningP4bWeekFenceRollback(admin, users);
  await testExpenseLearningP4bMarkerlessDebt(admin, users);
  await testExpenseLearningP4bLockFences(admin, users);
  await testExpenseLearningP4bConsentDeleteRaces(admin, users);

  const cohort = [];
  for (let index = 0; index < 20; index += 1) {
    const user = await createUser(admin, `learning_p4b_${index}`);
    users.push(user);
    cohort.push(user);
  }
  await Promise.all(
    cohort.map((user, index) =>
      setExpenseLearningConsent(
        admin,
        user.id,
        true,
        `P4B cohort grant ${index}`,
      ),
    ),
  );

  for (const [index, user] of cohort.entries()) {
    const weekHmac = randomExpenseLearningHex();
    if (index < 11) {
      expect(
        querySqlAsLearningOwner(
          stageExpenseLearningContributionSql(
            user.id,
            randomExpenseLearningHex(),
            weekHmac,
            expenseLearningContributionForReview(
              "TABLE",
              index < 10 ? "CONFIRMED" : "CORRECTED",
            ),
          ),
        ) === "ACCEPTED",
        `P4B TABLE contribution ${index} was not accepted`,
      );
    }
    expect(
      querySqlAsLearningOwner(
        stageExpenseLearningContributionSql(
          user.id,
          randomExpenseLearningHex(),
          weekHmac,
          expenseLearningContributionForReview(
            "SUMMARY",
            index < 10 ? "CONFIRMED" : "CORRECTED",
          ),
        ),
      ) === "ACCEPTED",
      `P4B SUMMARY contribution ${index} was not accepted`,
    );
    if (index < 9) {
      expect(
        querySqlAsLearningOwner(
          stageExpenseLearningContributionSql(
            user.id,
            randomExpenseLearningHex(),
            weekHmac,
            expenseLearningContributionForReview("OTHER", "CONFIRMED"),
          ),
        ) === "ACCEPTED",
        `P4B OTHER contribution ${index} was not accepted`,
      );
    }
    if (index < 19) {
      const review =
        index < 10 ? "CONFIRMED" : index < 14 ? "CORRECTED" : "REJECTED";
      expect(
        querySqlAsLearningOwner(
          stageExpenseLearningContributionSql(
            user.id,
            randomExpenseLearningHex(),
            weekHmac,
            expenseLearningContributionForReview("UNKNOWN", review),
          ),
        ) === "ACCEPTED",
        `P4B UNKNOWN contribution ${index} was not accepted`,
      );
    }
  }

  const promotionWeek = querySql(`
    select min(week_start)::text
    from expense_learning_private.contributor_revocation_links
    where user_id = any(array[${cohort
      .map((user) => `'${user.id}'::uuid`)
      .join(",")}]);
  `);
  const sourceState = querySqlAsLearningOwner(`
    select pg_catalog.concat_ws(
      ',',
      expense_learning_private.is_expense_learning_week_source_canonical_v1(
        date '${promotionWeek}'
      ),
      expense_learning_private.is_expense_learning_week_accumulator_consistent_v1(
        date '${promotionWeek}'
      ),
      expense_learning_private.is_expense_learning_promotion_source_safe_v1(
        'expense-engine-aggregate-contribution.v1',
        'expense-engine-observation.v1',
        'expense-local-engine.v1',
        '2026-07-21',
        date '${promotionWeek}',
        'TABLE'
      ),
      expense_learning_private.is_expense_learning_promotion_source_safe_v1(
        'expense-engine-aggregate-contribution.v1',
        'expense-engine-observation.v1',
        'expense-local-engine.v1',
        '2026-07-21',
        date '${promotionWeek}',
        'SUMMARY'
      ),
      expense_learning_private.is_expense_learning_promotion_source_safe_v1(
        'expense-engine-aggregate-contribution.v1',
        'expense-engine-observation.v1',
        'expense-local-engine.v1',
        '2026-07-21',
        date '${promotionWeek}',
        'OTHER'
      ),
      expense_learning_private.is_expense_learning_promotion_source_safe_v1(
        'expense-engine-aggregate-contribution.v1',
        'expense-engine-observation.v1',
        'expense-local-engine.v1',
        '2026-07-21',
        date '${promotionWeek}',
        'UNKNOWN'
      )
    )
  `);
  expect(
    sourceState === "t,t,t,t,t,t",
    `P4B source gate rejected a canonical cohort: ${sourceState}`,
  );
  const cleanupDebt = querySqlAsLearningOwner(`
    select pg_catalog.bool_or(
      expense_learning_private.is_expense_learning_link_cleanup_eligible_v1(
        link.user_id,
        link.week_start,
        pg_catalog.clock_timestamp() + interval '8 days'
      )
    )
    from expense_learning_private.contributor_revocation_links as link
    where link.user_id = any(array[${cohort
      .map((user) => `'${user.id}'::uuid`)
      .join(",")}])
  `);
  expect(
    cleanupDebt === "f",
    `P4B canonical cohort was unexpectedly purge-eligible: ${cleanupDebt}`,
  );
  expect(
    querySqlAsLearningOwner(`
      with inserted as (
        insert into expense_learning_private.protected_accumulators (
          contribution_schema_version,
          observation_schema_version,
          engine_version,
          privacy_policy_version,
          week_start,
          structural_archetype_group,
          metric_family,
          comparison_scope,
          metric_key,
          bucket_kind,
          bucket_value,
          supporting_contributors,
          expires_at
        )
        select
          accumulator.contribution_schema_version,
          accumulator.observation_schema_version,
          accumulator.engine_version,
          accumulator.privacy_policy_version,
          accumulator.week_start - 7,
          accumulator.structural_archetype_group,
          accumulator.metric_family,
          accumulator.comparison_scope,
          accumulator.metric_key,
          accumulator.bucket_kind,
          accumulator.bucket_value,
          accumulator.supporting_contributors,
          accumulator.expires_at - interval '7 days'
        from expense_learning_private.protected_accumulators as accumulator
        where accumulator.week_start = date '${promotionWeek}'
          and accumulator.structural_archetype_group = 'OTHER'
          and accumulator.metric_family = 'HUMAN_REVIEW'
          and accumulator.comparison_scope = 'NONE'
          and accumulator.metric_key = 'VALUE'
        returning 1
      )
      select count(*) from inserted
    `) === "1",
    "P4B mixed-debt fixture did not create one accumulator-only batch",
  );

  const fenceUser = await createUser(admin, "learning_p4b_marker_fence");
  users.push(fenceUser);
  await setExpenseLearningConsent(
    admin,
    fenceUser.id,
    true,
    "P4B marker fence grant",
  );
  const promotionApplication = `learning_p4b_promotion_${randomUUID()}`;
  const stageApplication = `learning_p4b_late_stage_${randomUUID()}`;
  const promotion = querySqlAsync(
    `
      set local application_name = '${promotionApplication}';
      select pg_catalog.pg_advisory_xact_lock(
        pg_catalog.hashtextextended(
          'expense-learning-accumulator-mutation-v1',
          0
        )
      );
      select pg_catalog.pg_sleep(1.2);
      select expense_learning_private.run_expense_learning_promotion_v1(
        pg_catalog.clock_timestamp() + interval '8 days'
      )
    `,
    { learningOwner: true },
  );
  await waitForSqlSessionSleep(
    promotionApplication,
    "P4B promotion did not hold the global mutex before the late stage",
  );
  const lateStage = querySqlAsync(
    `
      set local application_name = '${stageApplication}';
      ${stageExpenseLearningContributionSql(
        fenceUser.id,
        randomExpenseLearningHex(),
        randomExpenseLearningHex(),
        expenseLearningCanonicalContribution("TABLE"),
      )}
    `,
    { learningOwner: true },
  );
  await waitForSqlSessionAdvisoryLock(
    stageApplication,
    "P4B late stage did not wait behind the promotion mutex",
  );
  const [promotionResult, lateStageResult] = await Promise.allSettled([
    promotion,
    lateStage,
  ]);
  expect(
    promotionResult.status === "fulfilled" &&
      promotionResult.value === "RETRY_REQUIRED" &&
      expenseLearningP4bTableCounts() === "4,4",
    `P4B mixed marker-less debt was hidden after healthy progress: ${
      promotionResult.status === "fulfilled"
        ? promotionResult.value
        : promotionResult.reason.message
    }`,
  );
  expect(
    lateStageResult.status === "rejected" &&
      lateStageResult.reason.message.includes(
        "expense_learning_ingestion_batch_closed",
    ),
    "P4B promotion race did not reject the late stage at the marker fence",
  );
  expect(
    querySqlAsLearningOwner(`
      with removed as (
        delete from expense_learning_private.protected_accumulators
        where week_start = date '${promotionWeek}' - 7
          and structural_archetype_group = 'OTHER'
          and metric_family = 'HUMAN_REVIEW'
          and comparison_scope = 'NONE'
          and metric_key = 'VALUE'
        returning 1
      )
      select count(*) from removed
    `) === "1" &&
      querySqlAsLearningOwner(`
        select expense_learning_private.run_expense_learning_promotion_v1(
          pg_catalog.clock_timestamp() + interval '8 days'
        )
      `) === "NOTHING" && expenseLearningP4bTableCounts() === "4,4",
    "P4B mixed accumulator debt did not clear without reopening healthy batches",
  );
  expect(
    querySql(`
      select pg_catalog.string_agg(
        structural_archetype_group || ':' || batch_state,
        ',' order by structural_archetype_group
      )
      from expense_learning_private.closed_week_promotion_batches;
    `) ===
      "OTHER:DISCARDED,SUMMARY:PROMOTED,TABLE:PROMOTED,UNKNOWN:PROMOTED",
    "P4B did not persist the four mutually exclusive marker outcomes",
  );
  expect(
    querySql(`
      select pg_catalog.string_agg(
        structural_archetype_group || ':' || bucket_kind || ':'
          || bucket_value || ':' || support_band,
        ',' order by structural_archetype_group, bucket_value
      )
      from expense_learning_private.closed_week_supported_metrics;
    `) ===
      "SUMMARY:EXACT:CONFIRMED:K20_49,SUMMARY:EXACT:CORRECTED:K20_49,TABLE:COARSENED_OTHER:OTHER:K10_19,UNKNOWN:COARSENED_OTHER:OTHER:K10_19",
    "P4B output shape exposed a rare residual or an incomplete partition",
  );
  expect(
    querySql(`
      select pg_catalog.bool_and(
        metric_family = 'HUMAN_REVIEW'
        and comparison_scope = 'NONE'
        and metric_key = 'VALUE'
      )
      from expense_learning_private.closed_week_supported_metrics;
    `) === "t",
    "P4B promoted a coordinate outside HUMAN_REVIEW/NONE/VALUE",
  );
  expect(
    querySqlAsLearningOwner(`
      select expense_learning_private.run_expense_learning_promotion_v1(
        pg_catalog.clock_timestamp() + interval '8 days'
      )
    `) === "NOTHING" && expenseLearningP4bTableCounts() === "4,4",
    "P4B reran a closed batch or changed its one-shot snapshot",
  );
  expect(
    querySqlAsLearningOwner(`
      with marker_update as (
        update expense_learning_private.closed_week_promotion_batches
        set privacy_evaluation_version = privacy_evaluation_version
        returning 1
      ), metric_update as (
        update expense_learning_private.closed_week_supported_metrics
        set support_band = support_band
        returning 1
      )
      select (select count(*) from marker_update) = 0
        and (select count(*) from metric_update) = 0
    `) === "t",
    "P4B owner could UPDATE an immutable marker or promoted metric",
  );

  expect(
    querySql(`
      select not exists (
        select 1
        from expense_learning_private.contributor_revocation_links
        where user_id = '${fenceUser.id}'::uuid
      ) and not exists (
        select 1
        from expense_learning_private.contribution_claims as claim
        join expense_learning_private.contributor_revocation_links as link
          on link.week_start = claim.week_start
         and link.contributor_week_hmac = claim.contributor_week_hmac
        where link.user_id = '${fenceUser.id}'::uuid
      );
    `) === "t",
    "P4B marker fence left link or claim DML from a rejected stage",
  );

  for (const [index, user] of cohort.entries()) {
    await setExpenseLearningConsent(
      admin,
      user.id,
      false,
      `P4B cohort revoke ${index}`,
    );
  }
  expect(
    querySql(`
      select
        (select count(*) from expense_learning_private.contribution_claims) = 0
        and (select count(*) from expense_learning_private.contributor_week_limits) = 0
        and (select count(*) from expense_learning_private.accumulator_memberships) = 0
        and (select count(*) from expense_learning_private.protected_accumulators) = 0
        and (select count(*) from expense_learning_private.contributor_revocation_links) = 0;
    `) === "t" && expenseLearningP4bTableCounts() === "4,4",
    "P4B withdrawal changed promoted output or left separable cohort raw",
  );
  const cohortDeletes = await Promise.all(
    cohort.map((user) => admin.auth.admin.deleteUser(user.id)),
  );
  expect(
    cohortDeletes.every(({ error }) => !error),
    "could not delete the synthetic P4B contributor cohort",
  );
  const { error: fenceDeleteError } =
    await admin.auth.admin.deleteUser(fenceUser.id);
  expect(!fenceDeleteError, "could not delete P4B marker fence user");
}

function expectConsentState(result, state, message) {
  expect(
    opAllowed(result),
    `${message}: ${result.error?.message ?? "unknown"}`,
  );
  expect(result.data?.state === state, `${message}: expected ${state}`);
  expect(
    JSON.stringify(Object.keys(result.data ?? {}).sort()) ===
      JSON.stringify(
        [
          "decidedAt",
          "noticeVersion",
          "privacyPolicyVersion",
          "purpose",
          "schemaVersion",
          "state",
        ].sort(),
      ),
    `${message}: response exposed unexpected fields`,
  );
}

async function waitForExpenseLearningConsentRpc(admin, userId) {
  for (let attempt = 0; attempt < 30; attempt += 1) {
    const result = await admin.rpc("get_expense_learning_consent_v1", {
      p_user_id: userId,
    });
    if (!result.error) return result;
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  fail("expense learning consent RPC did not enter the PostgREST schema cache");
}

function testExpenseLearningConsentDatabaseBoundary(userId) {
  expect(
    querySql(`
      select count(*) = 2
        and count(*) filter (where policy.polcmd = 'r') = 1
        and count(*) filter (where policy.polcmd = 'a') = 1
        and count(*) filter (where policy.polcmd in ('w', 'd', '*')) = 0
        and pg_catalog.bool_and(
          policy.polroles = array[owner.oid]::oid[]
        )
      from pg_catalog.pg_policy policy
      join pg_catalog.pg_class relation on relation.oid = policy.polrelid
      join pg_catalog.pg_namespace namespace
        on namespace.oid = relation.relnamespace
      cross join pg_catalog.pg_roles owner
      where namespace.nspname = 'expense_learning_private'
        and relation.relname = 'learning_consent_decisions'
        and owner.rolname = 'expense_learning_storage_owner';
    `) === "t",
    "consent ledger does not have exactly owner-only SELECT and INSERT policies",
  );
  expect(
    querySql(`
      select pg_catalog.bool_and(
        not pg_catalog.has_table_privilege(
          role_name,
          'expense_learning_private.learning_consent_decisions',
          'SELECT,INSERT,UPDATE,DELETE'
        )
      )
      from (values
        ('anon'),
        ('authenticated'),
        ('service_role')
      ) as roles(role_name);
    `) === "t",
    "browser or service roles gained direct consent table privileges",
  );
  expect(
    querySql(`
      select pg_catalog.bool_and(
        not pg_catalog.has_sequence_privilege(
          role_name,
          'expense_learning_private.learning_consent_decisions_decision_id_seq',
          'USAGE,SELECT,UPDATE'
        )
      )
      from (values
        ('anon'),
        ('authenticated'),
        ('service_role')
      ) as roles(role_name);
    `) === "t",
    "browser or service roles gained direct consent sequence privileges",
  );
  expect(
    querySql(`
      select count(*) = 2
        and pg_catalog.bool_and(p.prosecdef)
        and pg_catalog.bool_and(
          pg_catalog.pg_get_userbyid(p.proowner) =
            'expense_learning_storage_owner'
        )
        and pg_catalog.bool_and(
          p.proconfig @> array['search_path=""']::text[]
        )
      from pg_catalog.pg_proc p
      join pg_catalog.pg_namespace n on n.oid = p.pronamespace
      where n.nspname = 'public'
        and p.proname in (
          'get_expense_learning_consent_v1',
          'set_expense_learning_consent_v1'
        );
    `) === "t",
    "consent wrappers are not owner-bound SECURITY DEFINER functions",
  );

  const rowsBefore = expenseLearningConsentRowCount();
  expectInlineSqlFailure(
    `select public.get_expense_learning_consent_v1('${userId}'::uuid);`,
    "expense_learning_consent_rpc_forbidden",
  );
  expectInlineSqlFailure(
    `set request.jwt.claims = '{';
     select public.get_expense_learning_consent_v1('${userId}'::uuid);`,
    "expense_learning_consent_rpc_forbidden",
  );
  expectInlineSqlFailure(
    `set role service_role;
     select count(*)
     from expense_learning_private.learning_consent_decisions;`,
    "permission denied for schema expense_learning_private",
  );
  expect(
    expenseLearningConsentRowCount() === rowsBefore,
    "failed consent boundary checks changed the ledger",
  );
}

async function testExpenseLearningConsentBehavior(admin, users) {
  const sequential = await createUser(admin, "consent_sequential");
  const duplicate = await createUser(admin, "consent_duplicate");
  const race = await createUser(admin, "consent_race");
  const cascade = await createUser(admin, "consent_cascade");
  users.push(sequential, duplicate, race, cascade);

  const undecided = await waitForExpenseLearningConsentRpc(
    admin,
    sequential.id,
  );
  expectConsentState(undecided, "UNDECIDED", "fresh consent state");
  expect(undecided.data.decidedAt === null, "UNDECIDED had a decision time");

  const anonGet = await anon().rpc("get_expense_learning_consent_v1", {
    p_user_id: sequential.id,
  });
  expect(!opAllowed(anonGet), "anon executed consent getter");
  const authGet = await sequential.client.rpc(
    "get_expense_learning_consent_v1",
    { p_user_id: sequential.id },
  );
  expect(!opAllowed(authGet), "authenticated executed consent getter");

  const granted = await admin.rpc("set_expense_learning_consent_v1", {
    p_user_id: sequential.id,
    p_decision: consentDecision(true),
  });
  expectConsentState(granted, "GRANTED", "grant consent");
  expect(
    expenseLearningConsentRowCount(sequential.id) === 1,
    "grant did not append exactly one decision",
  );
  const duplicateGrant = await admin.rpc("set_expense_learning_consent_v1", {
    p_user_id: sequential.id,
    p_decision: consentDecision(true),
  });
  expectConsentState(duplicateGrant, "GRANTED", "idempotent grant");
  expect(
    duplicateGrant.data.decidedAt === granted.data.decidedAt &&
      expenseLearningConsentRowCount(sequential.id) === 1,
    "idempotent grant appended or changed its server time",
  );

  const invalid = await admin.rpc("set_expense_learning_consent_v1", {
    p_user_id: sequential.id,
    p_decision: { ...consentDecision(true), accountLabel: "forbidden" },
  });
  expect(!opAllowed(invalid), "consent setter accepted an unknown key");
  const stale = await admin.rpc("set_expense_learning_consent_v1", {
    p_user_id: sequential.id,
    p_decision: {
      ...consentDecision(true),
      noticeVersion: "expense-learning-notice.v0",
    },
  });
  expect(!opAllowed(stale), "consent setter accepted a stale notice version");
  expect(
    expenseLearningConsentRowCount(sequential.id) === 1,
    "invalid consent bodies changed the ledger",
  );

  const revoked = await admin.rpc("set_expense_learning_consent_v1", {
    p_user_id: sequential.id,
    p_decision: consentDecision(false),
  });
  expectConsentState(revoked, "REVOKED", "revoke consent");
  expect(
    expenseLearningConsentRowCount(sequential.id) === 2,
    "revocation did not preserve both decisions",
  );
  const currentRevoked = await admin.rpc("get_expense_learning_consent_v1", {
    p_user_id: sequential.id,
  });
  expectConsentState(currentRevoked, "REVOKED", "latest consent after revoke");

  applyInlineSql(`
    set role expense_learning_storage_owner;
    update expense_learning_private.learning_consent_decisions
    set granted = true
    where user_id = '${sequential.id}'::uuid;
    delete from expense_learning_private.learning_consent_decisions
    where user_id = '${sequential.id}'::uuid;
    reset role;
  `);
  expect(
    expenseLearningConsentRowCount(sequential.id) === 2 &&
      querySql(`
        select granted = false
        from expense_learning_private.learning_consent_decisions
        where user_id = '${sequential.id}'::uuid
        order by decision_id desc
        limit 1;
      `) === "t",
    "owner-only UPDATE or DELETE bypassed the append-only policies",
  );

  const duplicateResults = await Promise.all([
    admin.rpc("set_expense_learning_consent_v1", {
      p_user_id: duplicate.id,
      p_decision: consentDecision(true),
    }),
    admin.rpc("set_expense_learning_consent_v1", {
      p_user_id: duplicate.id,
      p_decision: consentDecision(true),
    }),
  ]);
  for (const result of duplicateResults) {
    expectConsentState(result, "GRANTED", "concurrent duplicate grant");
  }
  expect(
    expenseLearningConsentRowCount(duplicate.id) === 1,
    "concurrent identical grants were duplicated",
  );

  const raceResults = await Promise.all([
    admin.rpc("set_expense_learning_consent_v1", {
      p_user_id: race.id,
      p_decision: consentDecision(true),
    }),
    admin.rpc("set_expense_learning_consent_v1", {
      p_user_id: race.id,
      p_decision: consentDecision(false),
    }),
  ]);
  expect(
    raceResults.every(opAllowed),
    "concurrent grant/revoke did not serialize successfully",
  );
  expect(
    expenseLearningConsentRowCount(race.id) === 2,
    "concurrent grant/revoke lost a decision",
  );
  const latestRaceState = querySql(`
    select case when granted then 'GRANTED' else 'REVOKED' end
    from expense_learning_private.learning_consent_decisions
    where user_id = '${race.id}'::uuid
    order by decision_id desc
    limit 1;
  `);
  const raceGet = await admin.rpc("get_expense_learning_consent_v1", {
    p_user_id: race.id,
  });
  expectConsentState(raceGet, latestRaceState, "serialized race latest state");

  const cascadeGrant = await admin.rpc("set_expense_learning_consent_v1", {
    p_user_id: cascade.id,
    p_decision: consentDecision(true),
  });
  expectConsentState(cascadeGrant, "GRANTED", "cascade seed grant");
  const { error: cascadeDeleteError } = await admin.auth.admin.deleteUser(
    cascade.id,
  );
  expect(!cascadeDeleteError, "could not delete synthetic cascade user");
  expect(
    expenseLearningConsentRowCount(cascade.id) === 0,
    "account deletion did not purge its consent ledger",
  );

  for (const user of [sequential, duplicate, race]) {
    const { error } = await admin.auth.admin.deleteUser(user.id);
    expect(!error, `could not delete synthetic consent user ${user.id}`);
  }
  expect(
    expenseLearningConsentRowCount() === 0,
    "synthetic consent behavior left ledger rows",
  );
  expect(
    querySql(`
      select
        (select count(*) from expense_learning_private.contribution_claims) = 0
        and (select count(*) from expense_learning_private.contributor_week_limits) = 0
        and (select count(*) from expense_learning_private.accumulator_memberships) = 0
        and (select count(*) from expense_learning_private.protected_accumulators) = 0
        and (select count(*) from expense_learning_private.contributor_revocation_links) = 0;
    `) === "t" && expenseLearningP4bTableCounts() === "4,4",
    "consent behavior changed raw or promoted expense learning storage",
  );
}

async function testExpenseLearningConsentRollback(
  admin,
  users,
  initialCatalogSnapshot,
) {
  const rollbackUser = await createUser(admin, "consent_rollback");
  users.push(rollbackUser);
  const grant = await admin.rpc("set_expense_learning_consent_v1", {
    p_user_id: rollbackUser.id,
    p_decision: consentDecision(true),
  });
  expectConsentState(grant, "GRANTED", "rollback guard seed");

  expectSqlFileFailure(
    expenseLearningConsentSql.down,
    "Expense learning consent ledger is not empty; rollback is unsafe",
  );
  expect(
    expenseLearningConsentRowCount(rollbackUser.id) === 1,
    "failed consent rollback partially removed its ledger",
  );

  const { error } = await admin.auth.admin.deleteUser(rollbackUser.id);
  expect(!error, "could not purge synthetic rollback consent user");
  expect(
    expenseLearningConsentRowCount() === 0,
    "account cascade did not unblock controlled local rollback",
  );

  applySql(expenseLearningConsentSql.down);
  expect(
    querySql(`
      select pg_catalog.to_regclass(
        'expense_learning_private.learning_consent_decisions'
      ) is null
        and pg_catalog.to_regclass(
          'expense_learning_private.protected_accumulators'
        ) is not null;
    `) === "t",
    "consent rollback removed or damaged P1B storage",
  );
  applySql(expenseLearningConsentSql.up);
  expect(
    expenseLearningConsentCatalogSnapshot() === initialCatalogSnapshot,
    "consent up/down/up changed normalized catalog semantics",
  );
}

async function testExpenseLearningP4Rollback(
  admin,
  users,
  initialCatalogSnapshot,
) {
  const rollbackUser = await createUser(admin, "learning_p4_rollback");
  users.push(rollbackUser);
  await setExpenseLearningConsent(
    admin,
    rollbackUser.id,
    true,
    "P4A rollback grant",
  );
  expect(
    stageExpenseLearning(
      rollbackUser.id,
      randomExpenseLearningHex(),
      randomExpenseLearningHex(),
    ) === "ACCEPTED",
    "P4A rollback guard fixture was not accepted",
  );

  expectSqlFileFailure(
    expenseLearningRetentionSql.down,
    "Expense learning P4A storage is not empty; rollback is unsafe",
  );
  expect(
    expenseLearningP3TableCounts() === "1,1,67,67,0,1",
    "failed P4A rollback partially changed protected storage",
  );

  await setExpenseLearningConsent(
    admin,
    rollbackUser.id,
    false,
    "P4A rollback revoke",
  );
  expect(
    expenseLearningP3RuntimeRowCount() === 0,
    "P4A revoke did not unblock controlled rollback",
  );
  applySql(expenseLearningRetentionSql.down);
  expect(
    querySql(`
      with claims as materialized (
        select pg_catalog.set_config(
          'request.jwt.claim.role',
          'service_role',
          true
        )
      )
      select public.purge_expense_learning_retention_v1()
      from claims;
    `) === "DISABLED",
    "P4A rollback did not restore the disabled purge stub",
  );
  expect(
    querySql(`
      select pg_catalog.to_regprocedure(
        'expense_learning_private.run_expense_learning_retention_v1(timestamp with time zone)'
      ) is null;
    `) === "t",
    "P4A rollback retained private maintenance functions",
  );

  applySql(expenseLearningRetentionSql.up);
  expect(
    expenseLearningP4CatalogSnapshot() === initialCatalogSnapshot,
    "P4A up/down/up changed normalized catalog semantics",
  );
  applySql(expenseLearningRetentionSql.down);
  expect(
    expenseLearningP3CatalogSnapshot() !== initialCatalogSnapshot,
    "P4A rollback did not restore the P3A catalog",
  );

  const { error } = await admin.auth.admin.deleteUser(rollbackUser.id);
  expect(!error, "could not delete P4A rollback user");
}

function testExpenseLearningP4bRollback(initialP4aCatalogSnapshot) {
  expectSqlFileFailure(
    expenseLearningPromotionSql.down,
    "Expense learning P4B storage is not empty; rollback is unsafe",
  );
  expect(
    expenseLearningP4bTableCounts() === "4,4",
    "failed P4B rollback partially changed promoted storage",
  );

  querySqlAsLearningOwner(`
    delete from expense_learning_private.closed_week_supported_metrics;
    delete from expense_learning_private.closed_week_promotion_batches
  `);
  expect(
    expenseLearningP4bTableCounts() === "0,0",
    "controlled P4B rollback cleanup did not empty promoted storage",
  );
  applySql(expenseLearningPromotionSql.down);
  expect(
    expenseLearningP4CatalogSnapshot() === initialP4aCatalogSnapshot,
    "P4B rollback did not restore the P4A catalog",
  );
  expect(
    querySql(`
      with claims as materialized (
        select pg_catalog.set_config(
          'request.jwt.claim.role',
          'service_role',
          true
        )
      )
      select public.promote_expense_learning_closed_weeks_v1()
      from claims;
    `) === "DISABLED",
    "P4B rollback did not restore the disabled promotion stub",
  );
}

async function testExpenseLearningP3Rollback(
  admin,
  users,
  initialCatalogSnapshot,
) {
  const rollbackUser = await createUser(admin, "learning_p3_rollback");
  users.push(rollbackUser);
  await setExpenseLearningConsent(
    admin,
    rollbackUser.id,
    true,
    "P3A rollback grant",
  );
  expect(
    stageExpenseLearning(
      rollbackUser.id,
      randomExpenseLearningHex(),
      randomExpenseLearningHex(),
    ) === "ACCEPTED",
    "P3A rollback guard fixture was not accepted",
  );

  expectSqlFileFailure(
    expenseLearningIngestionSql.down,
    "Expense learning P3A storage is not empty; rollback is unsafe",
  );
  expect(
    expenseLearningP3TableCounts() === "1,1,67,67,0,1",
    "failed P3A rollback partially changed protected storage",
  );

  await setExpenseLearningConsent(
    admin,
    rollbackUser.id,
    false,
    "P3A rollback revoke",
  );
  expect(
    expenseLearningP3RuntimeRowCount() === 0,
    "P3A revoke did not unblock controlled rollback",
  );
  applySql(expenseLearningIngestionSql.down);
  expect(
    querySql(`
      select pg_catalog.to_regclass(
        'expense_learning_private.contributor_revocation_links'
      ) is null
        and pg_catalog.to_regclass(
          'expense_learning_private.learning_consent_decisions'
        ) is not null
        and pg_catalog.to_regclass(
          'expense_learning_private.protected_accumulators'
        ) is not null;
    `) === "t",
    "P3A rollback removed or damaged P2A/P1B storage",
  );
  expect(
    querySql(`
      select not pg_catalog.has_schema_privilege(
        'expense_learning_storage_owner',
        'extensions',
        'USAGE'
      );
    `) === "t",
    "P3A rollback retained extensions schema USAGE",
  );
  applySql(expenseLearningIngestionSql.up);
  expect(
    expenseLearningP3CatalogSnapshot() === initialCatalogSnapshot,
    "P3A up/down/up changed normalized catalog semantics",
  );
  applySql(expenseLearningIngestionSql.down);
  expect(
    querySql(`
      select pg_catalog.to_regclass(
        'expense_learning_private.contributor_revocation_links'
      ) is null;
    `) === "t",
    "P3A rollback did not leave P2A ready for its own rollback gate",
  );

  const { error } = await admin.auth.admin.deleteUser(rollbackUser.id);
  expect(!error, "could not delete P3A rollback user");
}

function testExpenseLearningRollback(
  initialCatalogSnapshot,
  consentCatalogSnapshot,
) {
  applySql(expenseLearningConsentSql.down);
  applyInlineSql(`
    insert into expense_learning_private.contribution_claims (
      claim_token_digest,
      claimed_at,
      expires_at
    ) values (
      pg_catalog.decode(pg_catalog.repeat('ab', 32), 'hex'),
      timestamptz '2099-01-01 00:00:00+00',
      timestamptz '2099-01-01 01:00:00+00'
    );
  `);
  try {
    expectSqlFileFailure(
      expenseLearningSql.down,
      "Expense learning runtime storage is not empty; rollback is unsafe",
    );
    expect(
      querySql(
        "select pg_catalog.to_regnamespace('expense_learning_private') is not null;",
      ) === "t",
      "failed rollback partially removed expense learning schema",
    );
  } finally {
    applyInlineSql("delete from expense_learning_private.contribution_claims;");
  }

  applySql(expenseLearningSql.down);
  expect(
    querySql(
      "select pg_catalog.to_regnamespace('expense_learning_private') is null;",
    ) === "t",
    "clean rollback did not remove expense learning schema",
  );
  expect(
    querySql(`
      select not exists (
        select 1 from pg_catalog.pg_roles
        where rolname = 'expense_learning_storage_owner'
      );
    `) === "t",
    "clean rollback did not remove expense learning owner role",
  );
  applySql(expenseLearningSql.up);
  expect(
    expenseLearningCatalogSnapshot() === initialCatalogSnapshot,
    "expense learning up/down/up changed normalized catalog semantics",
  );
  applySql(expenseLearningConsentSql.up);
  expect(
    expenseLearningConsentCatalogSnapshot() === consentCatalogSnapshot,
    "P1B rollback cycle changed consent P2A catalog semantics",
  );
}

async function matrixSelect(client, table, filters) {
  let query = client.from(table).select("*");
  for (const [key, value] of Object.entries(filters))
    query = query.eq(key, value);
  return query;
}

async function testTableMatrix(admin, userA, userB) {
  const tables = [
    {
      name: "user_subscriptions",
      ownFilter: { user_id: userA.id },
      otherFilter: { user_id: userB.id },
      insertRow: { user_id: userA.id, plan: "pro", status: "active" },
      update: { status: "past_due" },
    },
    {
      name: "user_usage",
      ownFilter: { user_id: userA.id, month_key: monthKey },
      otherFilter: { user_id: userB.id, month_key: monthKey },
      insertRow: { user_id: userA.id, month_key: `${monthKey}-x` },
      update: { documents_created: 9 },
    },
    {
      name: "payment_receipts",
      ownFilter: { user_id: userA.id },
      otherFilter: { user_id: userB.id },
      insertRow: {
        user_id: userA.id,
        stripe_event_id: `${prefix}_attack_receipt`,
        amount_cents: 1,
        currency: "eur",
        description: `${prefix}_attack`,
      },
      update: { amount_cents: 999 },
    },
    {
      name: "stripe_events",
      ownFilter: { stripe_event_id: `${prefix}_stripe_a` },
      otherFilter: { stripe_event_id: `${prefix}_stripe_a` },
      insertRow: {
        stripe_event_id: `${prefix}_attack_stripe`,
        event_type: "invoice.paid",
        status: "processed",
      },
      update: { status: "failed" },
      authNoAccess: true,
    },
  ];

  for (const table of tables) {
    const own = await matrixSelect(userA.client, table.name, table.ownFilter);
    if (table.authNoAccess) {
      expect(
        !opAllowed(own),
        `${table.name}: authenticated SELECT should be denied`,
      );
    } else {
      expect(opAllowed(own), `${table.name}: authenticated own SELECT failed`);
      expect(
        own.data.length >= 1,
        `${table.name}: authenticated own SELECT returned no rows`,
      );
    }

    const other = await matrixSelect(
      userA.client,
      table.name,
      table.otherFilter,
    );
    if (!table.authNoAccess) {
      expect(
        opAllowed(other),
        `${table.name}: authenticated other SELECT should be RLS-filtered, not fail`,
      );
      expect(
        other.data.length === 0,
        `${table.name}: authenticated other SELECT leaked rows`,
      );
    }

    for (const [role, client] of [
      ["anon", anon()],
      ["authenticated", userA.client],
    ]) {
      const insert = await client.from(table.name).insert(table.insertRow);
      expect(
        !opAllowed(insert),
        `${table.name}: ${role} INSERT unexpectedly allowed`,
      );
      const update = await client
        .from(table.name)
        .update(table.update)
        .match(table.ownFilter);
      expect(
        !opAllowed(update),
        `${table.name}: ${role} UPDATE unexpectedly allowed`,
      );
      const del = await client.from(table.name).delete().match(table.ownFilter);
      expect(
        !opAllowed(del),
        `${table.name}: ${role} DELETE unexpectedly allowed`,
      );
    }

    const serviceSelect = await matrixSelect(
      admin,
      table.name,
      table.ownFilter,
    );
    expect(opAllowed(serviceSelect), `${table.name}: service SELECT failed`);
  }
}

async function testRpcPermissionsAndConcurrency(admin, userA) {
  const rpcArgs = {
    p_user_id: userA.id,
    p_month_key: monthKey,
    p_cost_units: 1,
    p_customer_ai_autofills_increment: 1,
    p_expense_scans_increment: 0,
    p_pro_monthly_units: 300,
    p_free_trial_decrement: 1,
  };

  const anonRpc = await anon().rpc("consume_ai_units", rpcArgs);
  expect(!opAllowed(anonRpc), "anon executed consume_ai_units");
  const authRpc = await userA.client.rpc("consume_ai_units", rpcArgs);
  expect(!opAllowed(authRpc), "authenticated executed consume_ai_units");

  await admin
    .from("user_subscriptions")
    .update({ ai_credit_units: 1, scan_credits: 0 })
    .eq("user_id", userA.id);
  await admin.from("user_usage").upsert({
    user_id: userA.id,
    month_key: monthKey,
    expense_scans_created: 30,
    customer_ai_autofills_created: 0,
    documents_created: 0,
  });

  const [first, second] = await Promise.all([
    admin.rpc("consume_ai_units", rpcArgs),
    admin.rpc("consume_ai_units", rpcArgs),
  ]);
  const allowedCount = [first, second].filter(
    (item) => item.data?.[0]?.allowed === true,
  ).length;
  expect(
    allowedCount === 1,
    `Expected exactly one concurrent consume success, got ${allowedCount}`,
  );

  const { data: afterConsume, error: afterConsumeError } = await admin
    .from("user_subscriptions")
    .select("ai_credit_units")
    .eq("user_id", userA.id)
    .single();
  expect(!afterConsumeError, "Could not inspect ai_credit_units after consume");
  expect(
    afterConsume.ai_credit_units === 0,
    `Expected ai_credit_units=0, got ${afterConsume.ai_credit_units}`,
  );

  const grantAnon = await anon().rpc("grant_ai_credit_units", {
    p_user_id: userA.id,
    p_scan_credits: 1,
  });
  expect(!opAllowed(grantAnon), "anon executed grant_ai_credit_units");

  const [grantA, grantB] = await Promise.all([
    admin.rpc("grant_ai_credit_units", {
      p_user_id: userA.id,
      p_scan_credits: 2,
    }),
    admin.rpc("grant_ai_credit_units", {
      p_user_id: userA.id,
      p_scan_credits: 3,
    }),
  ]);
  expect(
    opAllowed(grantA) && grantA.data === true,
    "first concurrent grant failed",
  );
  expect(
    opAllowed(grantB) && grantB.data === true,
    "second concurrent grant failed",
  );

  const { data: afterGrant } = await admin
    .from("user_subscriptions")
    .select("scan_credits,ai_credit_units")
    .eq("user_id", userA.id)
    .single();
  expect(
    afterGrant.scan_credits === 5,
    `Expected scan_credits=5, got ${afterGrant.scan_credits}`,
  );
  expect(
    afterGrant.ai_credit_units === 50,
    `Expected ai_credit_units=50, got ${afterGrant.ai_credit_units}`,
  );
}

async function claimStripeEvent(
  admin,
  eventId,
  eventType,
  claimedAt,
  leaseSeconds = 30,
) {
  const result = await admin.rpc("reserve_stripe_event_attempt", {
    p_event_id: eventId,
    p_event_type: eventType,
    p_lease_seconds: leaseSeconds,
    p_claimed_at: claimedAt,
  });
  expect(
    opAllowed(result),
    `Could not claim ${eventId}: ${result.error?.message}`,
  );
  expect(result.data?.length === 1, `Claim ${eventId} returned no row`);
  return result.data[0];
}

async function failStripeAttempt(admin, eventId, token, failedAt) {
  return admin.rpc("fail_stripe_event_attempt", {
    p_event_id: eventId,
    p_attempt_token: token,
    p_error_code: "handler_failed",
    p_failed_at: failedAt,
  });
}

async function testStripeLeaseAndPackRpcs(admin, userA, userB) {
  const start = "2099-01-01T00:00:00.000Z";
  const active = "2099-01-01T00:00:10.000Z";
  const expired = "2099-01-01T00:00:31.000Z";
  const afterReclaim = "2099-01-01T00:00:32.000Z";
  const eventId = `${prefix}_evt_lease`;

  const anonClaim = await anon().rpc("reserve_stripe_event_attempt", {
    p_event_id: `${prefix}_anon_claim`,
    p_event_type: "invoice.paid",
    p_lease_seconds: 30,
    p_claimed_at: start,
  });
  expect(!opAllowed(anonClaim), "anon reserved a Stripe event");
  const authClaim = await userA.client.rpc("reserve_stripe_event_attempt", {
    p_event_id: `${prefix}_auth_claim`,
    p_event_type: "invoice.paid",
    p_lease_seconds: 30,
    p_claimed_at: start,
  });
  expect(!opAllowed(authClaim), "authenticated user reserved a Stripe event");

  const deniedRpcs = [
    [
      "complete_stripe_event_attempt",
      {
        p_event_id: `${prefix}_denied_complete`,
        p_attempt_token: randomUUID(),
        p_completed_at: start,
      },
    ],
    [
      "fail_stripe_event_attempt",
      {
        p_event_id: `${prefix}_denied_fail`,
        p_attempt_token: randomUUID(),
        p_error_code: "handler_failed",
        p_failed_at: start,
      },
    ],
    [
      "complete_stripe_scan_pack_event",
      {
        p_event_id: `${prefix}_denied_pack`,
        p_attempt_token: randomUUID(),
        p_user_id: userA.id,
        p_checkout_session_id: `cs_test_${prefix}_denied`,
        p_scan_credits: 10,
        p_units_per_scan: 10,
        p_payment_status: "paid",
        p_fulfillment_contract: "scan_pack_atomic_v1",
        p_completed_at: start,
      },
    ],
  ];
  for (const [rpcName, args] of deniedRpcs) {
    const [anonResult, authResult] = await Promise.all([
      anon().rpc(rpcName, args),
      userA.client.rpc(rpcName, args),
    ]);
    expect(!opAllowed(anonResult), `anon executed ${rpcName}`);
    expect(!opAllowed(authResult), `authenticated user executed ${rpcName}`);
  }

  const first = await claimStripeEvent(admin, eventId, "invoice.paid", start);
  expect(
    first.result_status === "acquired",
    "new Stripe event was not acquired",
  );
  expect(first.attempt_number === 1, "new Stripe event attempt was not 1");

  const busy = await claimStripeEvent(admin, eventId, "invoice.paid", active);
  expect(busy.result_status === "busy", "active Stripe lease was not busy");

  const reclaimed = await claimStripeEvent(
    admin,
    eventId,
    "invoice.paid",
    expired,
  );
  expect(
    reclaimed.result_status === "acquired",
    "expired Stripe lease was not reclaimed",
  );
  expect(
    reclaimed.attempt_number === 2,
    "reclaimed attempt count was not incremented",
  );
  expect(
    reclaimed.lease_token !== first.lease_token,
    "reclaim reused the old token",
  );

  const staleComplete = await admin.rpc("complete_stripe_event_attempt", {
    p_event_id: eventId,
    p_attempt_token: first.lease_token,
    p_completed_at: afterReclaim,
  });
  expect(
    opAllowed(staleComplete) && staleComplete.data === "stale_attempt",
    "old Stripe token completed after reclaim",
  );
  const failed = await failStripeAttempt(
    admin,
    eventId,
    reclaimed.lease_token,
    afterReclaim,
  );
  expect(
    opAllowed(failed) && failed.data === "failed",
    "current Stripe token did not fail",
  );
  const retry = await claimStripeEvent(
    admin,
    eventId,
    "invoice.paid",
    "2099-01-01T00:00:33.000Z",
  );
  expect(
    retry.result_status === "acquired",
    "failed Stripe event was not retried",
  );
  const completed = await admin.rpc("complete_stripe_event_attempt", {
    p_event_id: eventId,
    p_attempt_token: retry.lease_token,
    p_completed_at: "2099-01-01T00:00:34.000Z",
  });
  expect(
    opAllowed(completed) && completed.data === "processed",
    "retry was not processed",
  );

  await admin
    .from("user_subscriptions")
    .update({ scan_credits: 0, ai_credit_units: 0 })
    .in("user_id", [userA.id, userB.id]);

  for (const nullField of [
    "effect_kind",
    "effect_fulfillment_contract",
    "effect_scan_credits",
    "effect_payment_status",
  ]) {
    const malformedEffect = await admin.from("stripe_events").insert({
      stripe_event_id: `${prefix}_evt_malformed_${nullField}`,
      event_type: "checkout.session.completed",
      status: "processed",
      effect_key: `scan_pack:cs_test_${prefix}_malformed_${nullField}`,
      effect_kind: "scan_pack",
      effect_fulfillment_contract: "scan_pack_atomic_v1",
      effect_user_id: userA.id,
      effect_scan_credits: 10,
      effect_ai_credit_units: 100,
      effect_payment_status: "paid",
      effect_applied_at: active,
      [nullField]: null,
    });
    expect(
      !opAllowed(malformedEffect),
      `effect ledger accepted NULL in ${nullField}`,
    );
  }

  const sessionId = `cs_test_${prefix}_atomic`;
  const packA = await claimStripeEvent(
    admin,
    `${prefix}_evt_pack_a`,
    "checkout.session.completed",
    start,
  );
  const packB = await claimStripeEvent(
    admin,
    `${prefix}_evt_pack_b`,
    "checkout.session.async_payment_succeeded",
    start,
  );
  const completeArgs = (event, token, userId = userA.id) => ({
    p_event_id: event,
    p_attempt_token: token,
    p_user_id: userId,
    p_checkout_session_id: sessionId,
    p_scan_credits: 10,
    p_units_per_scan: 10,
    p_payment_status: "paid",
    p_fulfillment_contract: "scan_pack_atomic_v1",
    p_completed_at: active,
  });
  const [packResultA, packResultB] = await Promise.all([
    admin.rpc(
      "complete_stripe_scan_pack_event",
      completeArgs(`${prefix}_evt_pack_a`, packA.lease_token),
    ),
    admin.rpc(
      "complete_stripe_scan_pack_event",
      completeArgs(`${prefix}_evt_pack_b`, packB.lease_token),
    ),
  ]);
  expect(
    opAllowed(packResultA) && opAllowed(packResultB),
    "concurrent pack RPC failed",
  );
  const packStatuses = [
    packResultA.data?.[0]?.result_status,
    packResultB.data?.[0]?.result_status,
  ].sort();
  expect(
    JSON.stringify(packStatuses) ===
      JSON.stringify(["already_applied", "applied"]),
    `unexpected concurrent pack results: ${packStatuses.join(",")}`,
  );

  const { data: afterPack, error: afterPackError } = await admin
    .from("user_subscriptions")
    .select("scan_credits,ai_credit_units")
    .eq("user_id", userA.id)
    .single();
  expect(!afterPackError, "could not inspect pack credits");
  expect(
    afterPack.scan_credits === 10,
    `pack credited ${afterPack.scan_credits} scans`,
  );
  expect(
    afterPack.ai_credit_units === 100,
    `pack credited ${afterPack.ai_credit_units} units`,
  );

  const replay = await admin.rpc(
    "complete_stripe_scan_pack_event",
    completeArgs(`${prefix}_evt_pack_a`, packA.lease_token),
  );
  expect(
    opAllowed(replay) && replay.data?.[0]?.result_status === "stale_attempt",
    "response-loss replay reused a completed token",
  );

  const conflict = await claimStripeEvent(
    admin,
    `${prefix}_evt_pack_conflict`,
    "checkout.session.async_payment_succeeded",
    start,
  );
  const conflictResult = await admin.rpc(
    "complete_stripe_scan_pack_event",
    completeArgs(`${prefix}_evt_pack_conflict`, conflict.lease_token, userB.id),
  );
  expect(
    opAllowed(conflictResult) &&
      conflictResult.data?.[0]?.result_status === "effect_conflict",
    "same checkout with another user was not blocked",
  );

  const missingEventId = `${prefix}_evt_pack_missing`;
  const missing = await claimStripeEvent(
    admin,
    missingEventId,
    "checkout.session.completed",
    start,
  );
  const missingResult = await admin.rpc("complete_stripe_scan_pack_event", {
    ...completeArgs(missingEventId, missing.lease_token, randomUUID()),
    p_checkout_session_id: `cs_test_${prefix}_missing`,
  });
  expect(
    !opAllowed(missingResult),
    "missing subscription pack unexpectedly succeeded",
  );
  const { data: missingRow } = await admin
    .from("stripe_events")
    .select("status,effect_key")
    .eq("stripe_event_id", missingEventId)
    .single();
  expect(
    missingRow.status === "processing" && missingRow.effect_key === null,
    "failed pack RPC partially committed its event effect",
  );

  const wrongContractEventId = `${prefix}_evt_pack_wrong_contract`;
  const wrongContract = await claimStripeEvent(
    admin,
    wrongContractEventId,
    "checkout.session.completed",
    start,
  );
  const wrongContractResult = await admin.rpc(
    "complete_stripe_scan_pack_event",
    {
      ...completeArgs(wrongContractEventId, wrongContract.lease_token),
      p_checkout_session_id: `cs_test_${prefix}_wrong_contract`,
      p_fulfillment_contract: "scan_pack_legacy",
    },
  );
  expect(
    !opAllowed(wrongContractResult),
    "pack RPC accepted an unknown fulfillment contract",
  );
  const { data: wrongContractRow } = await admin
    .from("stripe_events")
    .select("status,effect_key")
    .eq("stripe_event_id", wrongContractEventId)
    .single();
  expect(
    wrongContractRow.status === "processing" &&
      wrongContractRow.effect_key === null,
    "wrong fulfillment contract partially committed an effect",
  );
}

async function testLegacyStripeCutover(admin) {
  for (const suffix of ["processing", "failed"]) {
    const eventId = `${prefix}_legacy_${suffix}`;
    const { data: before, error: beforeError } = await admin
      .from("stripe_events")
      .select(
        "status,attempt_count,attempt_token,lease_expires_at,legacy_review_required",
      )
      .eq("stripe_event_id", eventId)
      .single();
    expect(!beforeError, `Could not inspect legacy ${suffix}`);
    expect(
      before.status === "failed" &&
        before.attempt_count === 0 &&
        before.attempt_token === null &&
        before.lease_expires_at === null &&
        before.legacy_review_required === true,
      `Legacy ${suffix} was not parked for manual review`,
    );

    const reservation = await claimStripeEvent(
      admin,
      eventId,
      "checkout.session.completed",
      "2099-01-01T00:00:00.000Z",
    );
    expect(
      reservation.result_status === "manual_review",
      `Legacy ${suffix} was reclaimed automatically`,
    );
    const { data: after } = await admin
      .from("stripe_events")
      .select(
        "status,attempt_count,attempt_token,lease_expires_at,legacy_review_required",
      )
      .eq("stripe_event_id", eventId)
      .single();
    expect(
      JSON.stringify(after) === JSON.stringify(before),
      `Legacy ${suffix} changed while previewing manual review`,
    );
    const oldWorkerClose = await admin
      .from("stripe_events")
      .update({ status: "processed" })
      .eq("stripe_event_id", eventId);
    expect(
      !opAllowed(oldWorkerClose),
      `Legacy ${suffix} could be hidden as processed without review`,
    );
  }
}

function stripePayload(event) {
  return JSON.stringify(event);
}

function stripeSignature(payload) {
  return Stripe.webhooks.generateTestHeaderString({
    payload,
    secret: env("PHASE1_ACCEPTANCE_STRIPE_WEBHOOK_SECRET"),
  });
}

async function postStripe(event) {
  const payload = stripePayload(event);
  return fetch(
    `${env("PHASE1_ACCEPTANCE_APP_URL").replace(/\/$/, "")}/api/webhooks/stripe`,
    {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "stripe-signature": stripeSignature(payload),
      },
      body: payload,
    },
  );
}

async function testStripe(admin, userA) {
  const invalid = await fetch(
    `${env("PHASE1_ACCEPTANCE_APP_URL").replace(/\/$/, "")}/api/webhooks/stripe`,
    {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "stripe-signature": "invalid",
      },
      body: "{}",
    },
  );
  expect(invalid.status >= 400, "invalid Stripe signature was accepted");

  const event = {
    id: `${prefix}_evt_delete`,
    type: "customer.subscription.deleted",
    data: { object: { id: "sub_test", metadata: { user_id: userA.id } } },
  };
  const fresh = await postStripe(event);
  expect(fresh.ok, `new Stripe event failed with HTTP ${fresh.status}`);
  const duplicate = await postStripe(event);
  expect(
    duplicate.ok,
    `duplicate Stripe event failed with HTTP ${duplicate.status}`,
  );

  const raceEvent = {
    id: `${prefix}_evt_race`,
    type: "customer.subscription.deleted",
    data: { object: { id: "sub_race", metadata: { user_id: userA.id } } },
  };
  const [raceA, raceB] = await Promise.all([
    postStripe(raceEvent),
    postStripe(raceEvent),
  ]);
  const raceStatuses = [raceA.status, raceB.status];
  expect(
    raceStatuses.includes(200) &&
      raceStatuses.every((status) => status === 200 || status === 503),
    `concurrent duplicate Stripe statuses were ${raceStatuses.join(",")}`,
  );
  if (raceStatuses.includes(503)) {
    const raceRetry = await postStripe(raceEvent);
    expect(
      raceRetry.ok,
      `busy Stripe retry failed with HTTP ${raceRetry.status}`,
    );
  }
  const { data: raceRows } = await admin
    .from("stripe_events")
    .select("*")
    .eq("stripe_event_id", raceEvent.id);
  expect(
    raceRows.length === 1,
    "concurrent Stripe requests created duplicate event rows",
  );

  const retryEvent = {
    id: `${prefix}_evt_retry`,
    type: "customer.subscription.deleted",
    data: { object: { id: "sub_retry", metadata: { user_id: userA.id } } },
  };
  const retryAttempt = await claimStripeEvent(
    admin,
    retryEvent.id,
    retryEvent.type,
    "2099-01-01T00:00:00.000Z",
  );
  const seededFailure = await failStripeAttempt(
    admin,
    retryEvent.id,
    retryAttempt.lease_token,
    "2099-01-01T00:00:01.000Z",
  );
  expect(opAllowed(seededFailure), "Could not seed a retryable failed event");
  const retry = await postStripe(retryEvent);
  expect(
    retry.ok,
    `failed Stripe event retry did not process: HTTP ${retry.status}`,
  );
  const { data: retryRow } = await admin
    .from("stripe_events")
    .select("status")
    .eq("stripe_event_id", retryEvent.id)
    .single();
  expect(
    retryRow.status === "processed",
    `retried Stripe event ended as ${retryRow.status}`,
  );

  await admin
    .from("user_subscriptions")
    .update({ scan_credits: 0, ai_credit_units: 0 })
    .eq("user_id", userA.id);
  const checkoutSessionId = `cs_test_${prefix}_route_pack`;
  const checkoutObject = (paymentStatus) => ({
    id: checkoutSessionId,
    mode: "payment",
    payment_status: paymentStatus,
    metadata: {
      user_id: userA.id,
      checkout_type: "scan_pack",
      scan_credits: "10",
      fulfillment_contract: "scan_pack_atomic_v1",
    },
    customer: null,
    amount_total: 199,
    currency: "eur",
    created: stripeAtomicLedgerCutoverUnix,
  });
  const unpaidPack = {
    id: `${prefix}_evt_pack_unpaid`,
    type: "checkout.session.completed",
    data: { object: checkoutObject("unpaid") },
  };
  const unpaidResponse = await postStripe(unpaidPack);
  expect(
    unpaidResponse.ok,
    `unpaid checkout handling failed: ${unpaidResponse.status}`,
  );
  let { data: routeCredits } = await admin
    .from("user_subscriptions")
    .select("scan_credits,ai_credit_units")
    .eq("user_id", userA.id)
    .single();
  expect(
    routeCredits.scan_credits === 0,
    "unpaid checkout granted scan credits",
  );
  expect(
    routeCredits.ai_credit_units === 0,
    "unpaid checkout granted AI units",
  );

  const paidAsyncPack = {
    id: `${prefix}_evt_pack_async_paid`,
    type: "checkout.session.async_payment_succeeded",
    data: { object: checkoutObject("paid") },
  };
  const paidResponse = await postStripe(paidAsyncPack);
  expect(paidResponse.ok, `async paid checkout failed: ${paidResponse.status}`);
  const paidReplay = await postStripe(paidAsyncPack);
  expect(paidReplay.ok, `async paid replay failed: ${paidReplay.status}`);
  ({ data: routeCredits } = await admin
    .from("user_subscriptions")
    .select("scan_credits,ai_credit_units")
    .eq("user_id", userA.id)
    .single());
  expect(
    routeCredits.scan_credits === 10,
    `route pack credited ${routeCredits.scan_credits} scans`,
  );
  expect(
    routeCredits.ai_credit_units === 100,
    `route pack credited ${routeCredits.ai_credit_units} units`,
  );

  const secondPaidEvent = {
    id: `${prefix}_evt_pack_second_paid_event`,
    type: "checkout.session.completed",
    data: { object: checkoutObject("paid") },
  };
  const secondPaidResponse = await postStripe(secondPaidEvent);
  expect(
    secondPaidResponse.ok,
    `same checkout second event failed: ${secondPaidResponse.status}`,
  );
  ({ data: routeCredits } = await admin
    .from("user_subscriptions")
    .select("scan_credits,ai_credit_units")
    .eq("user_id", userA.id)
    .single());
  expect(routeCredits.scan_credits === 10, "same checkout was credited twice");

  const tamperedPack = {
    id: `${prefix}_evt_pack_tampered`,
    type: "checkout.session.completed",
    data: {
      object: {
        ...checkoutObject("paid"),
        id: `cs_test_${prefix}_tampered`,
        metadata: {
          ...checkoutObject("paid").metadata,
          scan_credits: "1000",
        },
      },
    },
  };
  const tamperedResponse = await postStripe(tamperedPack);
  expect(
    tamperedResponse.status === 500,
    "tampered pack metadata was accepted",
  );
  const { data: tamperedRow } = await admin
    .from("stripe_events")
    .select("status,error_message,effect_key")
    .eq("stripe_event_id", tamperedPack.id)
    .single();
  expect(
    tamperedRow.status === "failed",
    "tampered pack was not marked failed",
  );
  expect(
    tamperedRow.error_message === "invalid_checkout_state" &&
      tamperedRow.effect_key === null,
    "tampered pack persisted an unsafe effect",
  );

  const legacyPack = {
    id: `${prefix}_evt_pack_legacy_contract`,
    type: "checkout.session.async_payment_succeeded",
    data: {
      object: {
        ...checkoutObject("paid"),
        id: `cs_test_${prefix}_legacy_contract`,
        metadata: {
          user_id: userA.id,
          checkout_type: "scan_pack",
          scan_credits: "10",
        },
      },
    },
  };
  const legacyResponse = await postStripe(legacyPack);
  expect(
    legacyResponse.ok,
    `legacy pack was not parked: ${legacyResponse.status}`,
  );
  const legacyBody = await legacyResponse.json();
  expect(
    legacyBody.manualReview === true,
    "legacy pack did not report manual review",
  );
  const { data: legacyRow } = await admin
    .from("stripe_events")
    .select("status,error_message,legacy_review_required,effect_key")
    .eq("stripe_event_id", legacyPack.id)
    .single();
  expect(
    legacyRow.status === "failed" &&
      legacyRow.error_message === "legacy_checkout_unresolved" &&
      legacyRow.legacy_review_required === true &&
      legacyRow.effect_key === null,
    "legacy pack was not durably parked without an effect",
  );
  ({ data: routeCredits } = await admin
    .from("user_subscriptions")
    .select("scan_credits,ai_credit_units")
    .eq("user_id", userA.id)
    .single());
  expect(routeCredits.scan_credits === 10, "legacy pack changed scan credits");
  expect(routeCredits.ai_credit_units === 100, "legacy pack changed AI units");

  const cutoverPack = {
    id: `${prefix}_evt_pack_pre_atomic_cutover`,
    type: "checkout.session.async_payment_succeeded",
    data: {
      object: {
        ...checkoutObject("paid"),
        id: `cs_test_${prefix}_pre_atomic_cutover`,
        created: stripeAtomicLedgerCutoverUnix - 1,
      },
    },
  };
  const cutoverResponse = await postStripe(cutoverPack);
  expect(
    cutoverResponse.ok,
    `pre-cutover pack was not parked: ${cutoverResponse.status}`,
  );
  const cutoverBody = await cutoverResponse.json();
  expect(
    cutoverBody.manualReview === true,
    "pre-cutover pack did not report manual review",
  );
  const { data: cutoverRow } = await admin
    .from("stripe_events")
    .select("status,error_message,legacy_review_required,effect_key")
    .eq("stripe_event_id", cutoverPack.id)
    .single();
  expect(
    cutoverRow.status === "failed" &&
      cutoverRow.error_message === "legacy_checkout_unresolved" &&
      cutoverRow.legacy_review_required === true &&
      cutoverRow.effect_key === null,
    "pre-cutover pack was not durably parked without an effect",
  );
  ({ data: routeCredits } = await admin
    .from("user_subscriptions")
    .select("scan_credits,ai_credit_units")
    .eq("user_id", userA.id)
    .single());
  expect(routeCredits.scan_credits === 10, "pre-cutover pack changed credits");
  expect(
    routeCredits.ai_credit_units === 100,
    "pre-cutover pack changed AI units",
  );
}

async function main() {
  assertSafeEnvironment();
  run("psql", ["--version"]);

  console.log("Applying base SQL and Phase 1 migrations...");
  applySqlSequence([...sqlFiles.base, ...sqlFiles.up]);
  console.log("Validating up -> down -> up...");
  applySqlSequence(sqlFiles.down);
  applySqlSequence(sqlFiles.up.slice(0, 2));
  applyInlineSql(`
    insert into public.stripe_events (stripe_event_id, event_type, status)
    values
      ('${prefix}_legacy_processing', 'checkout.session.completed', 'processing'),
      ('${prefix}_legacy_failed', 'checkout.session.completed', 'failed');
  `);
  applySql(sqlFiles.up[2]);

  console.log("Validating expense learning P1B up -> down -> up...");
  if (expenseLearningSchemaExists()) {
    if (
      querySql(`
        select pg_catalog.to_regclass(
          'expense_learning_private.closed_week_promotion_batches'
        ) is not null;
      `) === "t"
    ) {
      console.log(
        "Resetting auto-applied empty expense learning P4B promotion...",
      );
      applySql(expenseLearningPromotionSql.down);
    }
    if (
      querySql(`
        select pg_catalog.to_regprocedure(
          'expense_learning_private.run_expense_learning_retention_v1(timestamp with time zone)'
        ) is not null;
      `) === "t"
    ) {
      console.log(
        "Resetting auto-applied empty expense learning P4A retention...",
      );
      applySql(expenseLearningRetentionSql.down);
    }
    if (
      querySql(`
        select pg_catalog.to_regclass(
          'expense_learning_private.contributor_revocation_links'
        ) is not null;
      `) === "t"
    ) {
      console.log(
        "Resetting auto-applied empty expense learning P3A ingestion...",
      );
      applySql(expenseLearningIngestionSql.down);
    }
    if (
      querySql(`
        select pg_catalog.to_regclass(
          'expense_learning_private.learning_consent_decisions'
        ) is not null;
      `) === "t"
    ) {
      console.log(
        "Resetting auto-applied empty expense learning P2A consent...",
      );
      applySql(expenseLearningConsentSql.down);
    }
    console.log("Resetting auto-applied empty expense learning P1B storage...");
    applySql(expenseLearningSql.down);
  }
  applySql(expenseLearningSql.up);
  const expenseLearningCatalog = expenseLearningCatalogSnapshot();
  applySql(expenseLearningSql.down);
  applySql(expenseLearningSql.up);
  expect(
    expenseLearningCatalogSnapshot() === expenseLearningCatalog,
    "expense learning initial up/down/up changed catalog semantics",
  );
  testExpenseLearningDatabaseBoundary();
  testExpenseLearningConstraints();

  console.log("Validating expense learning consent P2A up -> down -> up...");
  applySql(expenseLearningConsentSql.up);
  const expenseLearningConsentCatalog = expenseLearningConsentCatalogSnapshot();
  applySql(expenseLearningConsentSql.down);
  applySql(expenseLearningConsentSql.up);
  expect(
    expenseLearningConsentCatalogSnapshot() === expenseLearningConsentCatalog,
    "expense learning consent initial up/down/up changed catalog semantics",
  );

  console.log("Validating expense learning ingestion P3A up -> down -> up...");
  applySql(expenseLearningIngestionSql.up);
  const expenseLearningP3Catalog = expenseLearningP3CatalogSnapshot();
  applySql(expenseLearningIngestionSql.down);
  applySql(expenseLearningIngestionSql.up);
  expect(
    expenseLearningP3CatalogSnapshot() === expenseLearningP3Catalog,
    "expense learning ingestion initial up/down/up changed catalog semantics",
  );

  console.log("Validating expense learning retention P4A up -> down -> up...");
  applySql(expenseLearningRetentionSql.up);
  const expenseLearningP4Catalog = expenseLearningP4CatalogSnapshot();
  applySql(expenseLearningRetentionSql.down);
  applySql(expenseLearningRetentionSql.up);
  expect(
    expenseLearningP4CatalogSnapshot() === expenseLearningP4Catalog,
    "expense learning retention initial up/down/up changed catalog semantics",
  );

  console.log("Validating expense learning promotion P4B up -> down -> up...");
  applySql(expenseLearningPromotionSql.up);
  const expenseLearningP4bCatalog = expenseLearningP4CatalogSnapshot();
  applySql(expenseLearningPromotionSql.down);
  expect(
    expenseLearningP4CatalogSnapshot() === expenseLearningP4Catalog,
    "expense learning promotion rollback did not restore P4A",
  );
  applySql(expenseLearningPromotionSql.up);
  expect(
    expenseLearningP4CatalogSnapshot() === expenseLearningP4bCatalog,
    "expense learning promotion initial up/down/up changed catalog semantics",
  );

  const admin = service();
  const userA = await createUser(admin, "a");
  const userB = await createUser(admin, "b");
  const users = [userA, userB];

  try {
    await seedRows(admin, userA, userB);
    await testTableMatrix(admin, userA, userB);
    await testRpcPermissionsAndConcurrency(admin, userA);
    await testExpenseLearningDataApi(admin, userA);
    testExpenseLearningP3DatabaseBoundary();
    testExpenseLearningP4DatabaseBoundary();
    testExpenseLearningConsentDatabaseBoundary(userA.id);
    console.log("Testing expense learning P3A semantic rejection...");
    await testExpenseLearningP3SemanticRejection(admin, users);
    console.log("Testing expense learning P3A behavior and revocation...");
    await testExpenseLearningP3Behavior(admin, users);
    console.log("Testing expense learning P3A one-shot claim race...");
    await testExpenseLearningP3ClaimRace(admin, users);
    console.log("Testing expense learning P3A account deletion races...");
    await testExpenseLearningP3AccountDeleteRaces(admin, users);
    console.log("Testing expense learning P4A repair and retention...");
    await testExpenseLearningP4RepairAndRetention(admin, users);
    console.log("Testing expense learning P4B closed-week promotion...");
    await testExpenseLearningP4bPromotion(admin, users);
    await testExpenseLearningConsentBehavior(admin, users);
    await testLegacyStripeCutover(admin);
    await testStripeLeaseAndPackRpcs(admin, userA, userB);
    await testStripe(admin, userA);
    expectSqlFileFailure(
      sqlFiles.down[0],
      "Stripe webhook ledger is not empty; rollback is unsafe",
    );
    testExpenseLearningP4bRollback(expenseLearningP4Catalog);
    await testExpenseLearningP4Rollback(admin, users, expenseLearningP4Catalog);
    await testExpenseLearningP3Rollback(admin, users, expenseLearningP3Catalog);
    await testExpenseLearningConsentRollback(
      admin,
      users,
      expenseLearningConsentCatalog,
    );
    testExpenseLearningRollback(
      expenseLearningCatalog,
      expenseLearningConsentCatalog,
    );
  } finally {
    await cleanup(admin, users).catch((error) => {
      console.error("Cleanup failed:", error.message);
    });
  }

  console.log("Phase 1 acceptance checks passed.");
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
