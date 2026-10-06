import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const migration = readFileSync(
  new URL(
    "../../../supabase/migrations/20260729221945_central_business_realtime_wakeups.sql",
    import.meta.url,
  ),
  "utf8",
);
const companyScopedMigration = readFileSync(
  new URL(
    "../../../supabase/migrations/20261006170242_company_scoped_central_business_realtime.sql",
    import.meta.url,
  ),
  "utf8",
);

describe("central business Realtime wakeups schema", () => {
  it("autoriza el canal privado solo a miembros activos de la empresa", () => {
    expect(companyScopedMigration).toContain(
      "create or replace function public.can_receive_central_business_realtime_v1(",
    );
    expect(companyScopedMigration).toContain(
      "from public.app_companies as company",
    );
    expect(companyScopedMigration).toContain(
      "join public.app_company_members as member",
    );
    expect(companyScopedMigration).toContain(
      "company.data_owner_id = v_data_owner_id",
    );
    expect(companyScopedMigration).toContain(
      "member.user_id = v_actor_user_id",
    );
    expect(companyScopedMigration).toContain("company.status = 'active'");
    expect(companyScopedMigration).toContain("member.status = 'active'");
    expect(companyScopedMigration).toContain(
      "create policy central_business_broadcast_owner_select_v1",
    );
    expect(companyScopedMigration).toContain("on realtime.messages");
    expect(companyScopedMigration).toContain("to authenticated");
    expect(companyScopedMigration).toContain("extension = 'broadcast'");
    expect(companyScopedMigration).toContain(
      "public.can_receive_central_business_realtime_v1(",
    );
    expect(companyScopedMigration).toContain(
      "from public, anon, authenticated",
    );
  });

  it("emite solo la secuencia y no replica el outbox protegido", () => {
    expect(migration).toContain("perform realtime.send(");
    expect(migration).toContain(
      "jsonb_build_object('event_sequence', new.event_sequence)",
    );
    expect(migration).toContain("'central_business_changed'");
    expect(migration).toContain("'central-business:' || new.user_id::text");
    expect(migration).toContain(
      "after insert on public.central_business_outbox",
    );
    expect(migration).not.toContain("new.payload");
    expect(migration).not.toContain("new.content_hash");
    expect(migration).not.toContain("alter publication supabase_realtime");
  });

  it("impide invocar la función del trigger desde el navegador", () => {
    expect(migration).toContain("security definer\nset search_path = ''");
    expect(migration).toContain(
      "revoke all on function public.central_business_authority_broadcast_wakeup_v1()",
    );
    expect(migration).toContain("from public, anon, authenticated");
  });
});
