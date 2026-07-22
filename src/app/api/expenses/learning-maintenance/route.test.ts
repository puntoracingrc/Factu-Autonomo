import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { POST } from "./route";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

vi.mock("@/lib/supabase/admin", () => ({
  getSupabaseAdmin: vi.fn(),
}));

type RpcResult = Readonly<{ data: string | null; error: unknown | null }>;

function request(secret = "cron-test-secret") {
  return new Request("http://localhost/api/expenses/learning-maintenance", {
    method: "POST",
    headers: { Authorization: `Bearer ${secret}` },
  });
}

function adminWithResults(
  results: Partial<
    Record<
      | "promote_expense_learning_closed_weeks_v1"
      | "purge_expense_learning_retention_v1",
      RpcResult | Error
    >
  >,
) {
  const rpc = vi.fn((name: keyof typeof results) => ({
    abortSignal: vi.fn(async () => {
      const result = results[name];
      if (result instanceof Error) throw result;
      return result ?? { data: null, error: new Error("missing result") };
    }),
  }));
  vi.mocked(getSupabaseAdmin).mockReturnValue({ rpc } as never);
  return rpc;
}

function expectPrivateNoStore(response: Response) {
  expect(response.headers.get("cache-control")).toBe(
    "private, no-store, max-age=0",
  );
  expect(response.headers.get("cdn-cache-control")).toBe("no-store");
  expect(response.headers.get("vercel-cdn-cache-control")).toBe("no-store");
  expect(response.headers.get("vary")).toContain("Authorization");
}

describe("POST /api/expenses/learning-maintenance", () => {
  beforeEach(() => {
    vi.stubEnv("CRON_SECRET", "cron-test-secret");
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.resetAllMocks();
  });

  it("fails closed before admin access when the scheduler secret is absent", async () => {
    vi.stubEnv("CRON_SECRET", "");

    const response = await POST(request());

    expect(response.status).toBe(503);
    await expect(response.json()).resolves.toEqual({ ok: false });
    expect(getSupabaseAdmin).not.toHaveBeenCalled();
    expectPrivateNoStore(response);
  });

  it("rejects an invalid scheduler secret before admin access", async () => {
    const response = await POST(request("incorrect"));

    expect(response.status).toBe(401);
    await expect(response.json()).resolves.toEqual({ ok: false });
    expect(getSupabaseAdmin).not.toHaveBeenCalled();
    expectPrivateNoStore(response);
  });

  it("promotes before purging and returns only a generic success", async () => {
    const rpc = adminWithResults({
      promote_expense_learning_closed_weeks_v1: {
        data: "PROMOTED",
        error: null,
      },
      purge_expense_learning_retention_v1: { data: "PURGED", error: null },
    });

    const response = await POST(request());

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ ok: true });
    expect(rpc.mock.calls.map(([name]) => name)).toEqual([
      "promote_expense_learning_closed_weeks_v1",
      "purge_expense_learning_retention_v1",
    ]);
    expectPrivateNoStore(response);
  });

  it("accepts a clean pass with no closed week work", async () => {
    adminWithResults({
      promote_expense_learning_closed_weeks_v1: {
        data: "NOTHING",
        error: null,
      },
      purge_expense_learning_retention_v1: { data: "PURGED", error: null },
    });

    const response = await POST(request());

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ ok: true });
  });

  it.each([
    ["promotion retry", "RETRY_REQUIRED", "PURGED"],
    ["retention retry", "NOTHING", "RETRY_REQUIRED"],
    ["unknown promotion", "UNKNOWN", "PURGED"],
  ])("maps %s to the same generic failure", async (_label, promotion, purge) => {
    const rpc = adminWithResults({
      promote_expense_learning_closed_weeks_v1: {
        data: promotion,
        error: null,
      },
      purge_expense_learning_retention_v1: { data: purge, error: null },
    });

    const response = await POST(request());

    expect(response.status).toBe(503);
    await expect(response.json()).resolves.toEqual({ ok: false });
    expect(rpc).toHaveBeenCalledTimes(2);
    expectPrivateNoStore(response);
  });

  it("still attempts retention when promotion throws", async () => {
    const rpc = adminWithResults({
      promote_expense_learning_closed_weeks_v1: new Error("private detail"),
      purge_expense_learning_retention_v1: { data: "PURGED", error: null },
    });

    const response = await POST(request());

    expect(response.status).toBe(503);
    await expect(response.json()).resolves.toEqual({ ok: false });
    expect(rpc).toHaveBeenCalledTimes(2);
  });

  it("contains unexpected admin construction failures", async () => {
    vi.mocked(getSupabaseAdmin).mockImplementation(() => {
      throw new Error("private detail");
    });

    const response = await POST(request());

    expect(response.status).toBe(503);
    await expect(response.json()).resolves.toEqual({ ok: false });
    expectPrivateNoStore(response);
  });
});
