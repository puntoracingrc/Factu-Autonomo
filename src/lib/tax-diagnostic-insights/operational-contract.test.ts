import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { TAX_MODEL_CATALOG } from "@/lib/tax-model-diagnostic/model-catalog";
import { REFERENCE_PROFILES } from "@/lib/tax-model-diagnostic/test-fixtures";

const packageJson = JSON.parse(
  readFileSync(new URL("../../../package.json", import.meta.url), "utf8"),
) as { scripts: Record<string, string> };
const aggregateSource = readFileSync(new URL("./aggregate.mjs", import.meta.url), "utf8");
const migrationSource = readFileSync(
  new URL("../../../supabase/migrations/20260716160000_tax_product_insights.sql", import.meta.url),
  "utf8",
);

describe("tax diagnostic continuous-improvement operational contract", () => {
  it("keeps the practical model/profile coverage and annual commands", () => {
    expect(TAX_MODEL_CATALOG).toHaveLength(27);
    expect(REFERENCE_PROFILES).toHaveLength(27);
    expect(packageJson.scripts["tax:insights:weekly"]).toBeTruthy();
    expect(packageJson.scripts["tax:year:prepare"]).toBeTruthy();
    expect(packageJson.scripts["tax:year:validate"]).toBeTruthy();
  });

  it("hard-codes product safeguards in every aggregate", () => {
    expect(aggregateSource).toContain("authorizedFiscalExclusion: false");
    expect(aggregateSource).toContain("allModelsViewRequired: true");
    expect(aggregateSource).toContain("changesRulesAutomatically: false");
    expect(aggregateSource).not.toContain("reviewStatus = \"APPROVED\"");
  });

  it("keeps detailed events server-only and provides bounded purge", () => {
    expect(migrationSource).toContain(
      "revoke all on table public.tax_product_events from public, anon, authenticated",
    );
    expect(migrationSource).toContain("p_retention_days integer default 90");
    expect(migrationSource).toContain("p_retention_days > 365");
  });
});
