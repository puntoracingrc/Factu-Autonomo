import { readFileSync } from "node:fs";
import type { AuthChangeEvent, Session, User } from "@supabase/supabase-js";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { recoverPersistentSession } from "./persistent-session";

const user = { id: "synthetic-user", email: "person@example.test" } as User;
const session = { user } as Session;

function fixture() {
  let listener: (event: AuthChangeEvent, session: Session | null) => void;
  const unsubscribe = vi.fn();
  const getSession = vi.fn().mockResolvedValue({ data: { session }, error: null });
  const onAuthStateChange = vi.fn((callback: typeof listener) => {
    listener = callback;
    return { data: { subscription: { unsubscribe } } };
  });
  const getAuth = vi.fn().mockResolvedValue({ getSession, onAuthStateChange });
  const onUser = vi.fn();
  const onReady = vi.fn();
  const canRetry = vi.fn(() => true);
  const recovery = recoverPersistentSession({ getAuth, onUser, onReady, canRetry });
  return {
    getAuth, getSession, onAuthStateChange, unsubscribe, onUser, onReady,
    canRetry, recovery,
    emit: (event: AuthChangeEvent, value: Session | null) => listener(event, value),
  };
}

async function flush() {
  await vi.advanceTimersByTimeAsync(0);
}

