import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const migration = readFileSync(
  new URL(
    "../../../supabase/migrations/20260729221945_central_business_realtime_wakeups.sql",
    import.meta.url,
  ),
  "utf8",
);

describe("central business Realtime wakeups schema", () => {
  it("autoriza solo el canal privado del propietario autenticado", () => {
    expect(migration).toContain(
      "create policy central_business_broadcast_owner_select_v1",
    );
    expect(migration).toContain("on realtime.messages");
    expect(migration).toContain("to authenticated");
    expect(migration).toContain("extension = 'broadcast'");
    expect(migration).toContain(
      "'central-business:' || (select auth.uid())::text",
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
