import { readFile } from "node:fs/promises";
import { join } from "node:path";

import { PGlite } from "@electric-sql/pglite";
import { describe, expect, it } from "vitest";

const USER_ID = "11111111-1111-4111-8111-111111111111";
const ARCHIVE_ID = "22222222-2222-4222-8222-222222222222";
const CONTENT_HASH = `sha256:${"a".repeat(64)}`;
const MANIFEST_HASH = `sha256:${"0".repeat(64)}`;

async function createTestDatabase(): Promise<PGlite> {
  const db = new PGlite();
  await db.exec(`
    create role anon nologin;
    create role authenticated nologin;
    create role service_role nologin bypassrls;
    create schema auth;
    create schema extensions;
    create table auth.users (id uuid primary key);
    create function auth.role()
    returns text
    language sql
    stable
    as $$
      select coalesce(current_setting('request.jwt.claim.role', true), '')
    $$;
    create function extensions.digest(value bytea, algorithm text)
    returns bytea
    language sql
    immutable
    as $$
      select decode(repeat('00', 32), 'hex')
    $$;
  `);
  const migration = await readFile(
    join(
      process.cwd(),
      "supabase",
      "migrations",
      "20260908143000_central_workspace_historical_archive.sql",
    ),
    "utf8",
  );
  await db.exec(migration);
  return db;
}

describe("central workspace historical archive PostgreSQL acceptance", () => {
  it("uploads, finalizes and then preserves one immutable tenant archive", async () => {
    const db = await createTestDatabase();
    try {
      await db.exec(`
        insert into auth.users (id) values ('${USER_ID}');
        set request.jwt.claim.role = 'service_role';
        set role service_role;
      `);

      const begun = await db.query(
        `select * from public.begin_central_workspace_historical_archive_v1(
          '${USER_ID}', '${ARCHIVE_ID}', 1, '${MANIFEST_HASH}'
        )`,
      );
      expect(begun.rows[0]).toMatchObject({
        result_status: "uploading",
        archive_id: ARCHIVE_ID,
        expected_document_count: 1,
        stored_document_count: 0,
        manifest_hash: MANIFEST_HASH,
        completed_at: null,
      });

      const appended = await db.query(
        `select * from public.append_central_workspace_historical_archive_v1(
          '${USER_ID}',
          '${ARCHIVE_ID}',
          jsonb_build_array(jsonb_build_object(
            'localDocumentId', 'doc-1',
            'documentKind', 'factura',
            'contentHash', '${CONTENT_HASH}',
            'payload', jsonb_build_object('id', 'doc-1', 'type', 'factura')
          ))
        )`,
      );
      expect(appended.rows[0]).toMatchObject({
        archive_id: ARCHIVE_ID,
        stored_document_count: 1,
      });

      const finalized = await db.query(
        `select * from public.finalize_central_workspace_historical_archive_v1(
          '${USER_ID}', '${ARCHIVE_ID}'
        )`,
      );
      expect(finalized.rows[0]).toMatchObject({
        archive_id: ARCHIVE_ID,
        document_count: 1,
        manifest_hash: MANIFEST_HASH,
      });
      expect(finalized.rows[0]).toHaveProperty("completed_at");

      await expect(
        db.query(
          `select * from public.begin_central_workspace_historical_archive_v1(
            '${USER_ID}',
            '33333333-3333-4333-8333-333333333333',
            1,
            'sha256:${"b".repeat(64)}'
          )`,
        ),
      ).rejects.toThrow(/immutable/u);

      await db.exec("reset role");
      const privilege = await db.query(
        `select
          has_table_privilege(
            'authenticated',
            'public.central_workspace_historical_archives',
            'select'
          ) as authenticated_can_read,
          (select relrowsecurity
           from pg_class
           where oid = 'public.central_workspace_historical_archives'::regclass)
            as row_security_enabled`,
      );
      expect(privilege.rows[0]).toEqual({
        authenticated_can_read: false,
        row_security_enabled: true,
      });
    } finally {
      await db.close();
    }
  });
});
