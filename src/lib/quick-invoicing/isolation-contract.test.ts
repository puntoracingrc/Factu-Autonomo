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
  it("keeps the quick interface functional without slogans or filler", () => {
    const app = source("src/quick-app/app.ts");
    const access = source("src/quick-app/access-screen.ts");
    for (const phrase of ["MENOS PASOS", "Del trabajo", "Lo sencillo", "RÁPIDO EN EL MÓVIL", "Numeración y guardado en el servidor", "La SL no se utiliza"]) {
      expect(app).not.toContain(phrase);
      expect(access).not.toContain(phrase);
    }
    expect(app).toContain("<span>Crear factura</span>");
    expect(app).toContain("<span>Crear presupuesto</span>");
    expect(app).toContain("<span>Buscar cliente</span>");
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
  it("pins each editor request and keeps the enrolled company name dynamic", () => {
    const app = source("src/quick-app/app.ts");
    expect(app).toContain("quickCompanyRequestHeaders(action, bootstrap?.companyId)");
    expect(app).toContain("escape(bootstrap.companyName)");
    expect(app).toContain("`${bootstrap.actorId}:${bootstrap.companyId}`");
    expect(app).not.toContain("Empresa antigua");
    expect(source("src/quick-app/access-screen.ts")).not.toContain("Persianas Almar");
    expect(source("src/lib/quick-invoicing/server.ts")).toContain("request.headers.get(FACTU_COMPANY_HEADER)");
    const teamScope = source("supabase/migrations/20261021144649_quick_invoicing_team_scope.sql");
    expect(teamScope).toContain("m.role in ('owner', 'admin')");
    expect(teamScope).toContain("for share of a");
    expect(teamScope).not.toMatch(/31fd96e3|ebf7802a|persianasalmar@gmail|persidomo@gmail|spitfireibanez@gmail/);
  });
});
