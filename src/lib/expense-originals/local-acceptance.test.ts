import { execFileSync } from "node:child_process";
import { createHash, randomUUID } from "node:crypto";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { FACTU_COMPANY_HEADER } from "@/lib/companies/types";
import { CLOUD_DEVICE_TOKEN_HEADER } from "@/lib/cloud/device-token";
import type { Expense } from "@/lib/types";

const acceptance =
  process.env.CENTRAL_GLOBAL_SYNTHETIC_LOCAL_ENABLED === "true"
    ? describe
    : describe.skip;
const expense: Expense = {
  id: "synthetic-original-expense",
  supplierName: "Proveedor sintético",
  description: "Original sintético",
  amount: 121,
  ivaPercent: 21,
  date: "2026-10-20",
  category: "Material",
  paymentMethod: "Transferencia",
  createdAt: "2026-10-20T12:00:00Z",
};
const bytes = Buffer.from(
  "%PDF-1.7\nSynthetic acceptance only, no real data\n%%EOF",
);
const digest = createHash("sha256").update(bytes).digest("hex");
let admin: SupabaseClient;
let dbUrl = "",
  appUrl = "",
  supabaseUrl = "";
const users: Array<{
  id: string;
  email: string;
  token: string;
  client: SupabaseClient;
}> = [];
function local(value: string) {
  if (!["localhost", "127.0.0.1", "[::1]"].includes(new URL(value).hostname))
    throw new Error("Expense attachment acceptance is localhost-only.");
  return value;
}
function requestHeaders(userIndex = 0, companyIndex = 0) {
  return {
    Authorization: `Bearer ${users[userIndex].token}`,
    [FACTU_COMPANY_HEADER]: users[companyIndex].id,
    [CLOUD_DEVICE_TOKEN_HEADER]: `synthetic-originals-device-${userIndex}-0123456789`,
    "X-Factu-File-Name": "synthetic-original.pdf",
  };
}
function endpoint() {
  return `${appUrl}/api/expenses/${expense.id}/original`;
}

