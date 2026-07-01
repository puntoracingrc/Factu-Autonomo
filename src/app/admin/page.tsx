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
import { useCloudSync } from "@/context/CloudSyncContext";
import { ADMIN_PLAN_OPTIONS, ADMIN_STATUS_OPTIONS, dateOnlyFromIso, type AdminUserRow } from "@/lib/admin/users";
import { getSupabaseClientAsync } from "@/lib/supabase/client";
import { Button, ButtonLink } from "@/components/ui/Button";
import { Card, PageHeader } from "@/components/ui/Card";

type AdminSection = "usuarios" | "errores" | "pagos" | "ia" | "importaciones" | "verifactu" | "sistema";

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

function ErrorsPanel() {
  const [errors, setErrors] = useState<AdminErrorRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadErrors = useCallback(async () => {
    setLoading(true);
    setError(null);
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

      {section === "usuarios" && <UsersPanel />}
      {section === "errores" && <ErrorsPanel />}
      {section !== "usuarios" && section !== "errores" && (
        <FutureSection section={section} />
      )}
    </div>
  );
}
