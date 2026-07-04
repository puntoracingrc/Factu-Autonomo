"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Ban,
  Brain,
  Cloud,
  CreditCard,
  FileText,
  Import,
  RefreshCw,
  Siren,
  ShieldCheck,
  UserCog,
} from "lucide-react";
import { useSearchParams } from "next/navigation";
import { ExpenseScanCard } from "@/components/expenses/ExpenseScanCard";
import { useCloudSync } from "@/context/CloudSyncContext";
import type { ExpenseScanPayload } from "@/lib/expense-scan/schema";
import {
  ADMIN_PLAN_OPTIONS,
  ADMIN_STATUS_OPTIONS,
  aiUnitsToScanCredits,
  coerceNonNegativeInteger,
  dateOnlyFromIso,
  type AdminUserRow,
} from "@/lib/admin/users";
import {
  AI_UNITS_PER_SCAN,
} from "@/lib/billing/scan-limits";
import { PLANS } from "@/lib/billing/plans";
import { getSupabaseClientAsync } from "@/lib/supabase/client";
import { Button, ButtonLink } from "@/components/ui/Button";
import { Card, PageHeader } from "@/components/ui/Card";

type AdminSection =
  | "usuarios"
  | "errores"
  | "pagos"
  | "ia"
  | "aprendizaje"
  | "importaciones"
  | "verifactu"
  | "sistema";

interface AdminCapabilitiesResponse {
  fullAdmin?: boolean;
  aiLearning?: boolean;
  learningLabel?: string;
  error?: string;
}

interface AdminUsersResponse {
  users?: AdminUserRow[];
  page?: number;
  perPage?: number;
  total?: number;
  error?: string;
}

interface AdminErrorRow {
  id: string;
  user_id: string | null;
  severity: "info" | "warning" | "error";
  area: string;
  code: string | null;
  message: string;
  route: string | null;
  created_at: string;
  resolved_at: string | null;
}

interface AdminErrorsResponse {
  errors?: AdminErrorRow[];
  error?: string;
  message?: string;
  monitoringAvailable?: boolean;
}

const ADMIN_MENU: Array<{
  id: AdminSection;
  label: string;
  description: string;
  status: "activo" | "fase";
  Icon: typeof UserCog;
}> = [
  {
    id: "usuarios",
    label: "Usuarios",
    description: "Suscripciones manuales, antigüedad, pagos y baneo.",
    status: "activo",
    Icon: UserCog,
  },
  {
    id: "errores",
    label: "Errores y salud",
    description: "Fallos recientes por usuario, sincronización y navegador.",
    status: "activo",
    Icon: Siren,
  },
  {
    id: "pagos",
    label: "Pagos",
    description: "Stripe, recibos y revisiones pendientes.",
    status: "fase",
    Icon: CreditCard,
  },
  {
    id: "ia",
    label: "IA y escaneos",
    description: "Consumos, créditos y errores de extracción.",
    status: "fase",
    Icon: Brain,
  },
  {
    id: "aprendizaje",
    label: "Aprendizaje IA",
    description: "Corregir lecturas y guardar aprendizaje limpio.",
    status: "activo",
    Icon: Brain,
  },
  {
    id: "importaciones",
    label: "Importaciones",
    description: "Lotes, plataformas y avisos no soportados.",
    status: "fase",
    Icon: Import,
  },
  {
    id: "verifactu",
    label: "VeriFactu",
    description: "Modo test, certificados y estado operativo.",
    status: "fase",
    Icon: FileText,
  },
  {
    id: "sistema",
    label: "Sistema",
    description: "Salud de nube, Drive, backups y avisos.",
    status: "fase",
    Icon: Cloud,
  },
];

