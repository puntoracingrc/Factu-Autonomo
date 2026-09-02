import { readFile } from "node:fs/promises";
import { join } from "node:path";

import { PGlite } from "@electric-sql/pglite";
import { describe, expect, it } from "vitest";

const USER_ID = "11111111-1111-4111-8111-111111111111";
const DOCUMENT_ID = "22222222-2222-4222-8222-222222222222";
const IDENTITY_ID = "33333333-3333-4333-8333-333333333333";
const ENVELOPE_ID = "44444444-4444-4444-8444-444444444444";
const ISSUER_NIF = "B12345678";
const RECORD_HASH = "A".repeat(64);
const TEST_DIGEST = "0".repeat(64);
const ENDPOINT =
  "https://prewww1.aeat.es/wlpl/TIKE-CONT/ws/SistemaFacturacion/VerifactuSOAP";

async function queryOne(
  db: PGlite,
  sql: string,
): Promise<Record<string, unknown>> {
  const result = await db.query(sql);
  expect(result.rows).toHaveLength(1);
  return result.rows[0] as Record<string, unknown>;
}

async function createTestDatabase(): Promise<PGlite> {
  const db = new PGlite();
  await db.exec(`
    create role anon nologin;
    create role authenticated nologin;
    create role service_role nologin bypassrls;
    create schema auth;
    create schema storage;
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

    create table storage.buckets (
      id text primary key,
      name text not null,
      public boolean not null default false,
      file_size_limit bigint,
      allowed_mime_types text[]
    );
    create table public.central_invoice_documents (
      id uuid primary key,
      user_id uuid not null references auth.users(id),
      local_document_id text not null,
      kind text not null,
      lifecycle_status text not null,
      identity_id uuid,
      emitted_snapshot jsonb,
      emitted_hash text,
      unique (user_id, local_document_id)
    );
    create table public.central_invoice_identities (
      id uuid primary key,
      document_id uuid not null unique
        references public.central_invoice_documents(id),
      user_id uuid not null references auth.users(id),
      issuer_nif text not null,
      full_number text not null,
      issued_at timestamptz not null,
      environment text not null
    );
    alter table public.central_invoice_documents
      add constraint central_invoice_documents_identity_test_fk
      foreign key (identity_id)
      references public.central_invoice_identities(id)
      deferrable initially deferred;
  `);

  for (const name of [
    "20260902182313_verifactu_certificate_bindings.sql",
    "20260902183813_verifactu_central_submission_ledger.sql",
  ]) {
    const migration = await readFile(
      join(process.cwd(), "supabase", "migrations", name),
      "utf8",
    );
    await db.exec(migration);
  }
  return db;
}

