import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const migration = readFileSync(
  new URL(
    "../../../supabase/migrations/20260730131924_central_recurring_occurrence_uniqueness.sql",
    import.meta.url,
  ),
  "utf8",
);

describe("central recurring occurrence uniqueness schema", () => {
  it("rechaza datos previos ambiguos antes de crear el indice unico", () => {
    expect(migration).toContain("having count(*) > 1");
    expect(migration).toContain(
      "duplicate central recurring occurrence requires repair",
    );
    expect(migration.indexOf("having count(*) > 1")).toBeLessThan(
      migration.indexOf(
        "create unique index central_business_entities_recurring_occurrence_uidx",
      ),
    );
  });

  it("protege por usuario solo gastos recurrentes activos con clave real", () => {
    expect(migration).toContain(
      "create unique index central_business_entities_recurring_occurrence_uidx",
    );
    expect(migration).toContain("on public.central_business_entities");
    expect(migration).toContain("user_id");
    expect(migration).toContain("current_payload ->> 'recurringOccurrenceKey'");
    expect(migration).toContain("where entity_type = 'expense'");
    expect(migration).toContain("and deleted = false");
  });

  it("convierte solo la colision del indice recurrente en P4105", () => {
    expect(migration).toContain("when unique_violation then");
    expect(migration).toContain(
      "get stacked diagnostics v_constraint_name = constraint_name",
    );
    expect(migration).toContain(
      "'central_business_entities_recurring_occurrence_uidx'",
    );
    expect(migration).toContain("errcode = 'P4105'");
    expect(migration).toContain(
      "central recurring occurrence already exists",
    );
  });
});
