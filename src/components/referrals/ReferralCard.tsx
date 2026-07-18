"use client";

import { useCallback, useEffect, useState, type FormEvent } from "react";
import {
  CheckCircle2,
  Copy,
  CreditCard,
  Gift,
  Link2,
  LogIn,
  Share2,
  UserCheck,
  Users,
} from "lucide-react";
import { Button, ButtonLink } from "@/components/ui/Button";
import { useBilling } from "@/context/BillingContext";
import { useCloudSync } from "@/context/CloudSyncContext";
import { APP_BRAND_NAME } from "@/lib/brand";
import { markFactuFeatureUsed } from "@/lib/factu/feature-usage";
import {
  fetchReferralProfile,
  redeemReferralCodeApi,
  type ReferralProfile,
} from "@/lib/referrals/client";

export function ReferralCard() {
  const { user } = useCloudSync();
  const { billingEnabled } = useBilling();
  const [profile, setProfile] = useState<ReferralProfile | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [referralNotice, setReferralNotice] = useState<string | null>(null);
  const [manualCode, setManualCode] = useState("");
  const [redeeming, setRedeeming] = useState(false);

  const loadProfile = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    setError(null);
    try {
      const data = await fetchReferralProfile();
      setProfile(data);
      if (!data) setError("No se pudo cargar tu panel de Afiliados.");
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    void loadProfile();
  }, [loadProfile]);

  useEffect(() => {
    if (user && billingEnabled) markFactuFeatureUsed("referrals");
  }, [user, billingEnabled]);

  useEffect(() => {
    function onReferralSuccess(event: Event) {
      const detail = (event as CustomEvent<{ message?: string }>).detail;
      if (detail?.message) setReferralNotice(detail.message);
      void loadProfile();
    }
    window.addEventListener("fa-referral-success", onReferralSuccess);
    return () => window.removeEventListener("fa-referral-success", onReferralSuccess);
  }, [loadProfile]);

  async function handleCopyLink() {
    if (!profile?.shareUrl) return;
    try {
      await navigator.clipboard.writeText(profile.shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setError("No se pudo copiar el enlace.");
    }
  }

  async function handleShare() {
    if (!profile?.code || !profile.shareUrl) return;
    const text = `Te invito a ${APP_BRAND_NAME}. Usa mi código ${profile.code}. Si activas un plan de pago, recibiremos ${profile.bonusPerReferral} créditos IA con cada pago confirmado. ${profile.shareUrl}`;
    if (navigator.share) {
      try {
        await navigator.share({ title: APP_BRAND_NAME, text, url: profile.shareUrl });
        return;
      } catch {
        // Compartir puede cancelarse sin que sea un error de la cuenta.
      }
    }
    await handleCopyLink();
  }

  async function handleRedeemManual(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!manualCode.trim() || redeeming) return;
    setRedeeming(true);
    setError(null);
    setReferralNotice(null);
    try {
      const result = await redeemReferralCodeApi(manualCode.trim());
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setManualCode("");
      setReferralNotice(
        result.program === "affiliate"
          ? "Código asociado. Los créditos se activarán con el primer pago válido y con cada renovación pagada."
          : "Código asociado correctamente.",
      );
      await loadProfile();
    } finally {
      setRedeeming(false);
    }
  }

  if (!billingEnabled) {
    return (
      <section className="border-y border-slate-200 py-6">
        <h2 className="text-lg font-bold text-slate-900">Programa en preparación</h2>
        <p className="mt-1 text-sm text-slate-600">
          Afiliados se activará cuando la facturación esté disponible.
        </p>
      </section>
    );
  }

  if (!user) {
    return (
      <section className="border-y border-slate-200 py-6">
        <div className="flex items-start gap-3">
          <Gift className="mt-0.5 h-5 w-5 shrink-0 text-violet-700" />
          <div>
            <h2 className="text-lg font-bold text-slate-900">Entra para ver tu enlace</h2>
            <p className="mt-1 text-sm leading-6 text-slate-600">
              Si has llegado desde una invitación, conservaremos el código al crear la cuenta.
            </p>
          </div>
        </div>
        <ButtonLink href="/cuenta?modo=crear#inicio-sesion" className="mt-4">
          <LogIn className="h-4 w-4" />
          Crear cuenta o entrar
        </ButtonLink>
      </section>
    );
  }

  if (loading && !profile) {
    return <p className="py-8 text-sm text-slate-500">Cargando tu panel...</p>;
  }

  if (profile?.referralsUnavailable) {
    return (
      <p className="border-y border-slate-200 py-6 text-sm text-slate-600">
        Afiliados no está disponible temporalmente. Tu plan y tus datos siguen funcionando con normalidad.
      </p>
    );
  }

  return (
    <div className="space-y-8">
      {referralNotice ? (
        <p className="flex items-start gap-2 border-l-4 border-emerald-500 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-900">
          <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
          {referralNotice}
        </p>
      ) : null}

      {profile ? (
        <>
          <section aria-labelledby="affiliate-link-title">
            <div className="mb-3 flex items-start gap-3">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-violet-100 text-violet-700">
                <Link2 className="h-5 w-5" />
              </span>
              <div>
                <h2 id="affiliate-link-title" className="text-lg font-bold text-slate-950">
                  Tu enlace de afiliado
                </h2>
                <p className="mt-1 text-sm leading-6 text-slate-600">
                  La invitación queda asociada al crear la cuenta. Los créditos solo se entregan después de un pago válido.
                </p>
              </div>
            </div>

            <div className="rounded-lg border border-violet-200 bg-violet-50/50 p-4">
              <p className="text-xs font-semibold uppercase text-violet-700">Tu código</p>
              <p className="mt-1 font-mono text-2xl font-bold text-slate-950">{profile.code}</p>
              <p className="mt-2 break-all text-sm text-slate-600">{profile.shareUrl}</p>
              <div className="mt-4 flex flex-col gap-2 sm:flex-row">
                <Button variant="secondary" onClick={() => void handleCopyLink()}>
                  <Copy className="h-4 w-4" />
                  {copied ? "Copiado" : "Copiar enlace"}
                </Button>
                <Button onClick={() => void handleShare()}>
                  <Share2 className="h-4 w-4" />
                  Compartir
                </Button>
              </div>
            </div>
          </section>

          <section aria-labelledby="affiliate-results-title">
            <h2 id="affiliate-results-title" className="text-lg font-bold text-slate-950">
              Tus resultados
            </h2>
            <div className="mt-3 grid gap-px overflow-hidden rounded-lg border border-slate-200 bg-slate-200 sm:grid-cols-2 lg:grid-cols-4">
              {[
                { label: "Registrados", value: profile.registeredCount, Icon: Users, color: "text-blue-700" },
                { label: "Con plan de pago", value: profile.payingCount, Icon: CreditCard, color: "text-emerald-700" },
                { label: "Sin plan de pago", value: profile.inactiveCount, Icon: UserCheck, color: "text-slate-600" },
                { label: "Créditos IA ganados", value: profile.scansEarned, Icon: Gift, color: "text-violet-700" },
              ].map(({ label, value, Icon, color }) => (
                <div key={label} className="min-h-28 bg-white p-4">
                  <Icon className={`h-5 w-5 ${color}`} />
                  <p className="mt-3 text-2xl font-bold text-slate-950">{value}</p>
                  <p className="mt-1 text-sm text-slate-600">{label}</p>
                </div>
              ))}
            </div>

            <div className="mt-4 overflow-x-auto rounded-lg border border-slate-200">
              <table className="w-full min-w-[34rem] text-left text-sm">
                <thead className="bg-slate-50 text-slate-600">
                  <tr>
                    <th className="px-4 py-3 font-semibold">Plan</th>
                    <th className="px-4 py-3 font-semibold">Usuarios</th>
                    <th className="px-4 py-3 font-semibold">Pagando ahora</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 bg-white">
                  {profile.planCounts.map((entry) => (
                    <tr key={entry.plan}>
                      <td className="px-4 py-3 font-medium text-slate-900">{entry.label}</td>
                      <td className="px-4 py-3 text-slate-700">{entry.count}</td>
                      <td className="px-4 py-3 text-slate-700">{entry.paying}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          <section className="border-t border-slate-200 pt-6" aria-labelledby="affiliate-code-title">
            <h2 id="affiliate-code-title" className="text-lg font-bold text-slate-950">
              ¿Te ha invitado alguien?
            </h2>
            {profile.hasRedeemed ? (
              <p className="mt-2 text-sm text-slate-600">
                Esta cuenta ya tiene una invitación asociada.
              </p>
            ) : (
              <form className="mt-3 flex flex-col gap-2 sm:flex-row" onSubmit={handleRedeemManual}>
                <label className="sr-only" htmlFor="affiliate-code">Código de afiliado</label>
                <input
                  id="affiliate-code"
                  value={manualCode}
                  onChange={(event) => setManualCode(event.target.value)}
                  className="min-h-12 flex-1 rounded-lg border border-slate-300 bg-white px-4 text-base text-slate-950 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                  placeholder="Código de afiliado"
                  autoComplete="off"
                  maxLength={64}
                />
                <Button type="submit" disabled={redeeming || !manualCode.trim()}>
                  <UserCheck className="h-4 w-4" />
                  {redeeming ? "Asociando..." : "Asociar código"}
                </Button>
              </form>
            )}
          </section>
        </>
      ) : null}

      {error ? <p className="text-sm font-medium text-red-700">{error}</p> : null}
    </div>
  );
}
