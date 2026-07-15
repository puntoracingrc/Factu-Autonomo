import type { User } from "@supabase/supabase-js";
import { isAdminEmail } from "@/lib/admin/access";
import { aiLearningAccountForEmail } from "@/lib/ai-learning";
import {
  buildScanQuota,
  UNLIMITED_AI_CREDIT_UNITS,
  type ScanQuota,
} from "@/lib/billing/scan-limits";
import { currentMonthKey } from "@/lib/billing/usage";

type AiAccessUser = Pick<User, "email"> | null | undefined;

export function hasUnlimitedAiAccess(user: AiAccessUser): boolean {
  return Boolean(
    user &&
      (isAdminEmail(user.email) ||
        aiLearningAccountForEmail(user.email).allowed),
  );
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
