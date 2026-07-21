import { createClient } from "@supabase/supabase-js";
import type { User } from "@supabase/supabase-js";
import { isUserEmailConfirmed } from "@/lib/auth/email-confirmation";

interface GetUserFromBearerOptions {
  requireEmailConfirmed?: boolean;
}

export interface VerifiedUserSession {
  user: User;
  sessionId: string;
}

function bearerToken(authorization: string | null): string | null {
  const token = authorization?.replace(/^Bearer\s+/i, "").trim();
  return token || null;
}

function authClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anonKey) return null;

  return createClient(url, anonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export async function getUserFromBearer(
  authorization: string | null,
  options: GetUserFromBearerOptions = {},
): Promise<User | null> {
  const token = bearerToken(authorization);
  if (!token) return null;
  const supabase = authClient();
  if (!supabase) return null;

  const { data, error } = await supabase.auth.getUser(token);
  if (error || !data.user) return null;
  if (options.requireEmailConfirmed && !isUserEmailConfirmed(data.user)) {
    return null;
  }
  return data.user;
}

export async function getUserSessionFromBearer(
  authorization: string | null,
  options: GetUserFromBearerOptions = {},
): Promise<VerifiedUserSession | null> {
  const token = bearerToken(authorization);
  if (!token) return null;
  const supabase = authClient();
  if (!supabase) return null;

  const [userResult, claimsResult] = await Promise.all([
    supabase.auth.getUser(token),
    supabase.auth.getClaims(token),
  ]);
  const user = userResult.data.user;
  const claims = claimsResult.data?.claims;
  if (userResult.error || claimsResult.error || !user || !claims) return null;
  if (claims.sub !== user.id) return null;

  const sessionId = claims.session_id?.trim();
  if (
    !sessionId ||
    !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
      sessionId,
    )
  ) {
    return null;
  }
  if (options.requireEmailConfirmed && !isUserEmailConfirmed(user)) {
    return null;
  }

  return { user, sessionId };
}
