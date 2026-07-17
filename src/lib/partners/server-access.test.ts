import { beforeEach, describe, expect, it, vi } from "vitest";
import { isAdminEmail } from "@/lib/admin/access";
import { getUserFromBearer } from "@/lib/billing/server-auth";
import { getPartnerSupabaseAdmin } from "./admin-client";
import {
  getPartnerAccountRecord,
  PartnerSchemaUnavailableError,
  type PartnerAccountRecord,
} from "./repository";
import { getPartnerAccessFromRequest } from "./server-access";

vi.mock("@/lib/admin/access", () => ({ isAdminEmail: vi.fn() }));
vi.mock("@/lib/billing/server-auth", () => ({ getUserFromBearer: vi.fn() }));
vi.mock("./admin-client", () => ({
  getPartnerAdminCredentialSource: vi.fn(() => "secret"),
  getPartnerSupabaseAdmin: vi.fn(),
}));
vi.mock("./repository", async (importOriginal) => {
  const original = await importOriginal<typeof import("./repository")>();
  return { ...original, getPartnerAccountRecord: vi.fn() };
});

const request = new Request("https://facturacion-autonomos.app/api/partners/me", {
  headers: { Authorization: "Bearer test-token" },
});

const activeAccount: PartnerAccountRecord = {
  user_id: "11111111-1111-4111-8111-111111111111",
  email: "partner@example.com",
  status: "active",
  commission_bps: 1000,
  payout_threshold_cents: 6000,
  payout_holder_name: null,
  payout_iban: null,
  payout_details_updated_at: null,
  created_at: "2026-07-17T00:00:00.000Z",
  updated_at: "2026-07-17T00:00:00.000Z",
};

describe("Partner server access", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getUserFromBearer).mockResolvedValue({
      id: activeAccount.user_id,
      email: activeAccount.email,
    } as never);
    vi.mocked(getPartnerSupabaseAdmin).mockReturnValue({} as never);
    vi.mocked(isAdminEmail).mockReturnValue(false);
    vi.mocked(getPartnerAccountRecord).mockResolvedValue(activeAccount);
  });

  it("requires a confirmed bearer session", async () => {
    vi.mocked(getUserFromBearer).mockResolvedValue(null);

    const result = await getPartnerAccessFromRequest(request);

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.response.status).toBe(401);
    expect(getUserFromBearer).toHaveBeenCalledWith("Bearer test-token", {
      requireEmailConfirmed: true,
    });
  });

  it("fails closed when the service database is unavailable", async () => {
    vi.mocked(getPartnerSupabaseAdmin).mockReturnValue(null);

    const result = await getPartnerAccessFromRequest(request);

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.response.status).toBe(503);
  });

  it("only accepts an active account with the exact selected email", async () => {
    const allowed = await getPartnerAccessFromRequest(request);
    expect(allowed).toMatchObject({ ok: true, role: "partner" });

    vi.mocked(getPartnerAccountRecord).mockResolvedValue({
      ...activeAccount,
      email: "other@example.com",
    });
    const wrongEmail = await getPartnerAccessFromRequest(request);
    expect(wrongEmail.ok).toBe(false);
    if (!wrongEmail.ok) expect(wrongEmail.response.status).toBe(403);

    vi.mocked(getPartnerAccountRecord).mockResolvedValue({
      ...activeAccount,
      status: "paused",
    });
    const paused = await getPartnerAccessFromRequest(request);
    expect(paused.ok).toBe(false);
    if (!paused.ok) expect(paused.response.status).toBe(403);
  });

  it("allows an administrator without manufacturing a Partner account", async () => {
    vi.mocked(isAdminEmail).mockReturnValue(true);
    vi.mocked(getPartnerAccountRecord).mockResolvedValue(null);

    const result = await getPartnerAccessFromRequest(request);

    expect(result).toMatchObject({ ok: true, role: "admin", account: null });
  });

  it("keeps a missing schema closed for Partners", async () => {
    vi.mocked(getPartnerAccountRecord).mockRejectedValue(
      new PartnerSchemaUnavailableError(),
    );

    const result = await getPartnerAccessFromRequest(request);

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.response.status).toBe(503);
  });
});
