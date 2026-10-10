import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { auxiliaryWakeupKind } from "./auxiliary-wakeups";

describe("private auxiliary invalidations", () => {
  it("accepts only known metadata kinds, never treats payload content as instructions", () => {
    for (const kind of ["expense_inbox", "fiscal_notifications"] as const)
      expect(auxiliaryWakeupKind({ payload: { kind } })).toBe(kind);
    for (const value of [
      null,
      "expense_inbox",
      {},
      { kind: "expense_inbox" },
      { payload: { kind: "other" } },
    ])
      expect(auxiliaryWakeupKind(value)).toBeNull();
  });
  it("uses an authorized private company channel and no document/email payload", () => {
    const sql = readFileSync(
      new URL(
        "../../../supabase/migrations/20261010034242_shared_saved_document_drafts.sql",
        import.meta.url,
      ),
      "utf8",
    );
    expect(sql).toContain("realtime.send(jsonb_build_object('kind',kind)");
    expect(sql).toContain("'central-business:' || owner_id::text, true");
    expect(sql).toContain(
      "revoke all on function public.broadcast_workspace_auxiliary_wakeup_v1() from public, anon, authenticated",
    );
  });
});
