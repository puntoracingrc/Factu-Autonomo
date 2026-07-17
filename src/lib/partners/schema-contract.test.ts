import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const migration = readFileSync(
  fileURLToPath(
    new URL(
      "../../../supabase/migrations/20260717090000_partner_program_foundation.sql",
      import.meta.url,
    ),
  ),
  "utf8",
);
const rollback = readFileSync(
  fileURLToPath(
    new URL(
      "../../../supabase/rollbacks/20260717090000_partner_program_foundation.down.sql",
      import.meta.url,
    ),
  ),
  "utf8",
);
const referralAlignment = readFileSync(
  fileURLToPath(
    new URL(
      "../../../supabase/migrations/20260717104000_referral_schema_runtime_alignment.sql",
      import.meta.url,
    ),
  ),
  "utf8",
);

const TABLES = [
  "partner_accounts",
  "partner_commission_entries",
  "partner_payouts",
] as const;

describe("Partner database boundary", () => {
  it("keeps every Partner table behind service-role-only RLS", () => {
    for (const table of TABLES) {
      expect(migration).toContain(
        `alter table public.${table} enable row level security;`,
      );
      expect(migration).toContain(
        `revoke all on table public.${table} from public, anon, authenticated;`,
      );
      expect(migration).toContain(
        `grant all on table public.${table} to service_role;`,
      );
    }
  });

  it("models an auditable ledger without creating an automatic transfer", () => {
    expect(migration).toContain("source_payment_receipt_id");
    expect(migration).toContain("source_stripe_invoice_id");
    expect(migration).toContain("commission_bps");
    expect(migration).toContain("Los pagos permanecen manuales");
    expect(migration).not.toMatch(/create\s+(?:or\s+replace\s+)?function/i);
    expect(migration).not.toMatch(/create\s+trigger/i);
  });

  it("provides a complete rollback in dependency order", () => {
    const payout = rollback.indexOf("drop table if exists public.partner_payouts");
    const commission = rollback.indexOf(
      "drop table if exists public.partner_commission_entries",
    );
    const account = rollback.indexOf("drop table if exists public.partner_accounts");
    expect(payout).toBeGreaterThanOrEqual(0);
    expect(commission).toBeGreaterThan(payout);
    expect(account).toBeGreaterThan(commission);
  });

  it("keeps the Partner link tables available only through the server", () => {
    for (const table of ["referral_codes", "referral_redemptions"]) {
      expect(referralAlignment).toContain(
        `create table if not exists public.${table}`,
      );
      expect(referralAlignment).toContain(
        `alter table public.${table} enable row level security;`,
      );
      expect(referralAlignment).toContain(
        `revoke all on table public.${table} from public, anon, authenticated;`,
      );
      expect(referralAlignment).toContain(
        `grant all on table public.${table} to service_role;`,
      );
    }
    expect(referralAlignment).toContain("notify pgrst, 'reload schema';");
  });
});
