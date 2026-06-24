import { afterEach, describe, expect, it, vi } from "vitest";
import { consumeCustomerAiAutofill } from "./scan-usage-server";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { fetchUserSubscriptionServer } from "./server-repository";

vi.mock("@/lib/supabase/admin", () => ({
  getSupabaseAdmin: vi.fn(),
}));

vi.mock("./server-repository", () => ({
  fetchUserSubscriptionServer: vi.fn(),
}));

function usageQueryBuilder() {
  return {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    maybeSingle: vi.fn(async () => ({
      data: {
        documents_created: 0,
        expense_scans_created: 30,
        customer_ai_autofills_created: 0,
      },
      error: null,
    })),
  };
}

describe("AI unit consumption", () => {
  afterEach(() => {
    vi.resetAllMocks();
    vi.unstubAllEnvs();
  });

  it("permite solo uno de dos consumos simultaneos cuando queda una unidad", async () => {
    vi.stubEnv("NEXT_PUBLIC_BILLING_ENABLED", "true");
    let remainingUnits = 1;
    const rpc = vi.fn(async (_name: string, args: { p_cost_units: number }) => {
      if (remainingUnits >= args.p_cost_units) {
        remainingUnits -= args.p_cost_units;
        return { data: [{ allowed: true, reason: null }], error: null };
      }
      return {
        data: [{ allowed: false, reason: "insufficient_units" }],
        error: null,
      };
    });

    vi.mocked(getSupabaseAdmin).mockReturnValue({
      from: vi.fn(() => usageQueryBuilder()),
      rpc,
    } as unknown as ReturnType<typeof getSupabaseAdmin>);
    vi.mocked(fetchUserSubscriptionServer).mockResolvedValue({
      userId: "550e8400-e29b-41d4-a716-446655440000",
      plan: "pro",
      status: "active",
      currentPeriodEnd: null,
      trialEndsAt: null,
      scanTrialRemaining: 0,
      scanCredits: 0,
      aiCreditUnits: 1,
    });

    const [first, second] = await Promise.all([
      consumeCustomerAiAutofill("550e8400-e29b-41d4-a716-446655440000"),
      consumeCustomerAiAutofill("550e8400-e29b-41d4-a716-446655440000"),
    ]);

    expect([first.allowed, second.allowed].sort()).toEqual([false, true]);
    expect(remainingUnits).toBe(0);
    expect(rpc).toHaveBeenCalledTimes(2);
  });
});
