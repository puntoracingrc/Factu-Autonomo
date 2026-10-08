import { createClient, type Session, type User } from "@supabase/supabase-js";
import { describe, expect, it, vi } from "vitest";
import { recoverPersistentSession } from "./persistent-session";

const user = {
  id: "11111111-1111-4111-8111-111111111111",
  email: "synthetic@example.test",
  aud: "authenticated",
  app_metadata: { provider: "google" },
  user_metadata: {},
  created_at: "2026-10-08T00:00:00Z",
} satisfies User;

function device(name: string, expired = false) {
  const key = `synthetic-${name}-auth-token`;
  const stored = new Map<string, string>();
  const session: Session = {
    access_token: `synthetic-${name}-access-token`,
    refresh_token: `synthetic-${name}-refresh-token`,
    token_type: "bearer",
    expires_in: 3600,
    expires_at: Math.floor(Date.now() / 1000) + (expired ? -120 : 3600),
    user,
  };
  stored.set(key, JSON.stringify(session));
  const storage = {
    getItem: (name: string) => stored.get(name) ?? null,
    setItem: (name: string, value: string) => { stored.set(name, value); },
    removeItem: (name: string) => { stored.delete(name); },
  };
  const fetch = vi.fn(async (input: RequestInfo | URL) => {
    const url = new URL(String(input));
    if (url.pathname === "/auth/v1/logout") return new Response(null, { status: 204 });
    if (url.pathname === "/auth/v1/token" && url.searchParams.get("grant_type") === "refresh_token") {
      return Response.json({ ...session, expires_at: undefined, expires_in: 3600 });
    }
    throw new Error("Unexpected request in synthetic SDK test");
  });
  function open() {
    return createClient("https://pwa-auth.example.test", "synthetic-public-key", {
      auth: {
        storage, storageKey: key, persistSession: true,
        autoRefreshToken: false, detectSessionInUrl: false,
      },
      global: { fetch },
    });
  }
  return { open, fetch, stored, key };
}

describe("session recovery using the installed Supabase SDK", () => {
  it("reopens a saved Google session without OAuth or a user network lookup", async () => {
    const d = device("reopen");
    const first = d.open();
    expect((await first.auth.getSession()).data.session?.user.id).toBe(user.id);
    await first.auth.stopAutoRefresh();
    const reopened = d.open();
    let resolve!: (user: User | null) => void;
    const recovered = new Promise<User | null>((done) => { resolve = done; });
    const recovery = recoverPersistentSession({
      getAuth: async () => reopened.auth, onUser: resolve, onReady: () => {},
    });
    try {
      expect((await recovered)?.id).toBe(user.id);
      expect(d.fetch).not.toHaveBeenCalled();
      expect(d.stored.has(d.key)).toBe(true);
    } finally {
      recovery.dispose();
      await reopened.auth.stopAutoRefresh();
    }
  });

  it("refreshes an expired saved session without starting Google OAuth again", async () => {
    const d = device("expired", true);
    const client = d.open();
    try {
      const { data, error } = await client.auth.getSession();
      expect(error).toBeNull();
      expect(data.session?.user.id).toBe(user.id);
      expect(data.session?.expires_at).toBeGreaterThan(Date.now() / 1000);
      expect(d.fetch).toHaveBeenCalledOnce();
      expect(String(d.fetch.mock.calls[0][0])).toContain("grant_type=refresh_token");
    } finally {
      await client.auth.stopAutoRefresh();
    }
  });

  it("sends local logout and leaves the independent phone session present", async () => {
    const pc = device("pc");
    const phone = device("phone");
    const pcClient = pc.open();
    const phoneClient = phone.open();
    try {
      const { error } = await pcClient.auth.signOut({ scope: "local" });
      expect(error).toBeNull();
      expect(String(pc.fetch.mock.calls[0][0])).toContain("scope=local");
      expect((await pcClient.auth.getSession()).data.session).toBeNull();
      expect((await phoneClient.auth.getSession()).data.session?.user.id).toBe(user.id);
      expect(phone.stored.has(phone.key)).toBe(true);
      expect(phone.fetch).not.toHaveBeenCalled();
    } finally {
      await pcClient.auth.stopAutoRefresh();
      await phoneClient.auth.stopAutoRefresh();
    }
  });
});
