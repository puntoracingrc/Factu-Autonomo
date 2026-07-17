import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const source = readFileSync(
  new URL("./apply-partner-program-production-migration.mjs", import.meta.url),
  "utf8",
);

describe("Partner production migration gate", () => {
  it("runs only in Vercel production and pins the reviewed migration", () => {
    expect(source).toContain('process.env.VERCEL === "1"');
    expect(source).toContain('process.env.VERCEL_ENV === "production"');
    expect(source).toContain("20260717090000_partner_program_foundation.sql");
    expect(source).toContain(
      "602c2cb715ab65e9b46d7202240b3f445e6479506d573293b785232df98236df",
    );
  });

  it("applies the migration transactionally and verifies its security boundary", () => {
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
