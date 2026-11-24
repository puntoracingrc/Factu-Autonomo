import { describe, expect, it, vi } from "vitest";
import type { VerifiedUserSession } from "@/lib/billing/server-auth";
import { listCompaniesForIdentity } from "./server";

const { rpc } = vi.hoisted(() => ({ rpc: vi.fn() }));
vi.mock("@/lib/supabase/admin", () => ({ getSupabaseAdmin: () => ({ rpc }) }));

const actor: VerifiedUserSession = {
  user: {
    id: "member-one",
    email: "member@example.test",
    aud: "authenticated",
    created_at: "2026-01-01T00:00:00Z",
    app_metadata: {},
    user_metadata: { factu_tax_summary_company_ids: ["other"] },
  },
  sessionId: "session-one",
  aal: "aal1",
};

describe("company tax summary access", () => {
  it("grants only an active admin membership listed in verified app metadata", async () => {
    rpc.mockResolvedValue({
      data: [
        { company_id: "shared", member_role: "admin" },
        { company_id: "other", member_role: "admin" },
        { company_id: "personal", member_role: "owner" },
      ],
      error: null,
    });

    async function effectiveGrants(value: unknown) {
      const companies = await listCompaniesForIdentity({
        ...actor,
        user: { ...actor.user, app_metadata: { factu_tax_summary_company_ids: value } },
      });
      return companies.filter((company) => company.taxSummaryGrantedTo)
        .map((company) => [company.id, company.taxSummaryGrantedTo]);
    }

    expect(await effectiveGrants(["shared", "personal", "outside-memberships"]))
      .toEqual([["shared", actor.user.id]]);
    expect(await effectiveGrants(undefined)).toEqual([]);
    expect(await effectiveGrants("shared")).toEqual([]);
    expect(rpc).toHaveBeenCalledWith("list_app_companies_v1", {
      p_user_id: actor.user.id,
      p_verified_email: actor.user.email,
    });
  });
});
