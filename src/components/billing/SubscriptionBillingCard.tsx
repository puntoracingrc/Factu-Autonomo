"use client";

import { useCallback, useEffect, useState } from "react";
import { Receipt } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { useBilling } from "@/context/BillingContext";
import { useCloudSync } from "@/context/CloudSyncContext";
import {
  formatBillingProfileSummary,
  type BillingProfileRow,
} from "@/lib/billing/billing-profile";

export function SubscriptionBillingCard() {
  const { billingEnabled, openPortal } = useBilling();
  const { user } = useCloudSync();
  const [profile, setProfile] = useState<BillingProfileRow | null>(null);
  const [hasStripeCustomer, setHasStripeCustomer] = useState(false);
  const [loading, setLoading] = useState(false);

  const loadProfile = useCallback(async () => {
    if (!billingEnabled || !user) {
      setProfile(null);
      setHasStripeCustomer(false);
      return;
    }

    setLoading(true);
    try {
      const { getSupabaseClientAsync } = await import("@/lib/supabase/client");
      const supabase = await getSupabaseClientAsync();
      const { data } = await supabase?.auth.getSession() ?? {
        data: { session: null },
      };
      const token = data.session?.access_token;
      if (!token) return;

      const res = await fetch("/api/billing/profile", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) return;

      const body = (await res.json()) as {
        profile: BillingProfileRow | null;
        hasStripeCustomer: boolean;
      };
      setProfile(body.profile);
      setHasStripeCustomer(body.hasStripeCustomer);
    } finally {
      setLoading(false);
    }
  }, [billingEnabled, user]);

  useEffect(() => {
    void loadProfile();
  }, [loadProfile]);

  if (!billingEnabled || !user) return null;

  return (
    <Card className="mb-6 border-slate-200">
      <div className="flex items-start gap-3">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-700">
          <Receipt className="h-5 w-5" />
        </div>
        <div className="flex-1">
          <h2 className="text-lg font-bold text-slate-900">
            Facturación de tu suscripción
          </h2>
          <p className="mt-1 text-sm text-slate-600">
            Datos que usamos para facturarte Pro o packs de escaneos. Se guardan
            al pagar en Stripe (tarjeta y método de pago también los gestiona
            Stripe).
          </p>

          {loading ? (
            <p className="mt-3 text-sm text-slate-500">Cargando…</p>
          ) : profile ? (
            <div className="mt-3 rounded-xl bg-slate-50 px-4 py-3 text-sm text-slate-700">
              <p>{formatBillingProfileSummary(profile)}</p>
              {profile.email ? (
                <p className="mt-1 text-slate-500">{profile.email}</p>
              ) : null}
              {profile.syncedAt ? (
                <p className="mt-2 text-xs text-slate-500">
                  Actualizado el{" "}
                  {new Date(profile.syncedAt).toLocaleDateString("es-ES", {
                    day: "numeric",
                    month: "long",
                    year: "numeric",
                  })}
                </p>
              ) : null}
            </div>
          ) : (
            <p className="mt-3 text-sm text-slate-600">
              Aún no hay datos guardados. Al contratar Pro o comprar escaneos
              extra, Stripe te pedirá NIF y dirección y quedarán aquí.
            </p>
          )}

          {hasStripeCustomer ? (
            <Button
              className="mt-4"
              variant="secondary"
              onClick={() => void openPortal()}
            >
              Cambiar tarjeta o datos en Stripe
            </Button>
          ) : null}
        </div>
      </div>
    </Card>
  );
}
