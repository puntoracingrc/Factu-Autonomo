import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

let partnerAdminClient: SupabaseClient | null = null;

export function getPartnerAdminCredentialSource():
  | "secret"
  | "legacy_fallback"
  | "unavailable" {
  if (
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
    process.env.SUPABASE_SECRET_KEY
  ) {
    return "secret";
  }
  if (
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
    process.env.SUPABASE_SERVICE_ROLE_KEY
  ) {
    return "legacy_fallback";
  }
  return "unavailable";
}

export function getPartnerSupabaseAdmin(): SupabaseClient | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const secretKey = process.env.SUPABASE_SECRET_KEY;

  if (!url || !secretKey) return getSupabaseAdmin();

  if (!partnerAdminClient) {
    partnerAdminClient = createClient(url, secretKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
  }

  return partnerAdminClient;
}
