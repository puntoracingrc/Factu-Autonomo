import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const certificateMigration = readFileSync(
  new URL(
    "../../../supabase/migrations/20260902182313_verifactu_certificate_bindings.sql",
    import.meta.url,
  ),
  "utf8",
);
const ledgerMigration = readFileSync(
  new URL(
    "../../../supabase/migrations/20260902183813_verifactu_central_submission_ledger.sql",
    import.meta.url,
  ),
  "utf8",
);

describe("central VeriFactu storage contract", () => {
  it("keeps certificate material private, encrypted and test-only", () => {
    expect(certificateMigration).toContain(
      "check (environment = 'test')",
    );
    expect(certificateMigration).toContain(
      "'verifactu-certificates',\n  'verifactu-certificates',\n  false",
    );
    expect(certificateMigration).toContain(
      "unique (user_id, issuer_nif, environment)",
    );
    expect(certificateMigration).toContain(
      "certificate_fingerprint_sha256 text not null",
    );
    expect(certificateMigration).toContain(
      "certificate_valid_from <= statement_timestamp()",
    );
    expect(certificateMigration).not.toMatch(
      /grant\s+[^;]*(?:verifactu_certificate_bindings|verifactu_certificate_binding_audit)[^;]*to\s+(?:anon|authenticated)/iu,
    );
    expect(certificateMigration).toContain(
      "revoke all on table public.verifactu_certificate_bindings\n  from public, anon, authenticated, service_role",
    );
    expect(certificateMigration).toContain(
      "grant select on table public.verifactu_certificate_bindings to service_role",
    );
    expect(certificateMigration).not.toMatch(
      /grant\s+(?:all|insert|update|delete|truncate)[^;]*verifactu_certificate_[^;]*to\s+service_role/iu,
    );
    expect(certificateMigration.match(/security definer/giu)).toHaveLength(3);
    expect(
      certificateMigration.match(
        /if \(select auth\.role\(\)\) <> 'service_role' then/giu,
      ),
    ).toHaveLength(3);
  });

  it("makes the fiscal record material immutable and serializes one identity", () => {
    expect(ledgerMigration).toContain(
      "central_verifactu_record_material_immutable_v1",
    );
    expect(ledgerMigration).toContain(
      "'central-verifactu-record:' || p_user_id::text || ':' || p_central_identity_id::text",
    );
    expect(ledgerMigration).toContain(
      "raise exception 'central verifactu identity replay changed immutable material'",
    );
    expect(ledgerMigration).toContain(
      "raise exception 'central verifactu chain head changed'",
    );
    expect(ledgerMigration).toContain(
      "All attempt lifecycle functions lock record first and attempt second.",
    );
    expect(ledgerMigration.match(/select a\.record_id into v_record_id/gu))
      .toHaveLength(2);
  });

  it("retries an ambiguous delivery with the exact stored request", () => {
    expect(ledgerMigration).toContain(
      "request_sha256",
    );
    expect(ledgerMigration).toContain(
      "v_record.xml_sha256",
    );
    expect(ledgerMigration).toContain(
      "status = 'delivery_unknown'",
    );
    expect(ledgerMigration).toContain(
      "definitive AEAT outcome requires a response payload",
    );
    expect(ledgerMigration).toContain(
      "central verifactu response hash mismatch",
    );
  });

  it("permits only official AEAT preproduction endpoints", () => {
    expect(ledgerMigration).toContain(
      "^https://prewww(1|10)[.]aeat[.]es/wlpl/TIKE-CONT/ws/SistemaFacturacion/VerifactuSOAP$",
    );
    expect(ledgerMigration).not.toContain("https://www1.aeat.es");
    expect(ledgerMigration).not.toContain("https://www10.aeat.es");
    expect(ledgerMigration).toContain(
      "check (environment = 'test')",
    );
  });

  it("allows service_role reads but only RPC-mediated writes", () => {
    for (const table of [
      "central_verifactu_chain_state",
      "central_verifactu_records",
      "central_verifactu_transport_attempts",
    ]) {
      expect(ledgerMigration).toContain(
        `revoke all on table public.${table}\n  from public, anon, authenticated, service_role`,
      );
      expect(ledgerMigration).toContain(
        `grant select on table public.${table} to service_role`,
      );
    }
    expect(ledgerMigration).not.toMatch(
      /grant\s+(?:all|insert|update|delete|truncate)[^;]*central_verifactu_[^;]*to\s+service_role/iu,
    );
  });
});
