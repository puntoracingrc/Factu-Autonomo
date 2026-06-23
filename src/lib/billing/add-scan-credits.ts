import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { AI_UNITS_PER_SCAN } from "./scan-limits";

export async function addScanCredits(
  userId: string,
  amount: number,
): Promise<boolean> {
  if (amount <= 0) return false;

  const admin = getSupabaseAdmin();
  if (!admin) return false;

  const { data, error: readError } = await admin
    .from("user_subscriptions")
    .select("*")
    .eq("user_id", userId)
    .maybeSingle();

  if (readError || !data) return false;

  const current =
    typeof data.scan_credits === "number" ? data.scan_credits : 0;
  const currentUnits =
    typeof data.ai_credit_units === "number"
      ? data.ai_credit_units
      : current * AI_UNITS_PER_SCAN;

  const { error: updateError } = await admin
    .from("user_subscriptions")
    .update({
      scan_credits: current + amount,
      ai_credit_units: currentUnits + amount * AI_UNITS_PER_SCAN,
      updated_at: new Date().toISOString(),
    })
    .eq("user_id", userId);

  if (updateError) {
    const { error: legacyUpdateError } = await admin
      .from("user_subscriptions")
      .update({
        scan_credits: current + amount,
        updated_at: new Date().toISOString(),
      })
      .eq("user_id", userId);

    return !legacyUpdateError;
  }

  return !updateError;
}
