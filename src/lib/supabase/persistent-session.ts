import type { SupabaseClient, User } from "@supabase/supabase-js";

type AuthClient = Pick<SupabaseClient["auth"], "getSession" | "onAuthStateChange">;

/** Browser UI hydration only; server authorization still verifies the JWT/user. */
export function recoverPersistentSession({
  getAuth,
  onUser,
  onReady,
  canRetry = () => true,
}: {
  getAuth: () => Promise<AuthClient | null>;
  onUser: (user: User | null) => void;
  onReady: () => void;
  canRetry?: () => boolean;
}) {
  let auth: AuthClient | null = null;
  let unsubscribe: (() => void) | undefined;
  let disposed = false;
  let settled = false;
  let running = false;
  let eventVersion = 0;
  let delay = 2_000;
  let timer: ReturnType<typeof setTimeout> | undefined;

  function clearRetry() {
    if (timer !== undefined) clearTimeout(timer);
    timer = undefined;
  }

  function publish(user: User | null) {
    if (disposed) return;
    settled = true;
    clearRetry();
    onUser(user);
    onReady();
  }

  function scheduleRetry() {
    if (disposed || settled || timer !== undefined) return;
    timer = setTimeout(() => {
      timer = undefined;
      void attempt();
    }, delay);
    delay = Math.min(delay * 2, 30_000);
  }

  async function attempt(initial = false) {
    if (disposed || settled || running) return;
    // The first read can recover a valid cached session (or guest mode) offline.
    // Only subsequent recovery attempts wait for connectivity/foreground.
    if (!initial && !canRetry()) {
      scheduleRetry();
      return;
    }
    running = true;
    try {
      if (!auth) {
        auth = await getAuth();
        if (disposed) return;
        if (!auth) {
          publish(null);
          return;
        }
        const { data } = auth.onAuthStateChange((event, session) => {
          if (disposed) return;
          // INITIAL_SESSION(null) also occurs after a failed network refresh.
          // Only a successful getSession(null), or SIGNED_OUT, confirms logout.
          if (!session && event !== "SIGNED_OUT") return;
          eventVersion += 1;
          publish(session?.user ?? null);
        });
        unsubscribe = () => data.subscription.unsubscribe();
      }
      if (settled) return;
      const version = eventVersion;
      const { data, error } = await auth.getSession();
      if (disposed || eventVersion !== version) return;
      if (error) {
        scheduleRetry();
        return;
      }
      publish(data.session?.user ?? null);
    } catch {
      // A temporary network/import/storage failure must not invent a logout
      // or discard credentials. Supabase alone handles refresh and revocation.
      scheduleRetry();
    } finally {
      running = false;
    }
  }

  void attempt(true);
  return {
    retry() {
      if (disposed || settled || running) return;
      clearRetry();
      void attempt();
    },
    dispose() {
      disposed = true;
      clearRetry();
      unsubscribe?.();
    },
  };
}