function formatDate(value: string | null) {
  if (!value) return "Sin fecha";
  return new Intl.DateTimeFormat("es-ES", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(new Date(value));
}

function formatMoney(cents: number) {
  return (cents / 100).toLocaleString("es-ES", {
    style: "currency",
    currency: "EUR",
  });
}

function severityClasses(severity: AdminErrorRow["severity"]) {
  if (severity === "warning") return "bg-amber-100 text-amber-800";
  if (severity === "info") return "bg-blue-100 text-blue-800";
  return "bg-red-100 text-red-800";
}

async function getAccessToken() {
  const supabase = await getSupabaseClientAsync();
  if (!supabase) return null;
  const { data } = await supabase.auth.getSession();
  return data.session?.access_token ?? null;
}

async function readAdminPatchResponse(response: Response) {
  try {
    return (await response.json()) as { error?: string; monthKey?: string };
  } catch {
    return {};
  }
}

function menuStatusLabel(status: "activo" | "fase") {
  return status === "activo" ? "Disponible" : "Siguiente fase";
}

function AdminMenu({
  current,
  onSelect,
  sections,
}: {
  current: AdminSection;
  onSelect: (section: AdminSection) => void;
  sections: AdminSection[];
}) {
  const visibleMenu = ADMIN_MENU.filter((entry) => sections.includes(entry.id));

  return (
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
      {visibleMenu.map(({ id, label, description, status, Icon }) => {
        const selected = current === id;
        return (
          <button
            key={id}
            type="button"
            onClick={() => onSelect(id)}
            className={`rounded-2xl border p-4 text-left shadow-sm transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-500 ${
              selected
                ? "border-blue-300 bg-blue-50"
                : "border-slate-200 bg-white hover:border-blue-200 hover:bg-blue-50/60"
            }`}
          >
            <div className="flex items-start gap-3">
              <span
                className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl ${
                  selected ? "bg-blue-600 text-white" : "bg-slate-100 text-slate-700"
                }`}
              >
                <Icon className="h-5 w-5" />
              </span>
              <span>
                <span className="block text-lg font-bold text-slate-900">
                  {label}
                </span>
                <span className="mt-1 block text-sm text-slate-600">
                  {description}
                </span>
                <span className="mt-3 inline-flex rounded-full bg-white px-2.5 py-1 text-xs font-bold text-slate-600">
                  {menuStatusLabel(status)}
                </span>
              </span>
            </div>
          </button>
        );
      })}
    </div>
  );
}

function FutureSection({ section }: { section: AdminSection }) {
  const item = ADMIN_MENU.find((entry) => entry.id === section);
  if (!item) return null;
  return (
    <Card className="mt-6 space-y-3">
      <div className="flex items-center gap-3">
        <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-slate-100 text-slate-700">
          <item.Icon className="h-5 w-5" />
        </span>
        <div>
          <h2 className="text-xl font-bold text-slate-900">{item.label}</h2>
          <p className="text-sm text-slate-600">{item.description}</p>
        </div>
      </div>
      <p className="text-sm text-slate-600">
        Lo dejo como zona reservada para crecer por fases. La primera fase
        operativa es Usuarios, porque ahí están las acciones delicadas de
        suscripción y acceso.
      </p>
    </Card>
  );
}

function UserAdminCard({
  user,
  onChanged,
}: {
  user: AdminUserRow;
  onChanged: () => Promise<void>;
}) {
  const [plan, setPlan] = useState(user.subscription.plan);
  const [status, setStatus] = useState(user.subscription.status);
  const [trialEndsAt, setTrialEndsAt] = useState(
    dateOnlyFromIso(user.subscription.trialEndsAt),
  );
  const [currentPeriodEnd, setCurrentPeriodEnd] = useState(
    dateOnlyFromIso(user.subscription.currentPeriodEnd),
  );
  const [aiCreditUnits, setAiCreditUnits] = useState(user.subscription.aiCreditUnits);
  const [scanTrialRemaining, setScanTrialRemaining] = useState(
    user.subscription.scanTrialRemaining,
  );
  const [banReason, setBanReason] = useState(user.ban.reason ?? "");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const normalizedAiCreditUnits = coerceNonNegativeInteger(aiCreditUnits);
  const aiScanEquivalent = aiUnitsToScanCredits(normalizedAiCreditUnits);
  const monthlyUsage = user.aiUsage;
  const monthlyPercent = monthlyUsage.percentRemaining;

  useEffect(() => {
    setPlan(user.subscription.plan);
    setStatus(user.subscription.status);
    setTrialEndsAt(dateOnlyFromIso(user.subscription.trialEndsAt));
    setCurrentPeriodEnd(dateOnlyFromIso(user.subscription.currentPeriodEnd));
    setAiCreditUnits(user.subscription.aiCreditUnits);
    setScanTrialRemaining(user.subscription.scanTrialRemaining);
    setBanReason(user.ban.reason ?? "");
  }, [
    user.ban.reason,
    user.subscription.aiCreditUnits,
    user.subscription.currentPeriodEnd,
    user.subscription.plan,
    user.subscription.scanTrialRemaining,
    user.subscription.status,
    user.subscription.trialEndsAt,
  ]);

  const saveSubscription = async () => {
    setBusy(true);
    setMessage(null);
    const token = await getAccessToken();
    if (!token) {
      setMessage("Sesión no disponible.");
      setBusy(false);
      return;
    }

    const response = await fetch(`/api/admin/users/${encodeURIComponent(user.id)}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        action: "subscription",
        plan,
        status,
        trialEndsAt,
        currentPeriodEnd,
        scanCredits: aiScanEquivalent,
        aiCreditUnits: normalizedAiCreditUnits,
        scanTrialRemaining: coerceNonNegativeInteger(scanTrialRemaining),
      }),
    });
    const body = await readAdminPatchResponse(response);
    if (!response.ok) {
      setMessage(body.error ?? "No se pudo guardar.");
    } else {
      setMessage("Suscripción actualizada.");
      await onChanged();
    }
    setBusy(false);
  };

  const resetAiUsage = async () => {
    setBusy(true);
    setMessage(null);
    const token = await getAccessToken();
    if (!token) {
      setMessage("Sesión no disponible.");
      setBusy(false);
      return;
    }

    const response = await fetch(`/api/admin/users/${encodeURIComponent(user.id)}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ action: "reset_ai_usage" }),
    });
    const body = await readAdminPatchResponse(response);
    if (!response.ok) {
      setMessage(body.error ?? "No se pudo rellenar el uso IA.");
    } else {
      setMessage("IA mensual rellenada al 100%.");
      await onChanged();
    }
    setBusy(false);
  };

  const toggleBan = async () => {
    setBusy(true);
    setMessage(null);
    const token = await getAccessToken();
    if (!token) {
      setMessage("Sesión no disponible.");
      setBusy(false);
      return;
    }

    const nextBanned = !user.ban.banned;
    const response = await fetch(`/api/admin/users/${encodeURIComponent(user.id)}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        action: "ban",
        banned: nextBanned,
        banReason,
      }),
    });
    const body = await readAdminPatchResponse(response);
    if (!response.ok) {
      setMessage(body.error ?? "No se pudo actualizar el acceso.");
    } else {
      setMessage(nextBanned ? "Usuario baneado." : "Usuario reactivado.");
      await onChanged();
    }
    setBusy(false);
  };

  return (
    <Card className="space-y-4">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-lg font-bold text-slate-900">{user.email}</h3>
            {user.ban.banned && (
              <span className="rounded-full bg-red-100 px-2.5 py-1 text-xs font-bold text-red-700">
                Baneado
              </span>
            )}
            <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-bold text-slate-600">
              {user.provider}
            </span>
          </div>
          <p className="mt-1 text-sm text-slate-600">
            Alta: {formatDate(user.createdAt)}
            {user.ageDays !== null ? ` · ${user.ageDays} días de antigüedad` : ""}
          </p>
          <p className="text-sm text-slate-600">
            Último acceso: {formatDate(user.lastSignInAt)}
          </p>
        </div>
        <div className="rounded-2xl bg-slate-50 px-4 py-3 text-sm text-slate-700">
          <p className="font-bold text-slate-900">Pagos registrados</p>
          <p>{user.payments.count} pago(s) · {formatMoney(user.payments.totalCents)}</p>
          <p>Último: {formatDate(user.payments.latestPaidAt)}</p>
        </div>
      </div>

      {user.errors.count > 0 && (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          <p className="font-bold">
            {user.errors.count} error(es) registrados
          </p>
          <p>
            Último: {formatDate(user.errors.latestAt)} · {user.errors.latestArea}
          </p>
          <p className="mt-1">{user.errors.latestMessage}</p>
        </div>
      )}

      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <label className="space-y-1 text-sm font-bold text-slate-700">
          Plan
          <select
            value={plan}
            onChange={(event) => setPlan(event.target.value as typeof plan)}
            className="min-h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-base font-semibold text-slate-900"
          >
            {ADMIN_PLAN_OPTIONS.map((option) => (
              <option key={option} value={option}>
                {PLANS[option].name}
              </option>
            ))}
          </select>
        </label>
        <label className="space-y-1 text-sm font-bold text-slate-700">
          Estado
          <select
            value={status}
            onChange={(event) => setStatus(event.target.value as typeof status)}
            className="min-h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-base font-semibold text-slate-900"
          >
            {ADMIN_STATUS_OPTIONS.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </label>
        <label className="space-y-1 text-sm font-bold text-slate-700">
          Fin prueba
          <input
            type="date"
            value={trialEndsAt}
            onChange={(event) => setTrialEndsAt(event.target.value)}
            className="min-h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-base font-semibold text-slate-900"
          />
        </label>
        <label className="space-y-1 text-sm font-bold text-slate-700">
          Fin periodo
          <input
            type="date"
            value={currentPeriodEnd}
            onChange={(event) => setCurrentPeriodEnd(event.target.value)}
            className="min-h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-base font-semibold text-slate-900"
          />
        </label>
      </div>

      <div className="grid gap-3 md:grid-cols-3">
        <label className="space-y-1 text-sm font-bold text-slate-700">
          Escaneos prueba
          <input
            type="number"
            min="0"
            value={scanTrialRemaining}
            onChange={(event) =>
              setScanTrialRemaining(coerceNonNegativeInteger(event.target.value))
            }
            className="min-h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-base font-semibold text-slate-900"
          />
        </label>
        <label className="space-y-1 text-sm font-bold text-slate-700">
          Créditos IA extra
          <input
            type="number"
            min="0"
            value={aiCreditUnits}
            onChange={(event) =>
              setAiCreditUnits(coerceNonNegativeInteger(event.target.value))
            }
            className="min-h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-base font-semibold text-slate-900"
          />
          <span className="block text-xs font-semibold text-slate-500">
            {AI_UNITS_PER_SCAN} unidades = 1 escaneo extra.
          </span>
        </label>
        <div className="rounded-2xl bg-slate-50 px-4 py-3 text-sm text-slate-700">
          <p className="font-bold text-slate-500">Créditos extra</p>
          <p className="text-lg font-bold text-slate-900">
            {aiScanEquivalent} escaneo(s) extra
          </p>
          <p className="mt-1 text-xs font-semibold text-slate-500">
            {normalizedAiCreditUnits} unidades extra disponibles.
          </p>
        </div>
      </div>

      <div className="rounded-2xl border border-blue-100 bg-blue-50 p-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-sm font-bold uppercase tracking-wide text-blue-700">
              IA mensual
            </p>
            <p className="text-2xl font-black text-slate-900">
              {monthlyPercent}% disponible
            </p>
            <p className="mt-1 text-sm font-semibold text-slate-600">
              {monthlyUsage.monthlyRemainingUnits} de{" "}
              {monthlyUsage.monthlyIncludedUnits} unidades del mes.
            </p>
          </div>
          <div className="grid gap-2 text-sm font-semibold text-slate-700 sm:grid-cols-3 lg:min-w-[34rem]">
            <div className="rounded-2xl bg-white px-4 py-3">
              <span className="block text-xs uppercase text-slate-500">Usadas</span>
              <span className="text-lg font-bold text-slate-900">
                {monthlyUsage.monthlyUsedUnits}
              </span>
            </div>
            <div className="rounded-2xl bg-white px-4 py-3">
              <span className="block text-xs uppercase text-slate-500">Extra</span>
              <span className="text-lg font-bold text-slate-900">
                {monthlyUsage.extraUnits}
              </span>
            </div>
            <div className="rounded-2xl bg-white px-4 py-3">
              <span className="block text-xs uppercase text-slate-500">Total</span>
              <span className="text-lg font-bold text-slate-900">
                {monthlyUsage.totalRemainingUnits}
              </span>
            </div>
          </div>
        </div>
        <div className="mt-4 h-3 overflow-hidden rounded-full bg-white">
          <div
            className="h-full rounded-full bg-blue-600 transition-all"
            style={{ width: `${monthlyPercent}%` }}
          />
        </div>
        <p className="mt-2 text-xs font-semibold text-slate-500">
          Mes: {monthlyUsage.monthKey}. Rellenar IA 100% reinicia el consumo mensual,
          no los créditos extra.
        </p>
      </div>

      <div className="grid gap-3 lg:grid-cols-[1fr_auto_auto_auto] lg:items-end">
        <label className="space-y-1 text-sm font-bold text-slate-700">
          Motivo de baneo
          <input
            value={banReason}
            onChange={(event) => setBanReason(event.target.value)}
            placeholder="Ej: abuso, fraude, soporte..."
            className="min-h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-base font-semibold text-slate-900"
          />
        </label>
        <Button type="button" onClick={saveSubscription} disabled={busy}>
          Guardar suscripción
        </Button>
        <Button type="button" variant="secondary" onClick={resetAiUsage} disabled={busy}>
          <RefreshCw className="h-4 w-4" />
          Rellenar IA mensual 100%
        </Button>
        <Button
          type="button"
          variant={user.ban.banned ? "secondary" : "danger"}
          onClick={toggleBan}
          disabled={busy}
        >
          <Ban className="h-4 w-4" />
          {user.ban.banned ? "Quitar baneo" : "Banear"}
        </Button>
      </div>

      {message && <p className="text-sm font-semibold text-slate-600">{message}</p>}
    </Card>
  );
}

