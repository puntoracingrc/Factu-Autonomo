import { beforeEach, describe, expect, it, vi } from "vitest";
import { createClient } from "@supabase/supabase-js";
import { getUserSessionFromBearer } from "./server-auth";

vi.mock("@supabase/supabase-js", () => ({
  createClient: vi.fn(),
}));

describe("server bearer session auth", () => {
  const getUser = vi.fn();
  const getClaims = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://example.supabase.co");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY", "anon-key");
    vi.mocked(createClient).mockReturnValue({
      auth: { getUser, getClaims },
    } as never);
    getUser.mockResolvedValue({
      data: {
        user: {
          id: "11111111-1111-4111-8111-111111111111",
          email: "synthetic@example.test",
          email_confirmed_at: "2026-07-21T10:00:00.000Z",
        },
      },
      error: null,
    });
    getClaims.mockResolvedValue({
      data: {
        claims: {
          sub: "11111111-1111-4111-8111-111111111111",
          session_id: "22222222-2222-4222-8222-222222222222",
        },
      },
      error: null,
    });
  });

  it("returns the verified user and stable Supabase session id", async () => {
    await expect(
      getUserSessionFromBearer("Bearer verified-token", {
        requireEmailConfirmed: true,
      }),
    ).resolves.toMatchObject({
      user: { id: "11111111-1111-4111-8111-111111111111" },
      sessionId: "22222222-2222-4222-8222-222222222222",
    });
  });

  it("fails closed when the verified claims belong to another user", async () => {
    getClaims.mockResolvedValueOnce({
      data: {
        claims: {
          sub: "33333333-3333-4333-8333-333333333333",
          session_id: "22222222-2222-4222-8222-222222222222",
        },
      },
      error: null,
    });

    await expect(
      getUserSessionFromBearer("Bearer verified-token"),
    ).resolves.toBeNull();
  });

  it("fails closed when the token has no valid session id", async () => {
    getClaims.mockResolvedValueOnce({
      data: {
        claims: {
          sub: "11111111-1111-4111-8111-111111111111",
          session_id: "not-a-session",
        },
      },
      error: null,
    });

    await expect(
      getUserSessionFromBearer("Bearer verified-token"),
    ).resolves.toBeNull();
  });
});
