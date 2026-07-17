import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  createClient: vi.fn(),
  getSupabaseAdmin: vi.fn(),
}));

vi.mock("@supabase/supabase-js", () => ({
  createClient: mocks.createClient,
}));
vi.mock("@/lib/supabase/admin", () => ({
  getSupabaseAdmin: mocks.getSupabaseAdmin,
}));

import { getPartnerSupabaseAdmin } from "./admin-client";

describe("Partner Supabase admin client", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://partner-project.supabase.co");
    vi.stubEnv("SUPABASE_SECRET_KEY", "partner-secret-key");
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("uses the server secret verified by the Partner deployment gate", () => {
    const client = { from: vi.fn() };
    mocks.createClient.mockReturnValue(client);

    expect(getPartnerSupabaseAdmin()).toBe(client);
    expect(mocks.createClient).toHaveBeenCalledWith(
      "https://partner-project.supabase.co",
      "partner-secret-key",
      { auth: { persistSession: false, autoRefreshToken: false } },
    );
    expect(mocks.getSupabaseAdmin).not.toHaveBeenCalled();
  });
});
