import { isBillingEnforced } from "./config";
import { isProPlan, type PlanId } from "./plans";
import { fetchUserSubscription } from "./repository";
import { resolveEffectivePlan } from "./subscription";

export async function canUseCloudForUser(
  userId: string,
): Promise<{ allowed: boolean; reason?: string }> {
  if (!isBillingEnforced()) {
    return { allowed: true };
  }

  const subscription = await fetchUserSubscription(userId);
  const plan: PlanId = resolveEffectivePlan(subscription);

  if (!isProPlan(plan)) {
    return {
      allowed: false,
      reason:
        "La sincronización en la nube requiere plan Pro. Ve a Precios para activarla.",
    };
  }

  return { allowed: true };
}