function ErrorsPanel() {
  const [errors, setErrors] = useState<AdminErrorRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const loadErrors = useCallback(async () => {
    setLoading(true);
    setError(null);
    setNotice(null);
    const token = await getAccessToken();
    if (!token) {
      setError("Inicia sesión con una cuenta administradora.");
      setLoading(false);
      return;
    }

    const response = await fetch("/api/admin/errors?limit=80", {
      headers: { Authorization: `Bearer ${token}` },
    });
    const body = (await response.json()) as AdminErrorsResponse;
    if (!response.ok) {
      setError(body.error ?? "No se pudieron cargar errores.");
      setLoading(false);
      return;
    }
    setErrors(body.errors ?? []);
    setNotice(body.monitoringAvailable === false ? body.message ?? null : null);
    setLoading(false);
  }, []);

  useEffect(() => {
    void loadErrors();
  }, [loadErrors]);

  const syncErrors = errors.filter((item) => item.area === "sync").length;
  const browserErrors = errors.filter((item) => item.area === "browser").length;

  return (
    <section className="mt-6 space-y-4">
      <Card className="space-y-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h2 className="text-xl font-bold text-slate-900">Errores y salud</h2>
            <p className="text-sm text-slate-600">
              Registro técnico seguro para detectar cuentas con problemas sin ver
              documentos ni secretos.
            </p>
          </div>
          <Button type="button" variant="secondary" onClick={loadErrors} disabled={loading}>
            <RefreshCw className="h-4 w-4" />
            Actualizar
          </Button>
        </div>
        <div className="grid gap-3 md:grid-cols-3">
          <div className="rounded-2xl bg-slate-50 p-4">
            <p className="text-sm font-bold text-slate-500">Últimos eventos</p>
            <p className="text-2xl font-bold text-slate-900">{errors.length}</p>
          </div>
          <div className="rounded-2xl bg-slate-50 p-4">
            <p className="text-sm font-bold text-slate-500">Sincronización</p>
            <p className="text-2xl font-bold text-slate-900">{syncErrors}</p>
          </div>
          <div className="rounded-2xl bg-slate-50 p-4">
            <p className="text-sm font-bold text-slate-500">Navegador</p>
            <p className="text-2xl font-bold text-slate-900">{browserErrors}</p>
          </div>
        </div>
      </Card>

      {loading && <Card>Cargando errores...</Card>}
      {error && (
        <Card className="border-amber-200 bg-amber-50 text-amber-900">
          {error}
        </Card>
      )}
      {!loading && !error && notice && (
        <Card className="border-blue-100 bg-blue-50 text-blue-900">
          {notice}
        </Card>
      )}
      {!loading && !error && errors.length === 0 && (
        <Card className="text-slate-600">Sin errores registrados.</Card>
      )}
      {!loading &&
        !error &&
        errors.map((item) => (
          <Card key={item.id} className="space-y-2">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <span
                    className={`rounded-full px-2.5 py-1 text-xs font-bold ${severityClasses(item.severity)}`}
                  >
                    {item.severity}
                  </span>
                  <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-bold text-slate-600">
                    {item.area}
                  </span>
                  {item.code && (
                    <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-bold text-slate-600">
                      {item.code}
                    </span>
                  )}
                </div>
                <p className="mt-2 font-bold text-slate-900">{item.message}</p>
                <p className="text-sm text-slate-600">
                  Usuario: {item.user_id ?? "sin usuario"} · {formatDate(item.created_at)}
                </p>
                {item.route && (
                  <p className="break-all text-sm text-slate-500">{item.route}</p>
                )}
              </div>
            </div>
          </Card>
        ))}
    </section>
  );
}

