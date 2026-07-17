import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const source = readFileSync(
  new URL("./apply-partner-referral-production-migration.mjs", import.meta.url),
  "utf8",
);

describe("Partner referral production migration gate", () => {
  it("runs only in Vercel production and pins the reviewed migration", () => {
    expect(source).toContain('process.env.VERCEL === "1"');
    expect(source).toContain('process.env.VERCEL_ENV === "production"');
    expect(source).toContain(
      "20260717104000_referral_schema_runtime_alignment.sql",
    );
    expect(source).toContain(
      "3302e48f56f15ebe6ee8f840cef92750d488da149a599d648dc2b5ba8dd00c14",
    );
  });

  it("applies one transaction and verifies the server-only boundary", () => {
    expect(source).toContain("sql.begin");
    expect(source).toContain("pg_advisory_xact_lock");
    expect(source).toContain("relrowsecurity");
    expect(source).toContain("anon_can_select");
    expect(source).toContain("authenticated_can_select");
    expect(source).toContain("service_role_can_manage");
    expect(source).toContain("finally");
    expect(source).toContain("sql.end");
  });

  it("never prints or embeds the production connection value", () => {
    expect(source).not.toMatch(/console\.(?:log|error)\([^)]*connectionString/);
    expect(source).not.toMatch(/postgres(?:ql)?:\/\/[^\s"']+@/i);
  });
});
