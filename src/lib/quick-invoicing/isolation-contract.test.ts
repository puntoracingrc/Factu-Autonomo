import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
const source = (file: string) => readFileSync(file,"utf8");
describe("private quick-app isolation and durable acknowledgement contract",() => {
  it("has an independent PWA scope without the full app providers",() => {
    const app = source("src/quick-app/app.ts");
    const manifest = JSON.parse(source("src/quick-app/manifest.webmanifest"));
    expect(manifest.id).toBe("/rapido/"); expect(manifest.scope).toBe("/rapido/");
    expect(app).not.toMatch(/AppStore|AppProviders|router\.refresh|location\.reload|visibilitychange/);
    expect(app).not.toContain("activeCompany");
    expect(source("src/quick-app/storage.ts")).toContain("factu-quick-private-v1");
  });
  it("caches only its own shell, not APIs or customer/invoice records",() => {
    const sw = source("src/quick-app/sw.js");
    expect(sw).toContain('startsWith("factu-quick-")');
    expect(sw).toContain('startsWith("/rapido/")');
    expect(sw).not.toContain("skipWaiting");
    expect(sw).not.toContain("factu-pwa-");
  });
  it("wraps the existing central authorities, enqueues before acknowledgement and has an independent runner",() => {
    const sql = source("supabase/migrations/20261021043637_quick_invoicing_pilot.sql");
    expect(sql).toContain("public.issue_central_invoice_v1(");
    expect(sql).toContain("public.create_central_business_document_v1(");
    expect(sql.indexOf("insert into public.quick_customer_jobs(operation_id")).toBeLessThan(sql.indexOf("return public.read_quick_document_v1(p_actor_id,p_operation_id,p_intent_hash)"));
    expect(sql).toContain("for update skip locked");
    expect(sql).toContain("cron.schedule('factu-quick-customer-admission-v1'");
    expect(sql).not.toMatch(/31fd96e3|ebf7802a|persianasalmar@gmail/);
  });
});