function UsersPanel() {
  const [users, setUsers] = useState<AdminUserRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");

  const loadUsers = useCallback(async () => {
    setLoading(true);
    setError(null);
    const token = await getAccessToken();
    if (!token) {
      setError("Inicia sesión con una cuenta administradora.");
      setLoading(false);
      return;
    }

    const response = await fetch("/api/admin/users?perPage=100", {
      headers: { Authorization: `Bearer ${token}` },
    });
    const body = (await response.json()) as AdminUsersResponse;
    if (!response.ok) {
      setError(body.error ?? "No se pudieron cargar usuarios.");
      setLoading(false);
      return;
    }
    setUsers(body.users ?? []);
    setLoading(false);
  }, []);

  useEffect(() => {
    void loadUsers();
  }, [loadUsers]);

  const filtered = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    if (!normalized) return users;
    return users.filter((user) =>
      [user.email, user.subscription.plan, user.subscription.status, user.provider]
        .join(" ")
        .toLowerCase()
        .includes(normalized),
    );
  }, [query, users]);

  return (
    <section className="mt-6 space-y-4">
      <Card className="space-y-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h2 className="text-xl font-bold text-slate-900">Usuarios</h2>
            <p className="text-sm text-slate-600">
              Gestiona planes manuales, créditos IA, pagos registrados y acceso.
            </p>
          </div>
          <Button type="button" variant="secondary" onClick={loadUsers} disabled={loading}>
            <RefreshCw className="h-4 w-4" />
            Actualizar
          </Button>
        </div>
        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Buscar por email, plan o estado..."
          className="min-h-12 w-full rounded-2xl border border-slate-200 bg-white px-4 text-base text-slate-900"
        />
        <p className="text-sm text-slate-500">
          Mostrando {filtered.length} de {users.length} usuario(s).
        </p>
      </Card>

      {loading && <Card>Cargando usuarios...</Card>}
      {error && (
        <Card className="border-amber-200 bg-amber-50 text-amber-900">
          {error}
        </Card>
      )}
      {!loading &&
        !error &&
        filtered.map((user) => (
          <UserAdminCard key={user.id} user={user} onChanged={loadUsers} />
        ))}
    </section>
  );
}

