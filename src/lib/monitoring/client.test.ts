import { afterEach, describe, expect, it, vi } from "vitest";
import { getSupabaseClientAsync } from "@/lib/supabase/client";
import { reportAppError } from "./client";

vi.mock("@/lib/supabase/client", () => ({
  getSupabaseClientAsync: vi.fn(),
}));

describe("reportAppError", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.resetAllMocks();
  });

  it("solo confirma el registro cuando Admin responde ok", async () => {
    vi.mocked(getSupabaseClientAsync).mockResolvedValue({
      auth: {
        getSession: vi.fn().mockResolvedValue({
          data: { session: { access_token: "access-token" } },
        }),
      },
    } as never);
    vi.stubGlobal("window", {
      location: { pathname: "/test", search: "", hash: "" },
      navigator: { userAgent: "synthetic-agent" },
    });
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(Response.json({ ok: true })),
    );

    await expect(
      reportAppError({ area: "test", message: "Synthetic error" }),
    ).resolves.toBe(true);
  });

  it.each([
    Response.json({ ok: false }, { status: 202 }),
    Response.json({ error: "unavailable" }, { status: 503 }),
  ])("no anuncia recepción para una respuesta no confirmada", async (response) => {
    vi.mocked(getSupabaseClientAsync).mockResolvedValue({
      auth: {
        getSession: vi.fn().mockResolvedValue({
          data: { session: { access_token: "access-token" } },
        }),
      },
    } as never);
    vi.stubGlobal("window", {
      location: { pathname: "/test", search: "", hash: "" },
      navigator: { userAgent: "synthetic-agent" },
    });
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(response));

    await expect(
      reportAppError({ area: "test", message: "Synthetic error" }),
    ).resolves.toBe(false);
  });
});
