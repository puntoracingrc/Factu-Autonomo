import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { EMPTY_DATA } from "@/lib/types";
import { CENTRAL_AUTHORITY_EVENTS_AUTO_SYNC_LIMIT, nextCentralInvoiceAuthorityEventsAutoSyncDelay } from "./events-auto-sync";
import type { CentralInvoiceAuthorityEventsAppDataSyncValue } from "./events-app-data-sync";

describe("company-scoped invoice live catch-up", () => {
  it("continues immediately when an invoice page is full, but not after a conflict", () => {
    const result = {
      status: "applied" as const, data: EMPTY_DATA, replayed: false,
      value: { localSync: { ok: true, pulledEvents: CENTRAL_AUTHORITY_EVENTS_AUTO_SYNC_LIMIT } } as CentralInvoiceAuthorityEventsAppDataSyncValue,
    };
    expect(nextCentralInvoiceAuthorityEventsAutoSyncDelay(result)).toBe(0);
    expect(nextCentralInvoiceAuthorityEventsAutoSyncDelay({ ...result, value: { ...result.value, localSync: { ...result.value.localSync, pulledEvents: 0 } } })).toBeGreaterThan(0);
    expect(nextCentralInvoiceAuthorityEventsAutoSyncDelay({ status: "blocked", reason: "stale_precondition" })).toBeGreaterThan(0);
  });

  it("authorizes wakeups through active company membership without exposing invoice contents", () => {
    const migration = readFileSync(new URL("../../../supabase/migrations/20261009154804_company_scoped_central_invoice_realtime.sql", import.meta.url), "utf8");
    expect(migration).toContain("on public.central_invoice_event_wakeups");
    expect(migration).toContain("for select to authenticated");
    expect(migration).toContain("public.can_receive_central_business_realtime_v1(");
    expect(migration).toContain("'central-business:' || user_id::text");
    expect(migration).not.toMatch(/grant.*(?:insert|update|delete)/i);
    expect(migration).not.toContain("invoice_documents");
    const helper = readFileSync(new URL("../../../supabase/migrations/20261006170242_company_scoped_central_business_realtime.sql", import.meta.url), "utf8");
    expect(helper).toContain("member.user_id = v_actor_user_id");
    expect(helper).toContain("member.status = 'active'");
    expect(helper).toContain("company.status = 'active'");
  });

  it("catches up on PWA reopen and first subscription without reloading the page or forms", () => {
    const component = readFileSync(new URL("../../components/cloud/CentralInvoiceAuthorityEventsAutoSync.tsx", import.meta.url), "utf8");
    expect(component).toContain('window.addEventListener("pageshow", wake)');
    expect(component).toContain('window.removeEventListener("pageshow", wake)');
    expect(component).toContain('previous !== "subscribed"');
    expect(component).toContain("if (enabled && ready && userId) realtimeWakeRef.current()");
    expect(component).not.toContain("location.reload");
    expect(component).not.toContain("router.refresh");
  });
});
