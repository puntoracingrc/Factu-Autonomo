"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  BadgeEuro,
  Check,
  Copy,
  CreditCard,
  Handshake,
  Link2,
  RefreshCw,
  Save,
  UserCheck,
  Users,
  WalletCards,
} from "lucide-react";
import { Button, ButtonLink } from "@/components/ui/Button";
import { Card, PageHeader } from "@/components/ui/Card";
import { useCloudSync } from "@/context/CloudSyncContext";
import type {
  PartnerAccountSummary,
  PartnerDashboard,
  PartnerPlanCount,
} from "@/lib/partners/contracts";
import { getSupabaseClientAsync } from "@/lib/supabase/client";

const ADMIN_PREVIEW_ACCOUNT: PartnerAccountSummary = {
  userId: "admin-preview",
  email: "",
  status: "active",
  commissionBps: 1000,
  payoutThresholdCents: 6000,
  payoutProfile: {
    holderName: "",
    ibanMasked: null,
    configured: false,
    updatedAt: null,
  },
  createdAt: "",
  updatedAt: "",
};

const ADMIN_PREVIEW_PLAN_COUNTS: readonly PartnerPlanCount[] = [
  { plan: "pro", label: "Pro", registered: 0, paying: 0 },
  { plan: "pro_plus", label: "Pro+ IA", registered: 0, paying: 0 },
];

function formatMoney(cents: number): string {
  return new Intl.NumberFormat("es-ES", {
    style: "currency",
    currency: "EUR",
  }).format(cents / 100);
}

async function accessToken(): Promise<string | null> {
  const supabase = await getSupabaseClientAsync();
  if (!supabase) return null;
  const { data } = await supabase.auth.getSession();
  return data.session?.access_token ?? null;
}

