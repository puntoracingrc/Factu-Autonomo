#!/usr/bin/env node
import { spawnSync } from "node:child_process";
import { randomUUID } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import Stripe from "stripe";
import { createClient } from "@supabase/supabase-js";

const root = path.resolve(new URL("../../", import.meta.url).pathname);
const prefix = `phase1_${randomUUID().replace(/-/g, "_")}`;
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
  ],
  down: [
    "supabase/rollbacks/20260624000200_phase1_rpc_search_path_hardening.down.sql",
    "supabase/rollbacks/20260624000100_phase1_hardening.down.sql",
  ],
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
    fail("Refusing destructive run: set PHASE1_ACCEPTANCE_ALLOW_DESTRUCTIVE=true");
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
    fail("Staging runs require PHASE1_ACCEPTANCE_STAGING_CONFIRM=I_UNDERSTAND_THIS_IS_DESTRUCTIVE");
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
  if (error || !data.user) fail(`Could not create user ${label}: ${error?.message}`);
  const client = anon();
  const { error: signInError } = await client.auth.signInWithPassword({
    email,
    password,
  });
  if (signInError) fail(`Could not sign in user ${label}: ${signInError.message}`);
  return { id: data.user.id, email, client };
}

async function cleanup(admin, users) {
  await admin.from("stripe_events").delete().like("stripe_event_id", `${prefix}%`);
  await admin.from("payment_receipts").delete().like("description", `${prefix}%`);
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
  if (stripeEventError) fail(`Could not seed stripe events: ${stripeEventError.message}`);
}

function opAllowed(result) {
  return !result.error;
}

function expect(condition, message) {
  if (!condition) fail(message);
}

async function matrixSelect(client, table, filters) {
  let query = client.from(table).select("*");
  for (const [key, value] of Object.entries(filters)) query = query.eq(key, value);
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
      expect(!opAllowed(own), `${table.name}: authenticated SELECT should be denied`);
    } else {
      expect(opAllowed(own), `${table.name}: authenticated own SELECT failed`);
      expect(own.data.length >= 1, `${table.name}: authenticated own SELECT returned no rows`);
    }

    const other = await matrixSelect(userA.client, table.name, table.otherFilter);
    if (!table.authNoAccess) {
      expect(opAllowed(other), `${table.name}: authenticated other SELECT should be RLS-filtered, not fail`);
      expect(other.data.length === 0, `${table.name}: authenticated other SELECT leaked rows`);
    }

    for (const [role, client] of [
      ["anon", anon()],
      ["authenticated", userA.client],
    ]) {
      const insert = await client.from(table.name).insert(table.insertRow);
      expect(!opAllowed(insert), `${table.name}: ${role} INSERT unexpectedly allowed`);
      const update = await client.from(table.name).update(table.update).match(table.ownFilter);
      expect(!opAllowed(update), `${table.name}: ${role} UPDATE unexpectedly allowed`);
      const del = await client.from(table.name).delete().match(table.ownFilter);
      expect(!opAllowed(del), `${table.name}: ${role} DELETE unexpectedly allowed`);
    }

    const serviceSelect = await matrixSelect(admin, table.name, table.ownFilter);
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
  await admin
    .from("user_usage")
    .upsert({
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
  const allowedCount = [first, second].filter((item) => item.data?.[0]?.allowed === true).length;
  expect(allowedCount === 1, `Expected exactly one concurrent consume success, got ${allowedCount}`);

  const { data: afterConsume, error: afterConsumeError } = await admin
    .from("user_subscriptions")
    .select("ai_credit_units")
    .eq("user_id", userA.id)
    .single();
  expect(!afterConsumeError, "Could not inspect ai_credit_units after consume");
  expect(afterConsume.ai_credit_units === 0, `Expected ai_credit_units=0, got ${afterConsume.ai_credit_units}`);

  const grantAnon = await anon().rpc("grant_ai_credit_units", {
    p_user_id: userA.id,
    p_scan_credits: 1,
  });
  expect(!opAllowed(grantAnon), "anon executed grant_ai_credit_units");

  const [grantA, grantB] = await Promise.all([
    admin.rpc("grant_ai_credit_units", { p_user_id: userA.id, p_scan_credits: 2 }),
    admin.rpc("grant_ai_credit_units", { p_user_id: userA.id, p_scan_credits: 3 }),
  ]);
  expect(opAllowed(grantA) && grantA.data === true, "first concurrent grant failed");
  expect(opAllowed(grantB) && grantB.data === true, "second concurrent grant failed");

  const { data: afterGrant } = await admin
    .from("user_subscriptions")
    .select("scan_credits,ai_credit_units")
    .eq("user_id", userA.id)
    .single();
  expect(afterGrant.scan_credits === 5, `Expected scan_credits=5, got ${afterGrant.scan_credits}`);
  expect(afterGrant.ai_credit_units === 50, `Expected ai_credit_units=50, got ${afterGrant.ai_credit_units}`);
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
  return fetch(`${env("PHASE1_ACCEPTANCE_APP_URL").replace(/\/$/, "")}/api/webhooks/stripe`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "stripe-signature": stripeSignature(payload),
    },
    body: payload,
  });
}

