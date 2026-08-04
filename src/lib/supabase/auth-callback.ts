export type AuthCallbackResult =
  | "confirmed"
  | "pending"
  | "recovery"
  | "error";

interface CallbackSessionResult {
  data: { session: unknown | null };
  error?: unknown | null;
}

interface CallbackMutationResult extends CallbackSessionResult {
  error: unknown | null;
}

export interface AuthCallbackDependencies {
  getSession(): Promise<CallbackSessionResult>;
  signOutLocal(): Promise<{ error: unknown | null }>;
  exchangeCodeForSession(code: string): Promise<CallbackMutationResult>;
  verifyOtp(input: {
    type: "signup" | "email" | "recovery";
    token_hash: string;
  }): Promise<CallbackMutationResult>;
  setSession(input: {
    access_token: string;
    refresh_token: string;
  }): Promise<CallbackMutationResult>;
}

async function clearLocalSession(
  dependencies: AuthCallbackDependencies,
): Promise<void> {
  const { error } = await dependencies.signOutLocal();
  if (error) throw new Error("AUTH_CALLBACK_LOCAL_SIGN_OUT_FAILED");
}

export async function completeSupabaseAuthCallback(input: {
  search: string;
  hash: string;
  dependencies: AuthCallbackDependencies;
}): Promise<AuthCallbackResult> {
  const { dependencies } = input;
  const query = new URLSearchParams(input.search);
  const code = query.get("code");
  const tokenHash = query.get("token_hash");
  const type = query.get("type");
  let isRecovery = type === "recovery";
  let callbackCredential = false;
  let localSessionCleared = false;

  async function failClosed(): Promise<AuthCallbackResult> {
    if (!localSessionCleared) {
      await clearLocalSession(dependencies);
      localSessionCleared = true;
    }
    return "pending";
  }

  if (code) {
    callbackCredential = true;
    const result = await dependencies.exchangeCodeForSession(code);
    if (result.error || !result.data.session) return failClosed();
  } else if (tokenHash && type) {
    callbackCredential = true;
    const otpType =
      type === "signup" || type === "email" || type === "recovery"
        ? type
        : "email";
    const result = await dependencies.verifyOtp({
      type: otpType,
      token_hash: tokenHash,
    });
    if (result.error || !result.data.session) return failClosed();
  }

  const hash = input.hash.startsWith("#") ? input.hash.slice(1) : input.hash;
  if (hash) {
    const hashParams = new URLSearchParams(hash);
    const accessToken = hashParams.get("access_token");
    const refreshToken = hashParams.get("refresh_token");
    isRecovery = isRecovery || hashParams.get("type") === "recovery";
    if (accessToken && refreshToken) {
      callbackCredential = true;
      const result = await dependencies.setSession({
        access_token: accessToken,
        refresh_token: refreshToken,
      });
      if (result.error || !result.data.session) return failClosed();
    }
  }

  const current = await dependencies.getSession();
  if (current.error || !current.data.session) {
    return callbackCredential ? failClosed() : "pending";
  }
  return isRecovery ? "recovery" : "confirmed";
}
