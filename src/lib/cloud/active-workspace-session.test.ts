import { afterEach, describe, expect, it, vi } from "vitest";

import { getSupabaseClientAsync } from "@/lib/supabase/client";
import { setActiveWorkspaceOwnerScope } from "@/lib/workspace-owner-runtime";
import { getActiveWorkspaceAccessToken } from "./active-workspace-session";

vi.mock("@/lib/supabase/client", () => ({
  getSupabaseClientAsync: vi.fn(),
}));

const OWNER_A = "session-owner-account-a";
const OWNER_B = "session-owner-account-b";

function sessionFor(ownerScope: string, accessToken = "access-token") {
  return {
    data: {
      session: {
        access_token: accessToken,
        user: { id: ownerScope },
      },
    },
  };
}

describe("active workspace session", () => {
  afterEach(() => {
    setActiveWorkspaceOwnerScope(null);
    vi.resetAllMocks();
  });

  it("devuelve el token solo cuando sesión y espacio activo coinciden", async () => {
    setActiveWorkspaceOwnerScope(OWNER_A);
    vi.mocked(getSupabaseClientAsync).mockResolvedValue({
      auth: {
        getSession: vi.fn().mockResolvedValue(sessionFor(OWNER_A, "token-a")),
      },
    } as never);

    await expect(getActiveWorkspaceAccessToken(OWNER_A)).resolves.toBe(
      "token-a",
    );
  });

  it("rechaza un token válido perteneciente a otra cuenta", async () => {
    setActiveWorkspaceOwnerScope(OWNER_A);
    vi.mocked(getSupabaseClientAsync).mockResolvedValue({
      auth: {
        getSession: vi.fn().mockResolvedValue(sessionFor(OWNER_B, "token-b")),
      },
    } as never);

    await expect(getActiveWorkspaceAccessToken(OWNER_A)).resolves.toBeNull();
  });

  it("descarta la respuesta si la cuenta cambia mientras Supabase responde", async () => {
    let finishSession!: (value: ReturnType<typeof sessionFor>) => void;
    const pendingSession = new Promise<ReturnType<typeof sessionFor>>(
      (resolve) => {
        finishSession = resolve;
      },
    );
    setActiveWorkspaceOwnerScope(OWNER_A);
    vi.mocked(getSupabaseClientAsync).mockResolvedValue({
      auth: {
        getSession: vi.fn().mockReturnValue(pendingSession),
      },
    } as never);

    const token = getActiveWorkspaceAccessToken(OWNER_A);
    await Promise.resolve();
    setActiveWorkspaceOwnerScope(OWNER_B);
    finishSession(sessionFor(OWNER_A, "stale-token-a"));

    await expect(token).resolves.toBeNull();
  });
});
