import { describe, expect, it, vi } from "vitest";

import { getSupabaseClientAsync } from "@/lib/supabase/client";

import { resolveCentralBusinessUserId } from "./useCentralBusinessUserId";

vi.mock("@/lib/supabase/client", () => ({
  getSupabaseClientAsync: vi.fn(),
}));

describe("resolveCentralBusinessUserId", () => {
  it("usa el usuario de CloudSync cuando esta disponible", async () => {
    await expect(resolveCentralBusinessUserId(" cloud-user ")).resolves.toBe(
      "cloud-user",
    );

    expect(getSupabaseClientAsync).not.toHaveBeenCalled();
  });

  it("recupera el usuario desde la sesion Supabase si CloudSync esta pausado", async () => {
    vi.mocked(getSupabaseClientAsync).mockResolvedValue({
      auth: {
        getSession: vi.fn().mockResolvedValue({
          data: { session: { user: { id: "session-user" } } },
        }),
      },
    } as never);

    await expect(resolveCentralBusinessUserId(null)).resolves.toBe(
      "session-user",
    );
  });

  it("devuelve null si no hay cliente o sesion usable", async () => {
    vi.mocked(getSupabaseClientAsync).mockResolvedValue(null);

    await expect(resolveCentralBusinessUserId(undefined)).resolves.toBeNull();
  });
});
