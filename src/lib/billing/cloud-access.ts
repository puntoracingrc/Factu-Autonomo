import { isBillingEnforced } from "./config";
import { getPlanLimits, type PlanId } from "./plans";
import { ensureTrialSubscription, fetchUserSubscription } from "./repository";
import { resolveEffectivePlan } from "./subscription";

export async function canUseCloudForUser(
  userId: string,
): Promise<{ allowed: boolean; reason?: string }> {
  if (!isBillingEnforced()) {
    return { allowed: true };
  }

  const subscription =
    (await fetchUserSubscription(userId)) ?? (await ensureTrialSubscription(userId));
  const plan: PlanId = resolveEffectivePlan(subscription);

  if (!getPlanLimits(plan).cloudSync) {
    return {
      allowed: false,
      reason:
        "La sincronización en la nube requiere un plan con nube. Ve a Precios para activarla.",
    };
  }

  return { allowed: true };
}
