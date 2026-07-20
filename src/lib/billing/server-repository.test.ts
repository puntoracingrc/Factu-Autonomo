import { beforeEach, describe, expect, it, vi } from "vitest";
import { ensureFreeSubscriptionServer } from "./server-repository";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

vi.mock("@/lib/supabase/admin", () => ({
  getSupabaseAdmin: vi.fn(),
}));

function selectSingle(data: Record<string, unknown> | null, error: unknown = null) {
  return {
    select: vi.fn(() => ({
      eq: vi.fn(() => ({
        maybeSingle: vi.fn(async () => ({ data, error })),
      })),
    })),
  };
}

describe("server subscription initialization", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("crea Gratis para una cuenta sin suscripción", async () => {
    const inserted = {
      user_id: "user-new",
      plan: "free",
      status: "inactive",
      scan_trial_remaining: 2,
    };
    const insert = vi.fn(() => ({
      select: vi.fn(() => ({
        single: vi.fn(async () => ({ data: inserted, error: null })),
      })),
    }));
    const from = vi
      .fn()
      .mockReturnValueOnce(selectSingle(null))
      .mockReturnValueOnce({ insert });
    vi.mocked(getSupabaseAdmin).mockReturnValue({ from } as never);

    const result = await ensureFreeSubscriptionServer("user-new");

    expect(insert).toHaveBeenCalledWith({
      user_id: "user-new",
      plan: "free",
      status: "inactive",
      scan_trial_remaining: 2,
    });
    expect(result).toMatchObject({ plan: "free", status: "inactive" });
  });

  it("retira una prueba automática sin procedencia administrativa", async () => {
    const existing = {
      user_id: "user-auto-trial",
      plan: "trial",
      status: "trialing",
      trial_ends_at: "2026-08-03T00:00:00.000Z",
    };
    const retired = {
      ...existing,
      plan: "free",
      status: "inactive",
      trial_ends_at: null,
    };
    const single = vi.fn(async () => ({ data: retired, error: null }));
    const selectUpdated = vi.fn(() => ({ single }));
    const eqStatus = vi.fn(() => ({ select: selectUpdated }));
    const eqPlan = vi.fn(() => ({ eq: eqStatus }));
    const eqUser = vi.fn(() => ({ eq: eqPlan }));
    const update = vi.fn(() => ({ eq: eqUser }));
    const from = vi
      .fn()
      .mockReturnValueOnce(selectSingle(existing))
      .mockReturnValueOnce(selectSingle(null))
      .mockReturnValueOnce({ update });
    vi.mocked(getSupabaseAdmin).mockReturnValue({ from } as never);

    const result = await ensureFreeSubscriptionServer("user-auto-trial");

    expect(update).toHaveBeenCalledWith(
      expect.objectContaining({
        plan: "free",
        status: "inactive",
        trial_ends_at: null,
      }),
    );
    expect(result).toMatchObject({ plan: "free", status: "inactive" });
  });

  it("conserva una prueba asignada por Admin", async () => {
    const existing = {
      user_id: "user-admin-trial",
      plan: "trial",
      status: "trialing",
      trial_ends_at: "2026-08-03T00:00:00.000Z",
    };
    const from = vi
      .fn()
      .mockReturnValueOnce(selectSingle(existing))
      .mockReturnValueOnce(selectSingle({ user_id: "user-admin-trial" }));
    vi.mocked(getSupabaseAdmin).mockReturnValue({ from } as never);

    const result = await ensureFreeSubscriptionServer("user-admin-trial");

    expect(result).toMatchObject({ plan: "trial", status: "trialing" });
    expect(from).toHaveBeenCalledTimes(2);
  });

  it("relee Gratis si otra inicialización retira el trial en paralelo", async () => {
    const existing = {
      user_id: "user-racing-trial",
      plan: "trial",
      status: "trialing",
      trial_ends_at: "2026-08-03T00:00:00.000Z",
    };
    const current = {
      ...existing,
      plan: "free",
      status: "inactive",
      trial_ends_at: null,
    };
    const selectUpdated = vi.fn(() => ({
      single: vi.fn(async () => ({ data: null, error: { code: "PGRST116" } })),
    }));
    const eqStatus = vi.fn(() => ({ select: selectUpdated }));
    const eqPlan = vi.fn(() => ({ eq: eqStatus }));
    const eqUser = vi.fn(() => ({ eq: eqPlan }));
    const update = vi.fn(() => ({ eq: eqUser }));
    const from = vi
      .fn()
      .mockReturnValueOnce(selectSingle(existing))
      .mockReturnValueOnce(selectSingle(null))
      .mockReturnValueOnce({ update })
      .mockReturnValueOnce(selectSingle(current));
    vi.mocked(getSupabaseAdmin).mockReturnValue({ from } as never);

    const result = await ensureFreeSubscriptionServer("user-racing-trial");

    expect(result).toMatchObject({ plan: "free", status: "inactive" });
    expect(from).toHaveBeenCalledTimes(4);
  });

  it("conserva trials ligados a Stripe", async () => {
    const existing = {
      user_id: "user-stripe-trial",
      plan: "trial",
      status: "trialing",
      stripe_subscription_id: "sub_test",
      trial_ends_at: "2026-08-03T00:00:00.000Z",
    };
    const from = vi.fn().mockReturnValueOnce(selectSingle(existing));
    vi.mocked(getSupabaseAdmin).mockReturnValue({ from } as never);

    const result = await ensureFreeSubscriptionServer("user-stripe-trial");

    expect(result).toMatchObject({ plan: "trial", status: "trialing" });
    expect(from).toHaveBeenCalledTimes(1);
  });
});
