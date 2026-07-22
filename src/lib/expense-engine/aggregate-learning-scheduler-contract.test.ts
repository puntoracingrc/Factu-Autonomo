import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const workflow = readFileSync(
  new URL(
    "../../../.github/workflows/expense-learning-maintenance.yml",
    import.meta.url,
  ),
  "utf8",
);

const route = readFileSync(
  new URL(
    "../../app/api/expenses/learning-maintenance/route.ts",
    import.meta.url,
  ),
  "utf8",
);

const adr = readFileSync(
  new URL("../../../docs/architecture/ADR-0008-expense-learning-engine.md", import.meta.url),
  "utf8",
);

describe("expense learning P4C2 scheduler contract", () => {
  it("runs hourly with bounded retries below the fixed four-hour lookahead", () => {
    expect(workflow).toContain('cron: "17 * * * *"');
    expect(workflow).toContain("workflow_dispatch:");
    expect(workflow).toContain("for attempt in 1 2 3");
    expect(workflow).toContain("--max-time 70");
    expect(workflow).toContain("sleep 20");
    expect(workflow).toContain("timeout-minutes: 5");
  });

  it("uses the existing shared scheduler secret without exposing it", () => {
    expect(workflow).toContain(
      "${{ secrets.SECURITY_HEALTH_CRON_SECRET }}",
    );
    expect(workflow).toContain("Authorization: Bearer");
    expect(workflow).not.toMatch(/echo[^\n]*cron_secret/iu);
    expect(route).toContain("process.env.CRON_SECRET");
    expect(route).toContain("timingSafeEqual");
  });

  it("keeps the operational response and workflow output generic", () => {
    expect(route).toContain("{ ok }");
    expect(route).not.toMatch(/console\.(?:log|warn|error)/u);
    expect(route).not.toMatch(/user_id|week_start|supporting_contributors/iu);
    expect(workflow).not.toContain("cat \"");
    expect(workflow).not.toContain("jq -r");
    expect(workflow).toContain("requires attention");
  });

  it("treats maintenance debt as failure while attempting both primitives", () => {
    const promotion = route.indexOf(
      '"promote_expense_learning_closed_weeks_v1"',
    );
    const retention = route.indexOf('"purge_expense_learning_retention_v1"');
    expect(promotion).toBeGreaterThanOrEqual(0);
    expect(retention).toBeGreaterThan(promotion);
    expect(route).not.toContain('"RETRY_REQUIRED"');
    expect(route).toContain("if (!promotionOk || !retentionOk)");
  });

  it("does not activate ingestion, wiring, reading, or Admin", () => {
    expect(route).not.toMatch(/next_public|ingestion_enabled|wiring_enabled/iu);
    expect(route).not.toMatch(/closed_week_supported_metrics|select\s+/iu);
    expect(route).not.toMatch(/admin\/|getAdminAccessFromRequest/u);
    expect(adr).toContain("### Alcance actual P4C2");
    expect(adr).toContain("P4C2 no cambia ninguno de los dos kill switches");
  });
});
