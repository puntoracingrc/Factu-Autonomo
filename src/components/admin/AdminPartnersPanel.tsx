"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import {
  BadgeEuro,
  Handshake,
  PauseCircle,
  PlayCircle,
  RefreshCw,
  UserPlus,
  Users,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import type { AdminPartnerRow } from "@/lib/partners/contracts";
import { getSupabaseClientAsync } from "@/lib/supabase/client";

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

export function AdminPartnersPanel() {
  const [partners, setPartners] = useState<AdminPartnerRow[]>([]);
  const [schemaReady, setSchemaReady] = useState<boolean | null>(null);
  const [email, setEmail] = useState("");
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
      const response = await fetch("/api/admin/partners", {
        headers: { Authorization: `Bearer ${token}` },
      });
      const body = (await response.json()) as {
        partners?: AdminPartnerRow[];
        schemaReady?: boolean;
        error?: string;
      };
      if (!response.ok) throw new Error(body.error ?? "No se pudieron cargar los partners.");
      setPartners(body.partners ?? []);
      setSchemaReady(body.schemaReady !== false);
    } catch (loadError) {
      setError(
        loadError instanceof Error
          ? loadError.message
          : "No se pudieron cargar los partners.",
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const grantAccess = useCallback(async () => {
    setBusy("grant");
    setNotice(null);
    setError(null);
    const token = await accessToken();
    if (!token) {
      setError("Inicia sesión con una cuenta administradora.");
      setBusy(null);
      return;
    }
    try {
      const response = await fetch("/api/admin/partners", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email }),
      });
      const body = (await response.json()) as { error?: string };
      if (!response.ok) throw new Error(body.error ?? "No se pudo conceder el acceso.");
      setEmail("");
      setNotice("Acceso Partner concedido. El usuario verá el Área Partners al iniciar sesión.");
      await load();
    } catch (grantError) {
      setError(
        grantError instanceof Error
          ? grantError.message
          : "No se pudo conceder el acceso.",
      );
    } finally {
      setBusy(null);
    }
  }, [email, load]);

  const changeStatus = useCallback(
    async (partner: AdminPartnerRow) => {
      const nextStatus = partner.status === "active" ? "paused" : "active";
      setBusy(partner.userId);
      setNotice(null);
      setError(null);
      const token = await accessToken();
      if (!token) {
        setError("Inicia sesión con una cuenta administradora.");
        setBusy(null);
        return;
      }
      try {
        const response = await fetch(`/api/admin/partners/${partner.userId}`, {
          method: "PATCH",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ status: nextStatus }),
        });
        const body = (await response.json()) as { error?: string };
        if (!response.ok) throw new Error(body.error ?? "No se pudo cambiar el acceso.");
        setNotice(
          nextStatus === "active"
            ? `Acceso reactivado para ${partner.email}.`
            : `Acceso pausado para ${partner.email}.`,
        );
        await load();
      } catch (statusError) {
        setError(
          statusError instanceof Error
            ? statusError.message
            : "No se pudo cambiar el acceso.",
        );
      } finally {
        setBusy(null);
      }
    },
    [load],
  );

  const totals = partners.reduce(
    (summary, partner) => ({
      registered: summary.registered + partner.registeredCount,
      paying: summary.paying + partner.payingCount,
      available: summary.available + partner.availableCents,
    }),
    { registered: 0, paying: 0, available: 0 },
  );

  return (
    <section className="mt-6 space-y-4" aria-labelledby="admin-partners-title">
      <Card className="space-y-5">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
          <div className="flex items-start gap-3">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-blue-600 text-white">
              <Handshake className="h-5 w-5" aria-hidden="true" />
            </span>
            <div>
              <h2 id="admin-partners-title" className="text-xl font-bold text-slate-900">
                Programa Partners
              </h2>
              <p className="mt-1 max-w-3xl text-sm text-slate-600">
                Concede acceso por email a gestorías o colaboradores. La comisión base es del 10% y el pago se prepara al alcanzar 60 €. Los abonos siguen siendo manuales.
              </p>
              <p className="mt-2 max-w-3xl text-sm font-medium text-blue-800">
                Primero el Partner crea su acceso independiente; después autoriza aquí ese mismo email.
              </p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link
              href="/partners"
              className="inline-flex min-h-11 items-center justify-center rounded-2xl border-2 border-blue-200 bg-white px-4 text-sm font-bold text-blue-700 hover:bg-blue-50"
            >
              Ver Área Partners
            </Link>
            <Link
              href="/partners/acceso?modo=crear#inicio-sesion"
              className="inline-flex min-h-11 items-center justify-center rounded-2xl border-2 border-slate-200 bg-white px-4 text-sm font-bold text-slate-700 hover:bg-slate-50"
            >
              Abrir registro Partner
            </Link>
            <Button type="button" variant="secondary" onClick={() => void load()} disabled={loading} className="min-h-11 px-4 text-sm">
              <RefreshCw className="h-4 w-4" />
              Actualizar
            </Button>
          </div>
        </div>

        <div className="grid gap-3 md:grid-cols-3">
          <div className="rounded-xl bg-slate-50 p-4">
            <p className="text-sm font-bold text-slate-500">Registrados</p>
            <p className="mt-1 text-2xl font-bold text-slate-900">{totals.registered}</p>
          </div>
          <div className="rounded-xl bg-emerald-50 p-4">
            <p className="text-sm font-bold text-emerald-700">Pagando ahora</p>
            <p className="mt-1 text-2xl font-bold text-emerald-900">{totals.paying}</p>
          </div>
          <div className="rounded-xl bg-blue-50 p-4">
            <p className="text-sm font-bold text-blue-700">Saldo disponible</p>
            <p className="mt-1 text-2xl font-bold text-blue-900">{formatMoney(totals.available)}</p>
          </div>
        </div>

        <form
          className="flex flex-col gap-3 sm:flex-row sm:items-end"
          onSubmit={(event) => {
            event.preventDefault();
            void grantAccess();
          }}
        >
          <label className="min-w-0 flex-1 space-y-1">
            <span className="text-sm font-bold text-slate-700">Email del usuario</span>
            <input
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="gestoria@ejemplo.es"
              autoComplete="email"
              required
              disabled={schemaReady === false}
              className="min-h-12 w-full rounded-2xl border border-slate-200 bg-white px-4 text-base outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            />
          </label>
          <Button
            type="submit"
            disabled={schemaReady !== true || busy !== null || !email.trim()}
          >
            <UserPlus className="h-4 w-4" />
            Dar acceso
          </Button>
        </form>

        {schemaReady === false && (
          <p role="status" className="rounded-xl bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-900">
            La estructura del programa está preparada. La activación de datos está pendiente; las altas se habilitarán al conectar su base de datos.
          </p>
        )}
        {notice && <p role="status" className="rounded-xl bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-800">{notice}</p>}
        {error && <p role="alert" className="rounded-xl bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">{error}</p>}
      </Card>

      {loading ? <Card>Cargando partners...</Card> : null}
      {!loading && partners.length === 0 ? (
        <Card className="text-slate-600">
          {schemaReady === false
            ? "No hay datos de Partners todavía."
            : "Todavía no has autorizado ningún partner."}
        </Card>
      ) : null}

      {!loading && partners.length > 0 ? (
        <div className="grid gap-3 xl:grid-cols-2">
          {partners.map((partner) => (
            <Card key={partner.userId} className="space-y-4">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="break-all font-bold text-slate-900">{partner.email}</p>
                    <span className={`rounded-full px-2.5 py-1 text-xs font-bold ${partner.status === "active" ? "bg-emerald-100 text-emerald-800" : "bg-slate-200 text-slate-700"}`}>
                      {partner.status === "active" ? "Activo" : "Pausado"}
                    </span>
                  </div>
                  <p className="mt-1 text-sm text-slate-500">
                    Cobro: {partner.payoutProfile.configured ? `${partner.payoutProfile.holderName} · ${partner.payoutProfile.ibanMasked}` : "pendiente de configurar"}
                  </p>
                </div>
                <Button
                  type="button"
                  variant="secondary"
                  disabled={busy !== null}
                  onClick={() => void changeStatus(partner)}
                  className="min-h-11 px-4 text-sm"
                >
                  {partner.status === "active" ? <PauseCircle className="h-4 w-4" /> : <PlayCircle className="h-4 w-4" />}
                  {partner.status === "active" ? "Pausar" : "Reactivar"}
                </Button>
              </div>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                <div>
                  <p className="flex items-center gap-1 text-xs font-bold uppercase text-slate-500"><Users className="h-3.5 w-3.5" /> Registros</p>
                  <p className="mt-1 text-lg font-bold">{partner.registeredCount}</p>
                </div>
                <div>
                  <p className="text-xs font-bold uppercase text-slate-500">Pagando</p>
                  <p className="mt-1 text-lg font-bold text-emerald-700">{partner.payingCount}</p>
                </div>
                <div>
                  <p className="flex items-center gap-1 text-xs font-bold uppercase text-slate-500"><BadgeEuro className="h-3.5 w-3.5" /> Disponible</p>
                  <p className="mt-1 text-lg font-bold text-blue-700">{formatMoney(partner.availableCents)}</p>
                </div>
                <div>
                  <p className="text-xs font-bold uppercase text-slate-500">Pagado</p>
                  <p className="mt-1 text-lg font-bold">{formatMoney(partner.paidCents)}</p>
                </div>
              </div>
            </Card>
          ))}
        </div>
      ) : null}
    </section>
  );
}