async function testStripe(admin, userA) {
  const invalid = await fetch(`${env("PHASE1_ACCEPTANCE_APP_URL").replace(/\/$/, "")}/api/webhooks/stripe`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "stripe-signature": "invalid",
    },
    body: "{}",
  });
  expect(invalid.status >= 400, "invalid Stripe signature was accepted");

  const event = {
    id: `${prefix}_evt_delete`,
    type: "customer.subscription.deleted",
    data: { object: { id: "sub_test", metadata: { user_id: userA.id } } },
  };
  const fresh = await postStripe(event);
  expect(fresh.ok, `new Stripe event failed with HTTP ${fresh.status}`);
  const duplicate = await postStripe(event);
  expect(duplicate.ok, `duplicate Stripe event failed with HTTP ${duplicate.status}`);

  const raceEvent = {
    id: `${prefix}_evt_race`,
    type: "customer.subscription.deleted",
    data: { object: { id: "sub_race", metadata: { user_id: userA.id } } },
  };
  const [raceA, raceB] = await Promise.all([postStripe(raceEvent), postStripe(raceEvent)]);
  expect(raceA.ok && raceB.ok, "concurrent duplicate Stripe requests did not both return OK");
  const { data: raceRows } = await admin
    .from("stripe_events")
    .select("*")
    .eq("stripe_event_id", raceEvent.id);
  expect(raceRows.length === 1, "concurrent Stripe requests created duplicate event rows");

  const retryEvent = {
    id: `${prefix}_evt_retry`,
    type: "customer.subscription.deleted",
    data: { object: { id: "sub_retry", metadata: { user_id: userA.id } } },
  };
  await admin.from("stripe_events").insert({
    stripe_event_id: retryEvent.id,
    event_type: retryEvent.type,
    status: "failed",
  });
  const retry = await postStripe(retryEvent);
  expect(retry.ok, `failed Stripe event retry did not process: HTTP ${retry.status}`);
  const { data: retryRow } = await admin
    .from("stripe_events")
    .select("status")
    .eq("stripe_event_id", retryEvent.id)
    .single();
  expect(retryRow.status === "processed", `retried Stripe event ended as ${retryRow.status}`);
}

async function main() {
  assertSafeEnvironment();
  run("psql", ["--version"]);

  console.log("Applying base SQL and Phase 1 migrations...");
  applySqlSequence([...sqlFiles.base, ...sqlFiles.up]);
  console.log("Validating up -> down -> up...");
  applySqlSequence(sqlFiles.down);
  applySqlSequence(sqlFiles.up);

  const admin = service();
  const userA = await createUser(admin, "a");
  const userB = await createUser(admin, "b");
  const users = [userA, userB];

  try {
    await seedRows(admin, userA, userB);
    await testTableMatrix(admin, userA, userB);
    await testRpcPermissionsAndConcurrency(admin, userA);
    await testStripe(admin, userA);
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
