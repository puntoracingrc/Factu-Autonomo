import { describe, expect, it, vi } from "vitest";

import {
  completeSupabaseAuthCallback,
  type AuthCallbackDependencies,
} from "./auth-callback";

function dependencies(input: {
  initialSession?: unknown | null;
  verifyError?: unknown | null;
  codeError?: unknown | null;
}) {
  let session = input.initialSession ?? null;
  const calls: string[] = [];
  const value: AuthCallbackDependencies = {
    getSession: vi.fn(async () => {
      calls.push("getSession");
      return { data: { session }, error: null };
    }),
    signOutLocal: vi.fn(async () => {
      calls.push("signOutLocal");
      session = null;
      return { error: null };
    }),
    exchangeCodeForSession: vi.fn(async () => {
      calls.push("exchangeCodeForSession");
      session = input.codeError ? null : { user: "new" };
      return { data: { session }, error: input.codeError ?? null };
    }),
    verifyOtp: vi.fn(async () => {
      calls.push("verifyOtp");
      session = input.verifyError ? null : { user: "new" };
      return { data: { session }, error: input.verifyError ?? null };
    }),
    setSession: vi.fn(async () => {
      calls.push("setSession");
      session = { user: "new" };
      return { data: { session }, error: null };
    }),
  };
  return { calls, value };
}

describe("auth callback account switching", () => {
  it("clears the previous local session before accepting an email token", async () => {
    const setup = dependencies({ initialSession: { user: "previous" } });

    await expect(
      completeSupabaseAuthCallback({
        search: "?token_hash=valid&type=email",
        hash: "",
        dependencies: setup.value,
      }),
    ).resolves.toBe("confirmed");
    expect(setup.calls).toEqual([
      "getSession",
      "signOutLocal",
      "verifyOtp",
      "getSession",
    ]);
    expect(setup.value.signOutLocal).toHaveBeenCalledOnce();
  });

  it("does not preserve the previous user when the new token is invalid", async () => {
    const setup = dependencies({
      initialSession: { user: "previous" },
      verifyError: new Error("invalid token"),
    });

    await expect(
      completeSupabaseAuthCallback({
        search: "?token_hash=invalid&type=email",
        hash: "",
        dependencies: setup.value,
      }),
    ).resolves.toBe("pending");
    expect(setup.calls).toEqual([
      "getSession",
      "signOutLocal",
      "verifyOtp",
    ]);
  });

  it("clears a stale user when a PKCE code cannot be exchanged", async () => {
    const setup = dependencies({
      initialSession: { user: "previous" },
      codeError: new Error("invalid code"),
    });

    await expect(
      completeSupabaseAuthCallback({
        search: "?code=invalid",
        hash: "",
        dependencies: setup.value,
      }),
    ).resolves.toBe("pending");
    expect(setup.calls).toEqual([
      "exchangeCodeForSession",
      "signOutLocal",
    ]);
  });

  it("keeps a valid current session when the callback has no credentials", async () => {
    const setup = dependencies({ initialSession: { user: "current" } });

    await expect(
      completeSupabaseAuthCallback({
        search: "",
        hash: "",
        dependencies: setup.value,
      }),
    ).resolves.toBe("confirmed");
    expect(setup.value.signOutLocal).not.toHaveBeenCalled();
  });
});