describe("central VeriFactu PostgreSQL ledger", () => {
  it("persists one immutable request across an ambiguous retry", async () => {
    const db = await createTestDatabase();
    try {
      const bucket = await queryOne(
        db,
        "select public, file_size_limit from storage.buckets where id = 'verifactu-certificates'",
      );
      expect(bucket).toEqual({ public: false, file_size_limit: 524288 });

      await db.exec(`
        insert into auth.users (id) values ('${USER_ID}');
        begin;
        insert into public.central_invoice_documents (
          id, user_id, local_document_id, kind, lifecycle_status, identity_id,
          emitted_snapshot, emitted_hash
        ) values (
          '${DOCUMENT_ID}', '${USER_ID}', 'test-invoice-1', 'invoice',
          'issued', null, '{}'::jsonb, 'sha256:${TEST_DIGEST}'
        );
        insert into public.central_invoice_identities (
          id, document_id, user_id, issuer_nif, full_number, issued_at,
          environment
        ) values (
          '${IDENTITY_ID}', '${DOCUMENT_ID}', '${USER_ID}', '${ISSUER_NIF}',
          'F-TEST-0001', statement_timestamp(), 'test'
        );
        update public.central_invoice_documents
          set identity_id = '${IDENTITY_ID}'
          where id = '${DOCUMENT_ID}';
        commit;
        set request.jwt.claim.role = 'service_role';
        set role service_role;
      `);

      const binding = await queryOne(
        db,
        `select * from public.activate_verifactu_certificate_binding_v1(
          '${USER_ID}', '${ISSUER_NIF}', 'test', 'personal', '${ENVELOPE_ID}',
          '${USER_ID}/${ISSUER_NIF}/test/${ENVELOPE_ID}.vfce',
          '${TEST_DIGEST}', '${TEST_DIGEST}',
          statement_timestamp() - interval '1 day',
          statement_timestamp() + interval '1 year',
          'Controlled preproduction test'
        )`,
      );
      expect(binding.binding_version).toBe(1);

      const source = await queryOne(
        db,
        `select central_environment, issuer_nif, full_number
         from public.read_central_invoice_verifactu_source_v1(
           '${USER_ID}', 'test-invoice-1'
         )`,
      );
      expect(source).toEqual({
        central_environment: "test",
        issuer_nif: ISSUER_NIF,
        full_number: "F-TEST-0001",
      });

      const prepared = await queryOne(
        db,
        `select * from public.prepare_central_verifactu_record_v1(
          '${USER_ID}', '${DOCUMENT_ID}', '${IDENTITY_ID}',
          '${String(binding.binding_id)}', ${Number(binding.binding_version)},
          '${ISSUER_NIF}', 'test', 'alta', '${RECORD_HASH}', '', null, null,
          '2026-09-02T12:00:00+02:00', 'F-TEST-0001', '2026-09-02', 'F1',
          '<Registro><Huella>${RECORD_HASH}</Huella></Registro>',
          '${TEST_DIGEST}',
          'https://prewww2.aeat.es/wlpl/TIKE-CONT/ValidarQR?nif=${ISSUER_NIF}',
          '${ENDPOINT}'
        )`,
      );
      expect(prepared.result_status).toBe("prepared");

      const firstClaim = await queryOne(
        db,
        `select * from public.claim_central_verifactu_attempt_v1(
          '${USER_ID}', '${String(prepared.attempt_id)}', 90
        )`,
      );
      await queryOne(
        db,
        `select * from public.complete_central_verifactu_attempt_v1(
          '${USER_ID}', '${String(firstClaim.attempt_id)}',
          '${String(firstClaim.lease_token)}', 'delivery_unknown', null, null,
          null, null, null, 'NETWORK_OUTCOME_UNKNOWN',
          'No authoritative response received', null, null
        )`,
      );

      const retry = await queryOne(
        db,
        `select * from public.queue_central_verifactu_retry_v1(
          '${USER_ID}', '${String(prepared.record_id)}',
          '${String(binding.binding_id)}', ${Number(binding.binding_version)},
          '${ENDPOINT}'
        )`,
      );
      expect(retry).toMatchObject({
        result_status: "retry_queued",
        attempt_number: 2,
      });

      const secondClaim = await queryOne(
        db,
        `select * from public.claim_central_verifactu_attempt_v1(
          '${USER_ID}', '${String(retry.attempt_id)}', 90
        )`,
      );
      expect(secondClaim.xml_payload).toBe(firstClaim.xml_payload);
      expect(secondClaim.xml_sha256).toBe(firstClaim.xml_sha256);
      await queryOne(
        db,
        `select * from public.complete_central_verifactu_attempt_v1(
          '${USER_ID}', '${String(secondClaim.attempt_id)}',
          '${String(secondClaim.lease_token)}', 'accepted_duplicate', 200,
          'CSV-TEST-001', 'Correcto', 'Correcto', 'Duplicado', null, null,
          '<Respuesta>Duplicado</Respuesta>', '${TEST_DIGEST}'
        )`,
      );

      const evidence = await queryOne(
        db,
        `select
          r.status as record_status,
          r.csv,
          count(a.id)::integer as attempts,
          count(distinct a.request_sha256)::integer as request_hashes,
          array_agg(a.outcome order by a.attempt_number) as outcomes
        from public.central_verifactu_records as r
        join public.central_verifactu_transport_attempts as a
          on a.record_id = r.id
        where r.id = '${String(prepared.record_id)}'
        group by r.id`,
      );
      expect(evidence).toEqual({
        record_status: "accepted",
        csv: "CSV-TEST-001",
        attempts: 2,
        request_hashes: 1,
        outcomes: ["delivery_unknown", "accepted_duplicate"],
      });
    } finally {
      await db.close();
    }
  });
});
