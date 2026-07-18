"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Clipboard, Gift, PauseCircle, PlayCircle, RefreshCw, TicketPercent } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import type { PromoBenefit, PromoCampaignSummary } from "@/lib/promotions/contracts";
import { getSupabaseClientAsync } from "@/lib/supabase/client";

async function accessToken(): Promise<string | null> {
  const supabase = await getSupabaseClientAsync();
  if (!supabase) return null;
  const { data } = await supabase.auth.getSession();
  return data.session?.access_token ?? null;
}

function dateInputValue(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function benefitLabel(benefit: PromoBenefit): string {
  if (benefit.kind === "ai_scans") return `${benefit.scanCredits} escaneos IA`;
  if (benefit.kind === "plan_access") {
    return `${benefit.plan === "pro_plus" ? "Pro+ IA" : "Pro"} · ${benefit.durationDays} días`;
  }
  return `${benefit.moduleKey} · ${benefit.durationDays} días`;
}

function formatDate(value: string): string {
  return new Intl.DateTimeFormat("es-ES", { dateStyle: "medium" }).format(new Date(value));
}

export function AdminPromotionsPanel() {
  const defaults = useMemo(() => {
    const start = new Date();
    const end = new Date(start);
    end.setMonth(end.getMonth() + 1);
    return { startsAt: dateInputValue(start), expiresAt: dateInputValue(end) };
  }, []);
  const [campaigns, setCampaigns] = useState<PromoCampaignSummary[]>([]);
  const [name, setName] = useState("");
  const [kind, setKind] = useState<"ai_scans" | "plan_access">("plan_access");
  const [plan, setPlan] = useState<"pro" | "pro_plus">("pro");
  const [scanCredits, setScanCredits] = useState(10);
  const [durationDays, setDurationDays] = useState(30);
  const [startsAt, setStartsAt] = useState(defaults.startsAt);
  const [expiresAt, setExpiresAt] = useState(defaults.expiresAt);
  const [maxRedemptions, setMaxRedemptions] = useState(100);
  const [createdCode, setCreatedCode] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    const token = await accessToken();
    if (!token) {
      setError("Inicia sesión con una cuenta administradora.");
      setLoading(false);
      return;
    }
    try {
      const response = await fetch("/api/admin/promotions", {
        headers: { Authorization: `Bearer ${token}` },
      });
      const body = (await response.json()) as {
        campaigns?: PromoCampaignSummary[];
        error?: string;
      };
      if (!response.ok) throw new Error(body.error ?? "No se pudieron cargar las promociones.");
      setCampaigns(body.campaigns ?? []);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "No se pudieron cargar las promociones.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const createCampaign = useCallback(async () => {
    setBusy("create");
    setNotice(null);
    setError(null);
    setCreatedCode(null);
    const token = await accessToken();
    if (!token) {
      setError("Inicia sesión con una cuenta administradora.");
      setBusy(null);
      return;
    }
    const benefit: PromoBenefit =
      kind === "ai_scans"
        ? { kind, scanCredits: Number(scanCredits) }
        : { kind, plan, durationDays: Number(durationDays) };
    try {
      const response = await fetch("/api/admin/promotions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name,
          benefit,
          startsAt: new Date(`${startsAt}T00:00:00.000Z`).toISOString(),
          expiresAt: new Date(`${expiresAt}T23:59:59.999Z`).toISOString(),
          maxRedemptions: Number(maxRedemptions),
        }),
      });
      const body = (await response.json()) as { code?: string; error?: string };
      if (!response.ok || !body.code) {
        throw new Error(body.error ?? "No se pudo crear la promoción.");
      }
      setCreatedCode(body.code);
      setName("");
      setNotice("Promoción creada y activa.");
      await load();
    } catch (createError) {
      setError(createError instanceof Error ? createError.message : "No se pudo crear la promoción.");
    } finally {
      setBusy(null);
    }
  }, [durationDays, expiresAt, kind, load, maxRedemptions, name, plan, scanCredits, startsAt]);

  const changeStatus = useCallback(
    async (campaign: PromoCampaignSummary) => {
      const nextStatus = campaign.status === "active" ? "paused" : "active";
      setBusy(campaign.id);
      setNotice(null);
      setError(null);
      const token = await accessToken();
      if (!token) {
        setError("Inicia sesión con una cuenta administradora.");
        setBusy(null);
        return;
      }
      try {
        const response = await fetch(`/api/admin/promotions/${campaign.id}`, {
          method: "PATCH",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ status: nextStatus }),
        });
        const body = (await response.json()) as { error?: string };
        if (!response.ok) throw new Error(body.error ?? "No se pudo cambiar la promoción.");
        setNotice(nextStatus === "active" ? "Promoción reactivada." : "Promoción pausada.");
        await load();
      } catch (statusError) {
        setError(statusError instanceof Error ? statusError.message : "No se pudo cambiar la promoción.");
      } finally {
        setBusy(null);
      }
    },
    [load],
  );

  return (
    <section className="mt-6 space-y-4" aria-labelledby="admin-promotions-title">
      <Card className="space-y-5">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
          <div className="flex items-start gap-3">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-emerald-100 text-emerald-700">
              <TicketPercent className="h-5 w-5" aria-hidden="true" />
            </span>
            <div>
              <h2 id="admin-promotions-title" className="text-xl font-bold text-slate-900">Promociones</h2>
              <p className="mt-1 max-w-3xl text-sm text-slate-600">
                Crea códigos con caducidad y límite de usos. Los accesos Pro no sustituyen suscripciones pagadas y los módulos futuros solo se activarán desde un registro controlado.
              </p>
            </div>
          </div>
          <Button type="button" variant="secondary" onClick={() => void load()} disabled={loading}>
            <RefreshCw className="h-4 w-4" /> Actualizar
          </Button>
        </div>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <label className="space-y-1.5 xl:col-span-2">
            <span className="text-sm font-bold text-slate-700">Nombre interno</span>
            <input value={name} onChange={(event) => setName(event.target.value)} placeholder="Ej. Bienvenida julio" className="w-full rounded-xl border border-slate-200 px-4 py-3" />
          </label>
          <label className="space-y-1.5">
            <span className="text-sm font-bold text-slate-700">Ventaja</span>
            <select value={kind} onChange={(event) => setKind(event.target.value as typeof kind)} className="w-full rounded-xl border border-slate-200 px-4 py-3">
              <option value="plan_access">Acceso a un plan</option>
              <option value="ai_scans">Pack de escaneos IA</option>
            </select>
          </label>
          {kind === "plan_access" ? (
            <label className="space-y-1.5">
              <span className="text-sm font-bold text-slate-700">Plan</span>
              <select value={plan} onChange={(event) => setPlan(event.target.value as typeof plan)} className="w-full rounded-xl border border-slate-200 px-4 py-3">
                <option value="pro">Pro</option>
                <option value="pro_plus">Pro+ IA</option>
              </select>
            </label>
          ) : (
            <label className="space-y-1.5">
              <span className="text-sm font-bold text-slate-700">Escaneos IA</span>
              <input type="number" min={1} max={10000} value={scanCredits} onChange={(event) => setScanCredits(Number(event.target.value))} className="w-full rounded-xl border border-slate-200 px-4 py-3" />
            </label>
          )}
          {kind === "plan_access" && (
            <label className="space-y-1.5">
              <span className="text-sm font-bold text-slate-700">Días de acceso</span>
              <input type="number" min={1} max={365} value={durationDays} onChange={(event) => setDurationDays(Number(event.target.value))} className="w-full rounded-xl border border-slate-200 px-4 py-3" />
            </label>
          )}
          <label className="space-y-1.5">
            <span className="text-sm font-bold text-slate-700">Comienza</span>
            <input type="date" value={startsAt} onChange={(event) => setStartsAt(event.target.value)} className="w-full rounded-xl border border-slate-200 px-4 py-3" />
          </label>
          <label className="space-y-1.5">
            <span className="text-sm font-bold text-slate-700">Caduca</span>
            <input type="date" value={expiresAt} onChange={(event) => setExpiresAt(event.target.value)} className="w-full rounded-xl border border-slate-200 px-4 py-3" />
          </label>
          <label className="space-y-1.5">
            <span className="text-sm font-bold text-slate-700">Usos máximos</span>
            <input type="number" min={1} max={100000} value={maxRedemptions} onChange={(event) => setMaxRedemptions(Number(event.target.value))} className="w-full rounded-xl border border-slate-200 px-4 py-3" />
          </label>
        </div>
        <Button type="button" onClick={() => void createCampaign()} disabled={busy !== null || !name.trim()}>
          <Gift className="h-4 w-4" /> {busy === "create" ? "Creando..." : "Generar código"}
        </Button>
      </Card>

      {createdCode && (
        <Card className="border-emerald-300 bg-emerald-50">
          <p className="font-bold text-emerald-950">Código creado. Se muestra completo una sola vez.</p>
          <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-center">
            <code className="min-w-0 flex-1 break-all rounded-xl bg-white px-4 py-3 text-sm font-bold text-slate-900">{createdCode}</code>
            <Button type="button" variant="secondary" onClick={() => void navigator.clipboard.writeText(createdCode)}>
              <Clipboard className="h-4 w-4" /> Copiar
            </Button>
          </div>
        </Card>
      )}
      {notice && <p className="text-sm font-semibold text-emerald-700">{notice}</p>}
      {error && <p className="text-sm font-semibold text-red-700">{error}</p>}

      {loading ? (
        <Card>Cargando promociones...</Card>
      ) : campaigns.length === 0 ? (
        <Card className="text-slate-600">Todavía no hay promociones.</Card>
      ) : (
        <div className="grid gap-3 lg:grid-cols-2">
          {campaigns.map((campaign) => (
            <Card key={campaign.id} className="space-y-3">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h3 className="font-bold text-slate-900">{campaign.name}</h3>
                  <p className="mt-1 font-mono text-sm text-slate-500">{campaign.codeMasked}</p>
                </div>
                <span className={`rounded-full px-3 py-1 text-xs font-bold ${campaign.status === "active" ? "bg-emerald-100 text-emerald-800" : "bg-slate-100 text-slate-600"}`}>
                  {campaign.status === "active" ? "Activa" : "Pausada"}
                </span>
              </div>
              <p className="text-sm font-semibold text-slate-700">{benefitLabel(campaign.benefit)}</p>
              <p className="text-sm text-slate-500">
                {campaign.redeemedCount} de {campaign.maxRedemptions} usos · {formatDate(campaign.startsAt)} a {formatDate(campaign.expiresAt)}
              </p>
              <Button type="button" variant="secondary" onClick={() => void changeStatus(campaign)} disabled={busy !== null}>
                {campaign.status === "active" ? <PauseCircle className="h-4 w-4" /> : <PlayCircle className="h-4 w-4" />}
                {campaign.status === "active" ? "Pausar" : "Reactivar"}
              </Button>
            </Card>
          ))}
        </div>
      )}
    </section>
  );
}
