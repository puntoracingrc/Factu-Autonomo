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
  ShieldCheck,
  UserCog,
} from "lucide-react";
import { useCloudSync } from "@/context/CloudSyncContext";
import { ADMIN_PLAN_OPTIONS, ADMIN_STATUS_OPTIONS, dateOnlyFromIso, type AdminUserRow } from "@/lib/admin/users";
import { getSupabaseClientAsync } from "@/lib/supabase/client";
import { Button, ButtonLink } from "@/components/ui/Button";
import { Card, PageHeader } from "@/components/ui/Card";

type AdminSection = "usuarios" | "pagos" | "ia" | "importaciones" | "verifactu" | "sistema";

interface AdminUsersResponse {
  users?: AdminUserRow[];
  page?: number;
  perPage?: number;
  total?: number;
  error?: string;
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

async function getAccessToken() {
  const supabase = await getSupabaseClientAsync();
  if (!supabase) return null;
  const { data } = await supabase.auth.getSession();
  return data.session?.access_token ?? null;
}

function menuStatusLabel(status: "activo" | "fase") {
  return status === "activo" ? "Disponible" : "Siguiente fase";
}

function AdminMenu({
  current,
  onSelect,
}: {
  current: AdminSection;
  onSelect: (section: AdminSection) => void;
}) {
  return (
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
      {ADMIN_MENU.map(({ id, label, description, status, Icon }) => {
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
  const [scanCredits, setScanCredits] = useState(user.subscription.scanCredits);
  const [aiCreditUnits, setAiCreditUnits] = useState(user.subscription.aiCreditUnits);
  const [scanTrialRemaining, setScanTrialRemaining] = useState(
    user.subscription.scanTrialRemaining,
  );
  const [banReason, setBanReason] = useState(user.ban.reason ?? "");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

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
        scanCredits,
        aiCreditUnits,
        scanTrialRemaining,
      }),
    });
    const body = (await response.json()) as { error?: string };
    if (!response.ok) {
      setMessage(body.error ?? "No se pudo guardar.");
    } else {
      setMessage("Suscripción actualizada.");
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
    const body = (await response.json()) as { error?: string };
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
                {option}
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
            onChange={(event) => setScanTrialRemaining(Number(event.target.value))}
            className="min-h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-base font-semibold text-slate-900"
          />
        </label>
        <label className="space-y-1 text-sm font-bold text-slate-700">
          Packs de escaneo
          <input
            type="number"
            min="0"
            value={scanCredits}
            onChange={(event) => setScanCredits(Number(event.target.value))}
            className="min-h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-base font-semibold text-slate-900"
          />
        </label>
        <label className="space-y-1 text-sm font-bold text-slate-700">
          Unidades IA
          <input
            type="number"
            min="0"
            value={aiCreditUnits}
            onChange={(event) => setAiCreditUnits(Number(event.target.value))}
            className="min-h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-base font-semibold text-slate-900"
          />
        </label>
      </div>

      <div className="grid gap-3 lg:grid-cols-[1fr_auto_auto] lg:items-end">
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

export default function AdminPage() {
  const { user, cloudEnabled } = useCloudSync();
  const [section, setSection] = useState<AdminSection>("usuarios");

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

      <AdminMenu current={section} onSelect={setSection} />

      {section === "usuarios" ? <UsersPanel /> : <FutureSection section={section} />}
    </div>
  );
}

