import { getSupabaseAdmin } from "@/lib/supabase/admin";

export async function addScanCredits(
  userId: string,
  amount: number,
): Promise<boolean> {
  if (amount <= 0) return false;

  const admin = getSupabaseAdmin();
  if (!admin) return false;

  const { data, error: readError } = await admin
    .from("user_subscriptions")
    .select("scan_credits")
    .eq("user_id", userId)
    .maybeSingle();

  if (readError || !data) return false;

  const current =
    typeof data.scan_credits === "number" ? data.scan_credits : 0;

  const { error: updateError } = await admin
    .from("user_subscriptions")
    .update({
      scan_credits: current + amount,
      updated_at: new Date().toISOString(),
    })
    .eq("user_id", userId);

  return !updateError;
}
