#!/usr/bin/env node
import { spawnSync } from "node:child_process";
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

  const admin = service();
  const userA = await createUser(admin, "a");
  const userB = await createUser(admin, "b");
  const users = [userA, userB];

  try {
    await seedRows(admin, userA, userB);
    await testTableMatrix(admin, userA, userB);
    await testRpcPermissionsAndConcurrency(admin, userA);
    await testLegacyStripeCutover(admin);
    await testStripeLeaseAndPackRpcs(admin, userA, userB);
    await testStripe(admin, userA);
    expectSqlFileFailure(
      sqlFiles.down[0],
      "Stripe webhook ledger is not empty; rollback is unsafe",
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