function scanSummary(payload: ExpenseScanPayload | null) {
  if (!payload) return [];
  return [
    ["Proveedor", payload.supplier.name],
    ["Tipo", payload.expense.businessKind ?? "Compra"],
    ["Descripción", payload.expense.description],
    ["Base", payload.expense.amount.toLocaleString("es-ES")],
    ["IVA", `${payload.expense.ivaPercent}%`],
    ["Líneas", String(payload.expense.purchaseLines?.length ?? 0)],
  ];
}

function ScanPayloadSummary({
  title,
  payload,
}: {
  title: string;
  payload: ExpenseScanPayload | null;
}) {
  return (
    <div className="rounded-2xl border border-slate-100 bg-white p-4">
      <h3 className="text-sm font-black uppercase tracking-wide text-slate-500">
        {title}
      </h3>
      {payload ? (
        <dl className="mt-3 grid gap-2 text-sm sm:grid-cols-2">
          {scanSummary(payload).map(([label, value]) => (
            <div key={label} className="rounded-xl bg-slate-50 px-3 py-2">
              <dt className="text-xs font-bold text-slate-500">{label}</dt>
              <dd className="break-words font-semibold text-slate-900">
                {value}
              </dd>
            </div>
          ))}
        </dl>
      ) : (
        <p className="mt-3 text-sm font-semibold text-slate-500">
          Todavía no hay lectura.
        </p>
      )}
    </div>
  );
}

