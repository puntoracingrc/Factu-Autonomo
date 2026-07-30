import { readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";

const migration = readFileSync(
  new URL(
    "../../../supabase/migrations/20260730103000_central_business_atomic_batch.sql",
    import.meta.url,
  ),
  "utf8",
);

describe("central business atomic batch schema", () => {
  it("aplica lotes distintos con orden estable dentro de una transaccion", () => {
    expect(migration).toContain("CENTRAL_BUSINESS_ATOMIC_BATCH_V1");
    expect(migration).toContain(
      "create or replace function public.mutate_central_business_batch_v1",
    );
    expect(migration).toContain("v_count not between 1 and 20");
    expect(migration).toContain("v_distinct_count <> v_count");
    expect(migration).toContain(
      "from public.mutate_central_business_entity_v1(",
    );
    expect(migration).toContain("order by");
    expect(migration).toContain("item.value ->> 'entityType'");
    expect(migration).toContain("item.value ->> 'entityId'");
  });

  it("mantiene la RPC fuera de los roles del navegador", () => {
    expect(migration).toContain(
      "revoke all on function public.mutate_central_business_batch_v1",
    );
    expect(migration).toContain("from public, anon, authenticated");
    expect(migration).toContain("to service_role");
    expect(migration).toContain("requires service_role");
  });
});
