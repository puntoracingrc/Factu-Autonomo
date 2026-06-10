"use client";

import { Crown } from "lucide-react";
import { Button, ButtonLink } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { useBilling } from "@/context/BillingContext";
import { useCloudSync } from "@/context/CloudSyncContext";
import { subscriptionLabel } from "@/lib/billing/subscription";

export function PlanStatusCard() {
  const { billingEnabled, plan, isPro, trialDaysLeft, openPortal } = useBilling();
  const { user } = useCloudSync();

  if (!billingEnabled) return null;

  return (
    <Card className="mb-6 border-violet-200 bg-violet-50/40">
      <div className="flex items-start gap-3">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-violet-100 text-violet-700">
          <Crown className="h-5 w-5" />
        </div>
        <div className="flex-1">
          <h2 className="text-lg font-bold text-slate-900">Tu plan</h2>
          <p className="mt-1 text-sm text-slate-600">
            {subscriptionLabel(plan)}
            {trialDaysLeft !== null && trialDaysLeft > 0
              ? ` — ${trialDaysLeft} día(s) de prueba`
              : ""}
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            {!isPro && <ButtonLink href="/precios">Ver planes Pro</ButtonLink>}
            {isPro && user && plan === "pro" && (
              <Button variant="secondary" onClick={() => void openPortal()}>
                Gestionar suscripción
              </Button>
            )}
          </div>
        </div>
      </div>
    </Card>
  );
}
