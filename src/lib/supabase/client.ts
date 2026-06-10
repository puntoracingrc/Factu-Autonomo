import type { SupabaseClient } from "@supabase/supabase-js";
import { isCloudEnabled } from "./config";

let client: SupabaseClient | null = null;
let loading: Promise<SupabaseClient | null> | null = null;

export function getSupabaseClient(): SupabaseClient | null {
  if (typeof window === "undefined" || !isCloudEnabled()) return null;
  return client;
}

export async function getSupabaseClientAsync(): Promise<SupabaseClient | null> {
  if (typeof window === "undefined" || !isCloudEnabled()) return null;
  if (client) return client;

  if (!loading) {
    loading = import("@supabase/supabase-js").then(({ createClient }) => {
      client = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      );
      return client;
    });
  }

  return loading;
}