function AiLearningPanel() {
  const [original, setOriginal] = useState<ExpenseScanPayload | null>(null);
  const [corrected, setCorrected] = useState<ExpenseScanPayload | null>(null);
  const [instruction, setInstruction] = useState("");
  const [busy, setBusy] = useState<"idle" | "correct" | "save">("idle");
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleScanned = useCallback((payload: ExpenseScanPayload) => {
    setOriginal(payload);
    setCorrected(payload);
    setInstruction("");
    setMessage("Lectura cargada. Escribe qué está mal para corregirla.");
    setError(null);
  }, []);

  const correctWithAi = async () => {
    if (!original || !instruction.trim()) return;
    setBusy("correct");
    setMessage(null);
    setError(null);
    const token = await getAccessToken();
    if (!token) {
      setError("Sesión no disponible.");
      setBusy("idle");
      return;
    }

    const response = await fetch("/api/admin/ai-learning/correct", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ original, instruction }),
    });
    const body = (await response.json().catch(() => ({}))) as {
      data?: ExpenseScanPayload;
      error?: string;
    };
    if (!response.ok || !body.data) {
      setError(body.error ?? "No se pudo corregir la lectura.");
    } else {
      setCorrected(body.data);
      setMessage("Corrección aplicada. Revisa el resumen y guarda aprendizaje.");
    }
    setBusy("idle");
  };

  const saveLearning = async () => {
    if (!original || !corrected) return;
    setBusy("save");
    setMessage(null);
    setError(null);
    const token = await getAccessToken();
    if (!token) {
      setError("Sesión no disponible.");
      setBusy("idle");
      return;
    }

    const response = await fetch("/api/admin/ai-learning/feedback", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ original, corrected }),
    });
    const body = (await response.json().catch(() => ({}))) as {
      saved?: boolean;
      error?: string;
    };
    if (!response.ok) {
      setError(body.error ?? "No se pudo guardar el aprendizaje.");
    } else if (!body.saved) {
      setMessage(
        "Corrección preparada, pero la tabla de aprendizaje aún no está activa.",
      );
    } else {
      setMessage("Aprendizaje limpio guardado.");
    }
    setBusy("idle");
  };

  return (
    <section className="mt-6 space-y-4">
      <Card className="space-y-3">
        <h2 className="text-xl font-bold text-slate-900">Aprendizaje IA</h2>
        <p className="text-sm text-slate-600">
          Escanea una factura de prueba, explica la corrección y guarda solo el
          patrón estructural. No se almacenan PDF, nombres, NIF, direcciones ni
          importes exactos en la tabla de aprendizaje.
        </p>
      </Card>

      <ExpenseScanCard onScanned={handleScanned} />

      <Card className="space-y-4">
        <label className="block space-y-1.5">
          <span className="text-sm font-bold text-slate-700">
            Qué está mal
          </span>
          <textarea
            value={instruction}
            onChange={(event) => setInstruction(event.target.value)}
            placeholder="Ej: La unidad de las líneas es m2, no ud. El total de m2 está en la columna TOTAL M2."
            className="min-h-28 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-base text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
          />
        </label>
        <div className="flex flex-col gap-2 sm:flex-row">
          <Button
            type="button"
            variant="secondary"
            onClick={correctWithAi}
            disabled={!original || !instruction.trim() || busy !== "idle"}
          >
            {busy === "correct" ? "Corrigiendo..." : "Corregir con IA"}
          </Button>
          <Button
            type="button"
            onClick={saveLearning}
            disabled={!original || !corrected || busy !== "idle"}
          >
            {busy === "save" ? "Guardando..." : "Guardar aprendizaje limpio"}
          </Button>
        </div>
        {message && <p className="text-sm font-semibold text-green-700">{message}</p>}
        {error && <p className="text-sm font-semibold text-red-600">{error}</p>}
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        <ScanPayloadSummary title="Lectura original" payload={original} />
        <ScanPayloadSummary title="Lectura corregida" payload={corrected} />
      </div>
    </section>
  );
}