export default function PartnersPage() {
  const { user, authReady } = useCloudSync();
  const [dashboard, setDashboard] = useState<PartnerDashboard | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [holderName, setHolderName] = useState("");
  const [iban, setIban] = useState("");

  const load = useCallback(async () => {
    if (!user) {
      setDashboard(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    const token = await accessToken();
    if (!token) {
      setError("No se pudo comprobar la sesión.");
      setLoading(false);
      return;
    }
    try {
      const response = await fetch("/api/partners/me", {
        headers: { Authorization: `Bearer ${token}` },
      });
      const body = (await response.json()) as {
        dashboard?: PartnerDashboard;
        error?: string;
      };
      if (!response.ok || !body.dashboard) {
        throw new Error(body.error ?? "No se pudo abrir el Área Partners.");
      }
      setDashboard(body.dashboard);
      setHolderName(body.dashboard.account?.payoutProfile.holderName ?? "");
    } catch (loadError) {
      setDashboard(null);
      setError(
        loadError instanceof Error
          ? loadError.message
          : "No se pudo abrir el Área Partners.",
      );
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (!authReady) return;
    void load();
  }, [authReady, load]);

  const savePayout = useCallback(async () => {
    setBusy(true);
    setError(null);
    setNotice(null);
    const token = await accessToken();
    if (!token) {
      setError("No se pudo comprobar la sesión.");
      setBusy(false);
      return;
    }
    try {
      const response = await fetch("/api/partners/me", {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ holderName, iban }),
      });
      const body = (await response.json()) as { error?: string };
      if (!response.ok) throw new Error(body.error ?? "No se pudieron guardar los datos.");
      setIban("");
      setNotice("Datos de cobro guardados. El IBAN se mostrará siempre enmascarado.");
      await load();
    } catch (saveError) {
      setError(
        saveError instanceof Error
          ? saveError.message
          : "No se pudieron guardar los datos.",
      );
    } finally {
      setBusy(false);
    }
  }, [holderName, iban, load]);

  const copyReferral = useCallback(async () => {
    if (!dashboard?.referral.shareUrl) return;
    try {
      await navigator.clipboard.writeText(dashboard.referral.shareUrl);
      setNotice("Enlace de invitación copiado.");
    } catch {
      setNotice("Selecciona y copia el enlace manualmente.");
    }
  }, [dashboard?.referral.shareUrl]);

  const progress = useMemo(() => {
    if (!dashboard?.commissions.thresholdCents) return 0;
    return Math.min(
      100,
      Math.round(
        (dashboard.commissions.availableCents /
          dashboard.commissions.thresholdCents) *
          100,
      ),
    );
  }, [dashboard]);

  if (!authReady || loading) {
    return <Card className="text-slate-600">Comprobando acceso al Área Partners...</Card>;
  }

  if (!user) {
    return (
      <div className="mx-auto max-w-2xl">
        <PageHeader title="Área Partners" subtitle="Panel privado para colaboradores autorizados." />
        <Card className="space-y-4">
          <h2 className="text-xl font-bold">Inicia sesión</h2>
          <p className="text-slate-600">El Área Partners solo está disponible para administradores y emails autorizados.</p>
          <ButtonLink href="/cuenta#inicio-sesion">Iniciar sesión</ButtonLink>
        </Card>
      </div>
    );
  }

  if (!dashboard) {
    return (
      <div className="mx-auto max-w-2xl">
        <PageHeader title="Área Partners" subtitle="Panel privado para colaboradores autorizados." />
        <Card className="border-amber-200 bg-amber-50 text-amber-900">
          <p role="alert">{error ?? "Esta cuenta no tiene acceso al Área Partners."}</p>
        </Card>
      </div>
    );
  }

  const isAdminPreview = !dashboard.account && dashboard.role === "admin";
  const account = dashboard.account ?? ADMIN_PREVIEW_ACCOUNT;
  const planCounts = isAdminPreview
    ? ADMIN_PREVIEW_PLAN_COUNTS
    : dashboard.referral.planCounts;
  const shareUrlValue = isAdminPreview
    ? "El enlace aparecerá al activar una cuenta Partner"
    : (dashboard.referral.shareUrl ?? "Enlace no disponible");

  return (
    <div className="mx-auto max-w-7xl">
      <PageHeader
        title="Área Partners"
        subtitle={
          isAdminPreview
            ? "Vista previa del panel que verá un Partner autorizado."
            : "Tus registros, suscripciones y comisiones en un único panel."
        }
        action={
          <Button
            type="button"
            variant="secondary"
            onClick={() => void load()}
            disabled={isAdminPreview}
          >
            <RefreshCw className="h-4 w-4" /> Actualizar
          </Button>
        }
      />

      <Card className="mb-4 border-blue-200 bg-blue-50">
        <div className="flex items-start gap-3">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-blue-600 text-white"><Handshake className="h-5 w-5" /></span>
          <div>
            <h2 className="text-lg font-bold text-blue-950">Comisión del 10% por suscripción cobrada</h2>
            <p className="mt-1 text-sm text-blue-900">Cada cobro confirmado de un cliente atribuido puede generar comisión. Si deja de pagar, no se generan nuevas comisiones. Los pagos se revisan manualmente al alcanzar {formatMoney(account.payoutThresholdCents)}.</p>
          </div>
        </div>
      </Card>

      {notice && <p role="status" className="mb-4 rounded-xl bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-800">{notice}</p>}
      {error && <p role="alert" className="mb-4 rounded-xl bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">{error}</p>}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Card>
          <p className="flex items-center gap-2 text-sm font-bold text-slate-500"><Users className="h-4 w-4" /> Registrados</p>
          <p className="mt-2 text-3xl font-bold">{dashboard.referral.registeredCount}</p>
        </Card>
        <Card>
          <p className="flex items-center gap-2 text-sm font-bold text-emerald-700"><UserCheck className="h-4 w-4" /> Pagando ahora</p>
          <p className="mt-2 text-3xl font-bold text-emerald-800">{dashboard.referral.payingCount}</p>
        </Card>
        <Card>
          <p className="flex items-center gap-2 text-sm font-bold text-blue-700"><BadgeEuro className="h-4 w-4" /> Saldo disponible</p>
          <p className="mt-2 text-3xl font-bold text-blue-800">{formatMoney(dashboard.commissions.availableCents)}</p>
        </Card>
        <Card>
          <p className="flex items-center gap-2 text-sm font-bold text-slate-500"><WalletCards className="h-4 w-4" /> Total abonado</p>
          <p className="mt-2 text-3xl font-bold">{formatMoney(dashboard.commissions.paidCents)}</p>
        </Card>
      </div>

      <div className="mt-4 grid gap-4 xl:grid-cols-[1.05fr_0.95fr]">
        <div className="space-y-4">
          <Card className="space-y-4">
            <div>
              <h2 className="flex items-center gap-2 text-lg font-bold"><Link2 className="h-5 w-5 text-blue-600" /> Tu enlace Partner</h2>
              <p className="mt-1 text-sm text-slate-600">Las altas realizadas con este enlace quedan atribuidas a tu cuenta.</p>
            </div>
            <div className="flex flex-col gap-2 sm:flex-row">
              <input
                readOnly
                value={shareUrlValue}
                onFocus={(event) => event.currentTarget.select()}
                aria-label="Enlace Partner"
                className="min-h-12 min-w-0 flex-1 rounded-2xl border border-slate-200 bg-slate-50 px-4 text-sm font-semibold text-slate-700"
              />
              <Button
                type="button"
                onClick={() => void copyReferral()}
                disabled={isAdminPreview || !dashboard.referral.shareUrl}
              >
                <Copy className="h-4 w-4" /> Copiar
              </Button>
            </div>
          </Card>

          <Card className="space-y-4">
            <div>
              <h2 className="text-lg font-bold">Clientes por plan</h2>
              <p className="mt-1 text-sm text-slate-600">Solo mostramos cifras agregadas; nunca los datos personales de tus clientes.</p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[30rem] text-left text-sm">
                <thead className="border-b border-slate-200 text-slate-500">
                  <tr><th className="px-2 py-3">Plan</th><th className="px-2 py-3">Registrados</th><th className="px-2 py-3">Pagando</th></tr>
                </thead>
                <tbody>
                  {planCounts.map((item) => (
                    <tr key={item.plan} className="border-b border-slate-100 last:border-0">
                      <td className="px-2 py-3 font-bold">{item.label}</td>
                      <td className="px-2 py-3">{item.registered}</td>
                      <td className="px-2 py-3 font-bold text-emerald-700">{item.paying}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="text-sm text-slate-500">Los módulos independientes aparecerán aquí cuando exista una modalidad comercial publicada.</p>
          </Card>
        </div>

        <div className="space-y-4">
          <Card className="space-y-4">
            <div className="flex items-start gap-3">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-100 text-emerald-700"><CreditCard className="h-5 w-5" /></span>
              <div>
                <h2 className="text-lg font-bold">Datos de cobro</h2>
                <p className="mt-1 text-sm text-slate-600">El IBAN completo nunca vuelve a mostrarse después de guardarlo.</p>
              </div>
            </div>
            {account.payoutProfile.configured ? (
              <div className="rounded-xl bg-emerald-50 px-4 py-3 text-sm text-emerald-900">
                <p className="flex items-center gap-2 font-bold"><Check className="h-4 w-4" /> Cuenta configurada</p>
                <p className="mt-1">{account.payoutProfile.holderName} · {account.payoutProfile.ibanMasked}</p>
              </div>
            ) : null}
            <form
              className="space-y-3"
              onSubmit={(event) => {
                event.preventDefault();
                void savePayout();
              }}
            >
              <label className="block space-y-1">
                <span className="text-sm font-bold text-slate-700">Titular de la cuenta</span>
                <input
                  value={holderName}
                  onChange={(event) => setHolderName(event.target.value)}
                  maxLength={160}
                  required
                  disabled={isAdminPreview}
                  autoComplete="name"
                  className="min-h-12 w-full rounded-2xl border border-slate-200 px-4 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                />
              </label>
              <label className="block space-y-1">
                <span className="text-sm font-bold text-slate-700">IBAN</span>
                <input
                  value={iban}
                  onChange={(event) => setIban(event.target.value)}
                  placeholder={account.payoutProfile.ibanMasked ?? "ES00 0000 0000 0000 0000 0000"}
                  autoComplete="off"
                  spellCheck={false}
                  required
                  disabled={isAdminPreview}
                  className="min-h-12 w-full rounded-2xl border border-slate-200 px-4 font-mono outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                />
              </label>
              <Button type="submit" disabled={busy || isAdminPreview} fullWidth>
                <Save className="h-4 w-4" /> {account.payoutProfile.configured ? "Sustituir datos de cobro" : "Guardar datos de cobro"}
              </Button>
            </form>
          </Card>

          <Card className="space-y-3">
            <div className="flex items-center justify-between gap-3">
              <h2 className="font-bold">Próximo umbral</h2>
              <span className="text-sm font-bold text-blue-700">{progress}%</span>
            </div>
            <div className="h-3 overflow-hidden rounded-full bg-slate-100" aria-label={`Progreso de saldo: ${progress}%`}>
              <div className="h-full rounded-full bg-blue-600" style={{ width: `${progress}%` }} />
            </div>
            <p className="text-sm text-slate-600">{formatMoney(dashboard.commissions.availableCents)} de {formatMoney(dashboard.commissions.thresholdCents)}.</p>
            <p className="text-xs text-slate-500">La generación automática de movimientos y la orden de transferencia se activarán en bloques separados y auditados.</p>
          </Card>
        </div>
      </div>

      <Card className="mt-4">
        <h2 className="text-lg font-bold">Movimientos de comisión</h2>
        {dashboard.recentCommissions.length === 0 ? (
          <p className="mt-2 text-sm text-slate-600">Todavía no hay comisiones confirmadas. La estructura está preparada, pero no se generan movimientos automáticos en esta primera fase.</p>
        ) : (
          <div className="mt-3 overflow-x-auto">
            <table className="w-full min-w-[42rem] text-left text-sm">
              <thead className="border-b border-slate-200 text-slate-500"><tr><th className="px-2 py-3">Fecha</th><th className="px-2 py-3">Plan</th><th className="px-2 py-3">Base</th><th className="px-2 py-3">Comisión</th><th className="px-2 py-3">Estado</th></tr></thead>
              <tbody>{dashboard.recentCommissions.map((entry) => <tr key={entry.id} className="border-b border-slate-100"><td className="px-2 py-3">{new Date(entry.earnedAt).toLocaleDateString("es-ES")}</td><td className="px-2 py-3 font-bold">{entry.plan === "pro_plus" ? "Pro+ IA" : "Pro"}</td><td className="px-2 py-3">{formatMoney(entry.sourceAmountCents)}</td><td className="px-2 py-3 font-bold text-blue-700">{formatMoney(entry.commissionCents)}</td><td className="px-2 py-3">{entry.status}</td></tr>)}</tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}
