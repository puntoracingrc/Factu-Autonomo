import { beforeEach, describe, expect, it, vi } from "vitest";
import { ensureFreeSubscription } from "./repository";
import { getSupabaseClientAsync } from "../supabase/client";

vi.mock("../supabase/client", () => ({
  getSupabaseClientAsync: vi.fn(),
}));

describe("billing repository", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.unstubAllGlobals();
  });

  it("lee la suscripcion desde la ruta de consulta, no desde la activacion de trial", async () => {
    vi.mocked(getSupabaseClientAsync).mockResolvedValue({
      auth: {
        getSession: vi.fn(async () => ({
          data: { session: { access_token: "token" } },
        })),
      },
    } as never);
    const fetchMock = vi.fn(async () =>
      Response.json({
        subscription: {
          userId: "user-pro",
          plan: "pro",
          status: "active",
        },
      }),
    );
    vi.stubGlobal("fetch", fetchMock);

    const subscription = await ensureFreeSubscription("user-pro");

    expect(subscription).toMatchObject({ plan: "pro", status: "active" });
    expect(fetchMock).toHaveBeenCalledWith("/api/billing/subscription", {
      method: "POST",
      headers: { Authorization: "Bearer token" },
    });
    expect(fetchMock).not.toHaveBeenCalledWith(
      "/api/billing/trial",
      expect.anything(),
    );
  });

  it("rechaza una suscripcion que no pertenece a la sesion solicitada", async () => {
    vi.mocked(getSupabaseClientAsync).mockResolvedValue({
      auth: {
        getSession: vi.fn(async () => ({
          data: { session: { access_token: "token" } },
        })),
      },
    } as never);
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        Response.json({
          subscription: {
            userId: "another-user",
            plan: "pro_plus",
            status: "active",
          },
        }),
      ),
    );

    await expect(ensureFreeSubscription("user-pro")).resolves.toBeNull();
  });
});
