"use client";

import { useCallback, useEffect, useState } from "react";
import { Copy, Gift, Share2, Users } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Field, Input } from "@/components/ui/Field";
import { useBilling } from "@/context/BillingContext";
import { useCloudSync } from "@/context/CloudSyncContext";
import {
  fetchReferralProfile,
  redeemReferralCodeApi,
  type ReferralProfile,
} from "@/lib/referrals/client";
import {
  readPendingReferralCode,
  storePendingReferralCode,
} from "@/lib/referrals/storage";
import { REFERRAL_BONUS_SCANS } from "@/lib/billing/referral-codes";

export function ReferralCard() {
  const { user } = useCloudSync();
  const { billingEnabled } = useBilling();
  const [profile, setProfile] = useState<ReferralProfile | null>(null);
  const [loading, setLoading] = useState(false);
  const [inviteCode, setInviteCode] = useState("");
  const [redeemBusy, setRedeemBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [referralNotice, setReferralNotice] = useState<string | null>(null);

  const loadProfile = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    const data = await fetchReferralProfile();
    setProfile(data);
    setLoading(false);
  }, [user]);

  useEffect(() => {
    void loadProfile();
  }, [loadProfile]);

  useEffect(() => {
    const pending = readPendingReferralCode();
    if (pending) setInviteCode(pending);
  }, []);

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
    if (!profile) return;
    const text = `Te invito a Factura Autónomo. Usa mi código ${profile.code} al crear cuenta: los dos recibimos ${profile.bonusPerReferral} escaneos IA extra. ${profile.shareUrl}`;
    if (navigator.share) {
      try {
        await navigator.share({
          title: "Factura Autónomo",
          text,
          url: profile.shareUrl,
        });
        return;
      } catch {
        /* usuario canceló */
      }
    }
    await handleCopyLink();
  }

  async function handleRedeemManual() {
    setError(null);
    setMessage(null);
    const code = inviteCode.trim();
    if (!code) {
      setError("Introduce el código de quien te invitó.");
      return;
    }
    storePendingReferralCode(code);
    setRedeemBusy(true);
    const result = await redeemReferralCodeApi(code);
    setRedeemBusy(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    if (result.alreadyRedeemed) {
      setMessage("Ya habías usado un código de invitación.");
    } else if (result.bonusScans > 0) {
      setMessage(
        `¡Listo! Tú y quien te invitó recibís ${result.bonusScans} escaneos extra.`,
      );
    }
    void loadProfile();
  }

  if (!billingEnabled) {
    return (
      <Card className="mb-6 space-y-3 border-dashed border-violet-200 bg-violet-50/40">
        <div className="flex items-start gap-3">
          <Gift className="mt-0.5 h-5 w-5 shrink-0 text-violet-700" />
          <div>
            <h2 className="text-lg font-bold text-slate-900">
              Invita a un amigo
            </h2>
            <p className="mt-1 text-sm text-slate-600">
              En producción, tú y tu amigo recibiréis escaneos IA extra al
              registrarse con un código de invitación.
            </p>
          </div>
        </div>
      </Card>
    );
  }

  if (!user) {
    return (
      <Card className="mb-6 space-y-4 border-violet-200 bg-violet-50/50">
        <div className="flex items-start gap-3">
          <Gift className="mt-0.5 h-5 w-5 shrink-0 text-violet-700" />
          <div>
            <h2 className="text-lg font-bold text-slate-900">
              ¿Te invitó alguien?
            </h2>
            <p className="mt-1 text-sm text-slate-600">
              Crea cuenta abajo e introduce su código: los dos recibiréis{" "}
              {REFERRAL_BONUS_SCANS} escaneos extra para digitalizar facturas de
              gasto.
            </p>
          </div>
        </div>
        <Field label="Código de invitación" hint="Opcional">
          <Input
            value={inviteCode}
            onChange={(e) => setInviteCode(e.target.value.toUpperCase())}
            placeholder="Ej: ABC12XY9"
            onBlur={() => {
              if (inviteCode.trim()) storePendingReferralCode(inviteCode);
            }}
          />
        </Field>
      </Card>
    );
  }

  return (
    <Card className="mb-6 space-y-4 border-violet-200 bg-gradient-to-br from-violet-50/80 to-white">
      <div className="flex items-start gap-3">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-violet-100 text-violet-700">
          <Gift className="h-5 w-5" />
        </div>
        <div>
          <h2 className="text-lg font-bold text-slate-900">
            Invita a un amigo
          </h2>
          <p className="mt-1 text-sm text-slate-600">
            Comparte tu enlace. Cuando se registre con tu código,{" "}
            <strong>los dos</strong> recibiréis{" "}
            {profile?.bonusPerReferral ?? REFERRAL_BONUS_SCANS} escaneos IA extra
            para facturas de gasto.
          </p>
        </div>
      </div>

      {referralNotice ? (
        <p className="rounded-xl bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-800">
          {referralNotice}
        </p>
      ) : null}

      {loading ? (
        <p className="text-sm text-slate-500">Cargando tu código…</p>
      ) : profile ? (
        <>
          <div className="rounded-xl border border-violet-100 bg-white p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-violet-700">
              Tu código
            </p>
            <p className="mt-1 font-mono text-2xl font-bold tracking-wider text-slate-900">
              {profile.code}
            </p>
            <p className="mt-2 break-all text-sm text-slate-500">
              {profile.shareUrl}
            </p>
            <div className="mt-3 flex flex-col gap-2 sm:flex-row">
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

          <div className="flex flex-wrap gap-4 text-sm text-slate-600">
            <span className="inline-flex items-center gap-1.5">
              <Users className="h-4 w-4 text-violet-600" />
              {profile.referralsCount} amigo(s) invitado(s)
            </span>
            <span className="inline-flex items-center gap-1.5">
              <Gift className="h-4 w-4 text-violet-600" />
              {profile.scansEarned} escaneos ganados
            </span>
          </div>
        </>
      ) : (
        <p className="text-sm text-red-600">
          No se pudo cargar tu código. Inténtalo más tarde.
        </p>
      )}

      {!profile?.hasRedeemed ? (
        <div className="space-y-3 rounded-xl border border-slate-200 bg-white/80 p-4">
          <p className="text-sm font-semibold text-slate-800">
            ¿Alguien te invitó?
          </p>
          <Field label="Su código" hint="Solo puedes usar uno">
            <Input
              value={inviteCode}
              onChange={(e) => setInviteCode(e.target.value.toUpperCase())}
              placeholder="Código de invitación"
            />
          </Field>
          <Button
            variant="secondary"
            onClick={() => void handleRedeemManual()}
            disabled={redeemBusy}
          >
            {redeemBusy ? "Aplicando…" : "Canjear código"}
          </Button>
        </div>
      ) : (
        <p className="text-sm text-slate-500">
          Ya has usado un código de invitación en esta cuenta.
        </p>
      )}

      {message ? (
        <p className="text-sm font-medium text-emerald-700">{message}</p>
      ) : null}
      {error ? <p className="text-sm font-medium text-red-600">{error}</p> : null}
    </Card>
  );
}
