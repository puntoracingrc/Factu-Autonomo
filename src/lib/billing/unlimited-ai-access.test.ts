import { afterEach, describe, expect, it, vi } from "vitest";
import {
  buildUnlimitedAiQuota,
  hasUnlimitedAiAccess,
  hasUnlimitedAiAccessForCompany,
} from "./unlimited-ai-access";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

vi.mock("@/lib/supabase/admin", () => ({
  getSupabaseAdmin: vi.fn(),
}));

const COMPANY_ID = "ebf7802a-d38c-4fb0-9dd1-fb387f7fa092";

function entitlementAdmin(accessMode: string | null) {
  const query = {
    select: vi.fn(),
    eq: vi.fn(),
    maybeSingle: vi.fn(async () => ({
      data: accessMode ? { access_mode: accessMode } : null,
      error: null,
    })),
  };
  query.select.mockReturnValue(query);
  query.eq.mockReturnValue(query);
  return {
    from: vi.fn(() => query),
    query,
  };
}

describe("unlimited admin AI access", () => {
  afterEach(() => vi.unstubAllEnvs());

  it.each(["admin-one@example.com", "admin-two@example.com"])(
    "concede el mismo acceso ilimitado a %s desde ADMIN_EMAILS",
    (email) => {
      vi.stubEnv(
        "ADMIN_EMAILS",
        "admin-one@example.com,admin-two@example.com",
      );

      expect(hasUnlimitedAiAccess({ email })).toBe(true);
    },
  );

  it("no concede acceso ilimitado a un usuario normal", () => {
    vi.stubEnv("ADMIN_EMAILS", "admin@example.com");

    expect(hasUnlimitedAiAccess({ email: "cliente@example.com" })).toBe(false);
  });

  it("concede acceso ilimitado a todos los administradores de una empresa autorizada", async () => {
    const admin = entitlementAdmin("unlimited");
    vi.mocked(getSupabaseAdmin).mockReturnValue(admin as never);

    await expect(
      hasUnlimitedAiAccessForCompany({
        user: { email: "socio@example.com" },
        companyId: COMPANY_ID,
      }),
    ).resolves.toBe(true);

    expect(admin.from).toHaveBeenCalledWith("app_company_ai_entitlements");
    expect(admin.query.eq).toHaveBeenCalledWith("company_id", COMPANY_ID);
    expect(admin.query.eq).toHaveBeenCalledWith("access_mode", "unlimited");
  });

  it("no extiende la concesion a otra empresa ni consulta ids no validos", async () => {
    const admin = entitlementAdmin(null);
    vi.mocked(getSupabaseAdmin).mockReturnValue(admin as never);

    await expect(
      hasUnlimitedAiAccessForCompany({
        user: { email: "socio@example.com" },
        companyId: "31fd96e3-5eda-4d35-ba6f-79719e1d4d8c",
      }),
    ).resolves.toBe(false);
    await expect(
      hasUnlimitedAiAccessForCompany({
        user: { email: "socio@example.com" },
        companyId: "empresa-invalida",
      }),
    ).resolves.toBe(false);

    expect(admin.from).toHaveBeenCalledTimes(1);
  });

  it("representa la cuota ilimitada sin consumir creditos persistidos", () => {
    const quota = buildUnlimitedAiQuota();

    expect(quota.plan).toBe("pro");
    expect(quota.remaining).toBe(Number.MAX_SAFE_INTEGER);
    expect(quota.remainingUnits).toBe(Number.MAX_SAFE_INTEGER);
  });
});
