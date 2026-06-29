import { afterEach, describe, expect, it, vi } from "vitest";
import {
  consumeCustomerAiAutofill,
  consumeExpenseScan,
} from "./scan-usage-server";
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

  it("mantiene el escaneo funcionando si la RPC de consumo aun no existe", async () => {
    vi.stubEnv("NEXT_PUBLIC_BILLING_ENABLED", "true");
    let expenseScansCreated = 4;
    const upsert = vi.fn(async (payload: { expense_scans_created?: number }) => {
      expenseScansCreated =
        payload.expense_scans_created ?? expenseScansCreated;
      return { error: null };
    });
    const rpc = vi.fn(async () => ({
      data: null,
      error: {
        code: "PGRST202",
        message: "Could not find the function public.consume_ai_units",
      },
    }));

    vi.mocked(getSupabaseAdmin).mockReturnValue({
      from: vi.fn((table: string) => {
        if (table !== "user_usage") {
          throw new Error(`Unexpected table ${table}`);
        }
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          maybeSingle: vi.fn(async () => ({
            data: {
              documents_created: 0,
              expense_scans_created: expenseScansCreated,
              customer_ai_autofills_created: 0,
            },
            error: null,
          })),
          upsert,
        };
      }),
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
      aiCreditUnits: 0,
    });

    const result = await consumeExpenseScan(
      "550e8400-e29b-41d4-a716-446655440000",
    );

    expect(result.allowed).toBe(true);
    expect(rpc).toHaveBeenCalledTimes(1);
    expect(upsert).toHaveBeenCalledWith(
      expect.objectContaining({ expense_scans_created: 5 }),
      { onConflict: "user_id,month_key" },
    );
  });

  it("no usa el fallback si la RPC falla por permisos", async () => {
    vi.stubEnv("NEXT_PUBLIC_BILLING_ENABLED", "true");
    const upsert = vi.fn();
    const rpc = vi.fn(async () => ({
      data: null,
      error: {
        code: "42501",
        message: "consume_ai_units can only be executed by service_role",
      },
    }));

    vi.mocked(getSupabaseAdmin).mockReturnValue({
      from: vi.fn(() => ({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        maybeSingle: vi.fn(async () => ({
          data: {
            documents_created: 0,
            expense_scans_created: 4,
            customer_ai_autofills_created: 0,
          },
          error: null,
        })),
        upsert,
      })),
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
      aiCreditUnits: 0,
    });

    const result = await consumeExpenseScan(
      "550e8400-e29b-41d4-a716-446655440000",
    );

    expect(result.allowed).toBe(false);
    expect(upsert).not.toHaveBeenCalled();
  });
});
