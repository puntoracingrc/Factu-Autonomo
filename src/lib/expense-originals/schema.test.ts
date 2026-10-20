import { readFileSync } from "node:fs";
import { PGlite } from "@electric-sql/pglite";
import { describe, expect, it } from "vitest";

const migration = readFileSync(
  new URL(
    "../../../supabase/migrations/20261020191232_expense_original_files_private.sql",
    import.meta.url,
  ),
  "utf8",
);
async function database() {
  const db = new PGlite();
  await db.exec(`create role anon;create role authenticated;create role service_role bypassrls;
    create schema storage;create schema realtime;
    alter default privileges in schema public grant all on tables to service_role;
    create table storage.buckets (id text primary key,name text,public boolean,file_size_limit bigint,allowed_mime_types text[]);
    create table storage.objects (id text primary key,bucket_id text);
    alter table storage.objects enable row level security;
    grant usage on schema storage to anon,authenticated;
    grant select,insert,update,delete on storage.objects to anon,authenticated;
    create policy deliberately_broad_other_bucket_policy on storage.objects for all to anon,authenticated using(true) with check(true);
    create table public.test_wakeups(payload jsonb,event text,topic text,private boolean);
    create function realtime.send(payload jsonb,event text,topic text,private boolean) returns void language sql as $$insert into public.test_wakeups values(payload,event,topic,private)$$;`);
  await db.exec(migration);
  return db;
}
describe("expense-originals PostgreSQL isolation", () => {
  it("is private and blocks direct browser Storage access even if another bucket has a broad policy", async () => {
    const db = await database();
    try {
      expect(
        (
          await db.query(
            "select public,file_size_limit from storage.buckets where id='factu-expense-originals'",
          )
        ).rows,
      ).toEqual([{ public: false, file_size_limit: 4194304 }]);
      await db.exec(
        "insert into storage.objects values ('secret','factu-expense-originals'),('allowed','another-bucket');set role authenticated;",
      );
      expect((await db.query("select id from storage.objects")).rows).toEqual([
        { id: "allowed" },
      ]);
      await expect(
        db.exec(
          "insert into storage.objects values ('injected','factu-expense-originals')",
        ),
      ).rejects.toThrow(/row-level security/);
      await db.exec("reset role;set role anon;");
      expect((await db.query("select id from storage.objects")).rows).toEqual([
        { id: "allowed" },
      ]);
      await expect(
        db.query("select * from public.expense_original_files"),
      ).rejects.toThrow(/permission denied/);
    } finally {
      await db.close();
    }
  });
  it("service inserts immutable company bindings and only broadcasts a content-free private wakeup", async () => {
    const db = await database();
    try {
      await db.exec(`set role service_role;insert into public.expense_original_files (user_id,binding_kind,binding_id,sha256,mime_type,file_name,byte_size)
        values ('11111111-1111-4111-8111-111111111111','expense','e1','${"a".repeat(64)}','application/pdf','factura.pdf',10);`);
      await expect(
        db.exec(
          "update public.expense_original_files set file_name='changed.pdf'",
        ),
      ).rejects.toThrow(/permission denied/);
      await expect(
        db.exec("delete from public.expense_original_files"),
      ).rejects.toThrow(/permission denied/);
      await db.exec("reset role;");
      expect(
        (await db.query("select * from public.test_wakeups")).rows,
      ).toEqual([
        {
          payload: { kind: "expense_originals" },
          event: "workspace_auxiliary_changed",
          topic: "central-business:11111111-1111-4111-8111-111111111111",
          private: true,
        },
      ]);
    } finally {
      await db.close();
    }
  });
});