describe("persistent browser/PWA session recovery", () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it("recovers the SDK session without another Google login or getUser request", async () => {
    const f = fixture();
    await flush();
    expect(f.onAuthStateChange.mock.invocationCallOrder[0]).toBeLessThan(
      f.getSession.mock.invocationCallOrder[0],
    );
    expect(f.onUser).toHaveBeenCalledWith(user);
    expect(f.onReady).toHaveBeenCalledOnce();
    await vi.advanceTimersByTimeAsync(120_000);
    f.recovery.retry();
    expect(f.getSession).toHaveBeenCalledOnce();
    f.recovery.dispose();
  });

  it("only exposes signed-out UI after a successful empty session read", async () => {
    const f = fixture();
    f.getSession.mockResolvedValue({ data: { session: null }, error: null });
    await flush();
    expect(f.onUser).toHaveBeenCalledWith(null);
    expect(f.onReady).toHaveBeenCalledOnce();
    f.recovery.dispose();
  });

  it("reads a valid cached session or guest mode even when reopening offline", async () => {
    for (const value of [session, null]) {
      const onUser = vi.fn();
      const onReady = vi.fn();
      const recovery = recoverPersistentSession({
        getAuth: vi.fn().mockResolvedValue({
          getSession: vi.fn().mockResolvedValue({ data: { session: value }, error: null }),
          onAuthStateChange: vi.fn().mockReturnValue({ data: { subscription: { unsubscribe: vi.fn() } } }),
        }),
        onUser, onReady, canRetry: () => false,
      });
      await flush();
      expect(onUser).toHaveBeenCalledExactlyOnceWith(value?.user ?? null);
      expect(onReady).toHaveBeenCalledOnce();
      recovery.dispose();
    }
  });

  it("does not turn a refresh error or empty INITIAL_SESSION into a logout", async () => {
    const f = fixture();
    f.getSession.mockResolvedValueOnce({
      data: { session: null }, error: new Error("temporary network failure"),
    });
    await flush();
    f.emit("INITIAL_SESSION", null);
    expect(f.onUser).not.toHaveBeenCalled();
    expect(f.onReady).not.toHaveBeenCalled();
    await vi.advanceTimersByTimeAsync(2_000);
    expect(f.onUser).toHaveBeenCalledExactlyOnceWith(user);
    expect(f.onReady).toHaveBeenCalledOnce();
    f.recovery.dispose();
  });

  it("retries a rejected session read without clearing credentials", async () => {
    const f = fixture();
    f.getSession.mockRejectedValueOnce(new Error("offline"));
    await flush();
    expect(f.onUser).not.toHaveBeenCalled();
    f.recovery.retry();
    await flush();
    expect(f.onUser).toHaveBeenCalledExactlyOnceWith(user);
    f.recovery.dispose();
  });

  it("recovers an initially failed SDK import", async () => {
    const f = fixture();
    // The initial getAuth has already been invoked; set its next result.
    f.recovery.dispose();
    const getAuth = vi.fn()
      .mockRejectedValueOnce(new Error("chunk/network error"))
      .mockResolvedValue({ getSession: f.getSession, onAuthStateChange: f.onAuthStateChange });
    const recovery = recoverPersistentSession({ getAuth, onUser: f.onUser, onReady: f.onReady });
    await flush();
    expect(f.onReady).not.toHaveBeenCalled();
    await vi.advanceTimersByTimeAsync(2_000);
    expect(f.onUser).toHaveBeenCalledExactlyOnceWith(user);
    recovery.dispose();
  });

  it("avoids network retry requests while offline/background and resumes on wake", async () => {
    const f = fixture();
    f.getSession.mockResolvedValueOnce({ data: { session: null }, error: new Error("offline") });
    await flush();
    f.canRetry.mockReturnValue(false);
    await vi.advanceTimersByTimeAsync(60_000);
    expect(f.getSession).toHaveBeenCalledOnce();
    f.canRetry.mockReturnValue(true);
    f.recovery.retry();
    await flush();
    expect(f.onUser).toHaveBeenCalledExactlyOnceWith(user);
    f.recovery.dispose();
  });

  it("honors real logout and never resurrects an older pending read", async () => {
    const f = fixture();
    let resolve!: (value: unknown) => void;
    f.getSession.mockImplementationOnce(() => new Promise((done) => { resolve = done; }));
    await flush();
    f.emit("SIGNED_OUT", null);
    resolve({ data: { session }, error: null });
    await flush();
    expect(f.onUser).toHaveBeenCalledExactlyOnceWith(null);
    await vi.advanceTimersByTimeAsync(60_000);
    expect(f.getSession).toHaveBeenCalledOnce();
    f.recovery.dispose();
  });

  it("keeps a newer account/refresh event instead of an obsolete hydration result", async () => {
    const f = fixture();
    let resolve!: (value: unknown) => void;
    f.getSession.mockImplementationOnce(() => new Promise((done) => { resolve = done; }));
    await flush();
    const nextUser = { ...user, id: "different-synthetic-user" };
    f.emit("SIGNED_IN", { user: nextUser } as Session);
    resolve({ data: { session }, error: null });
    await flush();
    expect(f.onUser).toHaveBeenCalledExactlyOnceWith(nextUser);
    f.emit("TOKEN_REFRESHED", { user: nextUser } as Session);
    expect(f.onUser).toHaveBeenLastCalledWith(nextUser);
    f.emit("INITIAL_SESSION", null);
    expect(f.onUser).not.toHaveBeenCalledWith(null);
    f.recovery.dispose();
  });

  it("coalesces wake events while reading the session", async () => {
    const f = fixture();
    f.getSession.mockImplementationOnce(() => new Promise(() => {}));
    await flush();
    f.recovery.retry();
    f.recovery.retry();
    expect(f.getSession).toHaveBeenCalledOnce();
    f.recovery.dispose();
  });

  it("disposes listeners/timers and rejects late callbacks", async () => {
    const f = fixture();
    f.getSession.mockResolvedValue({ data: { session: null }, error: new Error("offline") });
    await flush();
    f.recovery.dispose();
    f.emit("SIGNED_IN", session);
    await vi.advanceTimersByTimeAsync(60_000);
    expect(f.unsubscribe).toHaveBeenCalledOnce();
    expect(f.onUser).not.toHaveBeenCalled();
    expect(f.getSession).toHaveBeenCalledOnce();
  });

  it("keeps local logout, SDK persistence, and server authorization separate", () => {
    const context = readFileSync(new URL("../../context/CloudAuthContext.tsx", import.meta.url), "utf8");
    const client = readFileSync(new URL("./client.ts", import.meta.url), "utf8");
    const server = readFileSync(new URL("../billing/server-auth.ts", import.meta.url), "utf8");
    expect(context).toContain('signOut({ scope: "local" })');
    expect(context).not.toContain(".getUser()");
    expect(context).toContain('addEventListener("online", resume)');
    expect(context).toContain('addEventListener("visibilitychange", resume)');
    expect(client).toContain("persistSession: true, autoRefreshToken: true");
    expect(client).toContain("loading = null");
    expect(server).toContain(".getUser(token)");
    expect(context).toContain("clearDriveAccessToken()");
  });
});
