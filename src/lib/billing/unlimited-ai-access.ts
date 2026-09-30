import type { User } from "@supabase/supabase-js";
import { isAdminEmail } from "@/lib/admin/access";
import { aiLearningAccountForEmail } from "@/lib/ai-learning";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import {
  buildScanQuota,
  UNLIMITED_AI_CREDIT_UNITS,
  type ScanQuota,
} from "@/lib/billing/scan-limits";
import { currentMonthKey } from "@/lib/billing/usage";

type AiAccessUser = Pick<User, "email"> | null | undefined;

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function hasUnlimitedAiAccess(user: AiAccessUser): boolean {
  return Boolean(
    user &&
      (isAdminEmail(user.email) ||
        aiLearningAccountForEmail(user.email).allowed),
  );
}

export async function hasUnlimitedAiAccessForCompany(input: {
  user?: AiAccessUser;
  companyId?: string | null;
}): Promise<boolean> {
  if (hasUnlimitedAiAccess(input.user)) return true;

  const companyId = input.companyId?.trim();
  if (!companyId || !UUID_PATTERN.test(companyId)) return false;

  const admin = getSupabaseAdmin();
  if (!admin) return false;

  const { data, error } = await admin
    .from("app_company_ai_entitlements")
    .select("access_mode")
    .eq("company_id", companyId)
    .eq("access_mode", "unlimited")
    .maybeSingle();

  if (error) return false;
  return data?.access_mode === "unlimited";
}

export function buildUnlimitedAiQuota(): ScanQuota {
  return buildScanQuota(
    "pro_plus",
    0,
    0,
    currentMonthKey(),
    0,
    0,
    UNLIMITED_AI_CREDIT_UNITS,
  );
}

export function unlimitedAiUsageResult() {
  return {
    allowed: true as const,
    quota: buildUnlimitedAiQuota(),
  };
}