acceptance(
  "private expense originals: real local Auth → API → Storage",
  { timeout: 60_000 },
  () => {
    beforeAll(async () => {
      supabaseUrl = local(process.env.NEXT_PUBLIC_SUPABASE_URL ?? "");
      dbUrl = local(
        process.env.PHASE1_ACCEPTANCE_DATABASE_URL ??
          process.env.CENTRAL_GLOBAL_SYNTHETIC_DATABASE_URL ??
          "",
      );
      appUrl = local(
        process.env.PHASE1_ACCEPTANCE_APP_URL ?? "http://127.0.0.1:3000",
      );
      admin = createClient(
        supabaseUrl,
        process.env.SUPABASE_SERVICE_ROLE_KEY!,
        { auth: { persistSession: false, autoRefreshToken: false } },
      );
      for (let index = 0; index < 3; index++) {
        const email = `originals-${randomUUID()}@example.test`,
          password = `Synthetic-${randomUUID()}!`;
        const created = await admin.auth.admin.createUser({
          email,
          password,
          email_confirm: true,
        });
        if (created.error || !created.data.user)
          throw created.error ?? new Error("Synthetic user not created");
        const client = createClient(
          supabaseUrl,
          process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
          { auth: { persistSession: false, autoRefreshToken: false } },
        );
        const login = await client.auth.signInWithPassword({ email, password });
        if (login.error || !login.data.session) throw login.error;
        users.push({
          id: created.data.user.id,
          email,
          token: login.data.session.access_token,
          client,
        });
        const plan = await admin.from("user_subscriptions").upsert({
          user_id: created.data.user.id,
          plan: "pro",
          status: "active",
          current_period_end: "2099-12-31T23:59:59Z",
        });
        if (plan.error) throw plan.error;
        const company = await admin.rpc("list_app_companies_v1", {
          p_user_id: created.data.user.id,
          p_verified_email: email,
        });
        if (company.error) throw company.error;
      }
      const member = await admin.from("app_company_members").insert({
        company_id: users[0].id,
        user_id: users[1].id,
        email: users[1].email,
        role: "admin",
        status: "active",
        added_by: users[0].id,
      });
      if (member.error) throw member.error;
      const inserted = await admin.from("central_business_entities").insert({
        user_id: users[0].id,
        entity_type: "expense",
        entity_id: expense.id,
        current_version: 1,
        deleted: false,
        current_payload: expense,
        content_hash: "synthetic-local-only",
        actor_device_id: "synthetic-fixture",
        actor_session_hash: "synthetic-fixture",
      });
      if (inserted.error) throw inserted.error;
    }, 120_000);
    afterAll(async () => {
      if (!admin || !dbUrl || !users.length) return;
      // Explicit synthetic UUIDs only, and all target URLs were checked before setup.
      const ids = users.map((user) => `'${user.id}'::uuid`).join(",");
      await admin.storage
        .from("factu-expense-originals")
        .remove([`${users[0].id}/${digest}`]);
      execFileSync(
        "psql",
        [
          dbUrl,
          "-X",
          "-v",
          "ON_ERROR_STOP=1",
          "-c",
          `begin;
      delete from public.expense_original_files where user_id in (${ids});
      delete from public.central_business_entities where user_id in (${ids});
      delete from public.app_company_access_audit where company_id in (${ids}) or actor_user_id in (${ids});
      delete from public.app_company_members where company_id in (${ids}) or user_id in (${ids});
      delete from public.app_companies where id in (${ids});commit;`,
        ],
        { stdio: "pipe" },
      );
      for (const user of users) {
        await user.client.auth.signOut();
        const deleted = await admin.auth.admin.deleteUser(user.id);
        expect(deleted.error).toBeNull();
      }
    });
    it("saves once, confirms exact bytes and lets a second authorized admin open them", async () => {
      for (let retry = 0; retry < 2; retry++) {
        const uploaded = await fetch(endpoint(), {
          method: "POST",
          headers: requestHeaders(),
          body: bytes,
        });
        expect({
          status: uploaded.status,
          body: await uploaded.text(),
        }).toEqual({ status: 200, body: JSON.stringify({ ok: true }) });
      }
      for (const index of [0, 1]) {
        const response = await fetch(endpoint(), {
          headers: requestHeaders(index),
        });
        expect(response.status).toBe(200);
        expect(response.headers.get("Cache-Control")).toContain("no-store");
        expect(response.headers.get("X-Factu-Source-Sha256")).toBe(digest);
        expect(Buffer.from(await response.arrayBuffer())).toEqual(bytes);
      }
      const saved = await admin
        .from("expense_original_files")
        .select("*")
        .eq("user_id", users[0].id);
      expect(saved.error).toBeNull();
      expect(saved.data).toHaveLength(1);
      const unchanged = await admin
        .from("central_business_entities")
        .select("current_payload,current_version")
        .eq("user_id", users[0].id)
        .eq("entity_id", expense.id)
        .single();
      expect(unchanged.data).toEqual({
        current_payload: expense,
        current_version: 1,
      });
      const status = await fetch(`${appUrl}/api/expenses/originals/status`, {
        method: "POST",
        headers: { ...requestHeaders(), "Content-Type": "application/json" },
        body: JSON.stringify({ expenseIds: [expense.id] }),
      });
      expect(await status.json()).toEqual({
        originals: { [expense.id]: "archived" },
      });
    });
    it("rejects replacement, another company, public URLs and direct authenticated Storage", async () => {
      const replacement = await fetch(endpoint(), {
        method: "POST",
        headers: requestHeaders(),
        body: Buffer.from("%PDF-1.7\nReplacement must not overwrite"),
      });
      expect(replacement.status).toBe(409);
      const other = await fetch(endpoint(), { headers: requestHeaders(2) });
      expect(other.status).toBe(401);
      const differentScope = await fetch(endpoint(), {
        headers: requestHeaders(2, 2),
      });
      expect(differentScope.status).toBe(404);
      const path = `${users[0].id}/${digest}`;
      const publicRead = await fetch(
        `${supabaseUrl}/storage/v1/object/public/factu-expense-originals/${path}`,
      );
      expect(publicRead.ok).toBe(false);
      const direct = await users[0].client.storage
        .from("factu-expense-originals")
        .download(path);
      expect(direct.error).not.toBeNull();
      expect(direct.data).toBeNull();
      const response = await fetch(endpoint(), { headers: requestHeaders() });
      expect(Buffer.from(await response.arrayBuffer())).toEqual(bytes);
    });
    it("opens a real inbox-style sha256: fingerprint through the existing private archive without rewriting the expense", async () => {
      const inboxId = randomUUID(),
        expenseId = "synthetic-inbox-original-expense";
      const inbox = await admin
        .from("expense_inbox_items")
        .insert({
          id: inboxId,
          user_id: users[0].id,
          alias_token: "synthetic-originals",
          attachment_filename: "synthetic-inbox.pdf",
          attachment_content_type: "application/pdf",
          attachment_size: bytes.length,
          attachment_hash: `sha256:${digest}`,
          status: "processed",
          processed_at: new Date().toISOString(),
        });
      expect(inbox.error).toBeNull();
      const inserted = await admin
        .from("central_business_entities")
        .insert({
          user_id: users[0].id,
          entity_type: "expense",
          entity_id: expenseId,
          current_version: 1,
          deleted: false,
          current_payload: {
            ...expense,
            id: expenseId,
            sourceInboxItemId: inboxId,
          },
          content_hash: "synthetic-local-only",
          actor_device_id: "synthetic-fixture",
          actor_session_hash: "synthetic-fixture",
        });
      expect(inserted.error).toBeNull();
      const archived = await admin
        .from("expense_original_files")
        .insert({
          user_id: users[0].id,
          binding_kind: "inbox",
          binding_id: digest,
          sha256: digest,
          mime_type: "application/pdf",
          file_name: "synthetic-inbox.pdf",
          byte_size: bytes.length,
        });
      expect(archived.error).toBeNull();
      const response = await fetch(
        `${appUrl}/api/expenses/${expenseId}/original`,
        { headers: requestHeaders() },
      );
      expect(response.status).toBe(200);
      expect(Buffer.from(await response.arrayBuffer())).toEqual(bytes);
      const status = await fetch(`${appUrl}/api/expenses/originals/status`, {
        method: "POST",
        headers: { ...requestHeaders(), "Content-Type": "application/json" },
        body: JSON.stringify({ expenseIds: [expenseId] }),
      });
      expect(await status.json()).toEqual({
        originals: { [expenseId]: "archived" },
      });
      const unchanged = await admin
        .from("expense_inbox_items")
        .select("attachment_hash")
        .eq("id", inboxId)
        .single();
      expect(unchanged.data?.attachment_hash).toBe(`sha256:${digest}`);
    });
    it("revocation removes file access immediately", async () => {
      const revoked = await admin
        .from("app_company_members")
        .update({ status: "revoked" })
        .eq("company_id", users[0].id)
        .eq("user_id", users[1].id);
      expect(revoked.error).toBeNull();
      const response = await fetch(endpoint(), { headers: requestHeaders(1) });
      expect(response.status).toBe(401);
    });
  },
);
