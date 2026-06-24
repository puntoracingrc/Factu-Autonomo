import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { AI_UNITS_PER_SCAN } from "./scan-limits";

export async function addScanCredits(
  userId: string,
  amount: number,
): Promise<boolean> {
  if (amount <= 0) return false;

  const admin = getSupabaseAdmin();
  if (!admin) return false;

  const { data, error } = await admin.rpc("grant_ai_credit_units", {
    p_user_id: userId,
    p_scan_credits: amount,
    p_units_per_scan: AI_UNITS_PER_SCAN,
  });

  return !error && data === true;
}
