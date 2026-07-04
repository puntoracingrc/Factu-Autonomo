import { createClient } from "@supabase/supabase-js";
import type { User } from "@supabase/supabase-js";
import { isUserEmailConfirmed } from "@/lib/auth/email-confirmation";

interface GetUserFromBearerOptions {
  requireEmailConfirmed?: boolean;
}

export async function getUserFromBearer(
  authorization: string | null,
  options: GetUserFromBearerOptions = {},
): Promise<User | null> {
  const token = authorization?.replace(/^Bearer\s+/i, "").trim();
  if (!token) return null;

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anonKey) return null;

  const supabase = createClient(url, anonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data, error } = await supabase.auth.getUser(token);
  if (error || !data.user) return null;
  if (options.requireEmailConfirmed && !isUserEmailConfirmed(data.user)) {
    return null;
  }
  return data.user;
}
