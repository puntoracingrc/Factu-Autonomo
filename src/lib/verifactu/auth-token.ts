export async function getVerifactuAuthToken(): Promise<string | null> {
  if (typeof window === "undefined") return null;
  try {
    const { getSupabaseClientAsync } = await import("../supabase/client");
    const supabase = await getSupabaseClientAsync();
    const { data } = await supabase?.auth.getSession() ?? { data: { session: null } };
    return data.session?.access_token ?? null;
  } catch {
    return null;
  }
}