export default function AdminPage() {
  const { user, cloudEnabled } = useCloudSync();
  const searchParams = useSearchParams();
  const [section, setSection] = useState<AdminSection>("usuarios");
  const [capabilities, setCapabilities] =
    useState<AdminCapabilitiesResponse | null>(null);
  const [capabilitiesLoading, setCapabilitiesLoading] = useState(false);

  const availableSections = useMemo<AdminSection[]>(() => {
    if (!capabilities) return [];
    if (capabilities.fullAdmin) return ADMIN_MENU.map((entry) => entry.id);
    if (capabilities.aiLearning) return ["aprendizaje"];
    return [];
  }, [capabilities]);

  useEffect(() => {
    if (!user) {
      setCapabilities(null);
      return;
    }
    let cancelled = false;
    const loadCapabilities = async () => {
      setCapabilitiesLoading(true);
      const token = await getAccessToken();
      if (!token) {
        if (!cancelled) {
          setCapabilities(null);
          setCapabilitiesLoading(false);
        }
        return;
      }
      const response = await fetch("/api/admin/capabilities", {
        headers: { Authorization: `Bearer ${token}` },
      });
      const body = (await response.json().catch(() => ({}))) as
        AdminCapabilitiesResponse;
      if (!cancelled) {
        setCapabilities(response.ok ? body : { fullAdmin: false, aiLearning: false });
        setCapabilitiesLoading(false);
      }
    };
    void loadCapabilities();
    return () => {
      cancelled = true;
    };
  }, [user]);

  useEffect(() => {
    if (availableSections.length === 0) return;
    const requested = searchParams.get("seccion") as AdminSection | null;
    if (requested && availableSections.includes(requested)) {
      setSection(requested);
      return;
    }
    if (!availableSections.includes(section)) {
      setSection(availableSections[0]);
    }
  }, [availableSections, searchParams, section]);

  return (
    <div>
      <PageHeader
        title="Admin"
        subtitle="Gestión interna de Factura Autónomo. Solo para cuentas autorizadas."
        action={
          <span className="inline-flex items-center gap-2 rounded-full bg-slate-900 px-4 py-2 text-sm font-bold text-white">
            <ShieldCheck className="h-4 w-4" />
            Panel interno
          </span>
        }
      />

      {!cloudEnabled && (
        <Card className="mb-5 border-amber-200 bg-amber-50 text-amber-900">
          La nube está desactivada en este entorno. El admin necesita sesión.
        </Card>
      )}

      {!user && (
        <Card className="mb-5 space-y-3">
          <h2 className="text-lg font-bold text-slate-900">
            Inicia sesión para entrar
          </h2>
          <p className="text-sm text-slate-600">
            Usa tu cuenta administradora normal o Google con el mismo email.
          </p>
          <ButtonLink href="/cuenta#inicio-sesion">Ir a cuenta</ButtonLink>
        </Card>
      )}

      {user && capabilitiesLoading && (
        <Card className="mb-5 text-slate-600">Comprobando acceso...</Card>
      )}

      {user && !capabilitiesLoading && availableSections.length === 0 && (
        <Card className="mb-5 border-amber-200 bg-amber-50 text-amber-900">
          Esta cuenta no tiene acceso al panel interno.
        </Card>
      )}

      {availableSections.length > 0 && (
        <AdminMenu
          current={section}
          onSelect={setSection}
          sections={availableSections}
        />
      )}

      {capabilities?.fullAdmin && section === "usuarios" && <UsersPanel />}
      {capabilities?.fullAdmin && section === "errores" && <ErrorsPanel />}
      {capabilities?.aiLearning && section === "aprendizaje" && (
        <AiLearningPanel />
      )}
      {capabilities?.fullAdmin &&
        section !== "usuarios" &&
        section !== "errores" &&
        section !== "aprendizaje" && (
        <FutureSection section={section} />
      )}
    </div>
  );
}
