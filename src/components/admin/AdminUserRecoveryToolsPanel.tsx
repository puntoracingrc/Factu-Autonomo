"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Clock3,
  LockKeyhole,
  RefreshCw,
  ShieldCheck,
  Wrench,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import {
  BLOCKED_RECOVERY_TOOL,
  SUPPORT_RECOVERY_DURATION_OPTIONS,
  SUPPORT_RECOVERY_TOOLS,
  type SupportRecoveryDurationMinutes,
  type SupportRecoveryGrant,
  type SupportRecoveryToolId,
} from "@/lib/admin/recovery-tools";
import { getSupabaseClientAsync } from "@/lib/supabase/client";

interface RecoveryToolsResponse {
  ok?: boolean;
  grants?: SupportRecoveryGrant[];
  activeGrants?: SupportRecoveryGrant[];
  grant?: SupportRecoveryGrant;
  revokedToolId?: SupportRecoveryToolId;
  error?: string;
}

async function accessToken(): Promise<string | null> {
  const supabase = await getSupabaseClientAsync();
  if (!supabase) return null;
  const { data } = await supabase.auth.getSession();
  return data.session?.access_token ?? null;
}

async function readResponse(
  response: Response,
): Promise<RecoveryToolsResponse> {
  try {
    return (await response.json()) as RecoveryToolsResponse;
  } catch {
    return {};
  }
}

function formatDateTime(value: string): string {
  return new Intl.DateTimeFormat("es-ES", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(new Date(value));
}

export function AdminUserRecoveryToolsPanel({ userId }: { userId: string }) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [busyToolId, setBusyToolId] = useState<SupportRecoveryToolId | null>(
    null,
  );
  const [toolId, setToolId] = useState<SupportRecoveryToolId>(
    SUPPORT_RECOVERY_TOOLS[0].id,
  );
  const [durationMinutes, setDurationMinutes] =
    useState<SupportRecoveryDurationMinutes>(30);
  const [reason, setReason] = useState("");
  const [grants, setGrants] = useState<SupportRecoveryGrant[]>([]);
  const [activeGrants, setActiveGrants] = useState<SupportRecoveryGrant[]>([]);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const endpoint = `/api/admin/users/${encodeURIComponent(userId)}/recovery-tools`;
  const panelId = `admin-user-recovery-tools-${userId}`;

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    const token = await accessToken();
    if (!token) {
      setError("Sesión administradora no disponible.");
      setLoading(false);
      return;
    }
    const response = await fetch(endpoint, {
      headers: { Authorization: `Bearer ${token}` },
      cache: "no-store",
    });
    const body = await readResponse(response);
    if (!response.ok) {
      setError(body.error ?? "No se pudo cargar el acceso de soporte.");
    } else {
      setGrants(body.grants ?? []);
      setActiveGrants(body.activeGrants ?? []);
    }
    setLoading(false);
  }, [endpoint]);

  useEffect(() => {
    if (open) void load();
  }, [load, open]);

  const activeByTool = useMemo(
    () => new Map(activeGrants.map((grant) => [grant.toolId, grant])),
    [activeGrants],
  );

  async function mutate(input: {
    action: "grant" | "revoke";
    toolId: SupportRecoveryToolId;
    durationMinutes?: SupportRecoveryDurationMinutes;
    reason: string;
  }) {
    setBusyToolId(input.toolId);
    setMessage(null);
    setError(null);
    const token = await accessToken();
    if (!token) {
      setError("Sesión administradora no disponible.");
      setBusyToolId(null);
      return;
    }
    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(input),
    });
    const body = await readResponse(response);
    if (!response.ok) {
      setError(body.error ?? "No se pudo actualizar el acceso de soporte.");
    } else {
      setMessage(
        input.action === "grant"
          ? "Herramienta activada temporalmente."
          : "Acceso revocado.",
      );
      if (input.action === "grant") setReason("");
      await load();
    }
    setBusyToolId(null);
  }

  return (
    <div className="rounded-2xl border border-indigo-200 bg-indigo-50/60 p-4">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <p className="flex items-center gap-2 text-sm font-black uppercase text-indigo-800">
            <Wrench className="h-4 w-4" />
            Herramientas de soporte
          </p>
          <p className="mt-1 text-sm text-slate-600">
            Acceso excepcional, temporal y auditado para esta cuenta.
          </p>
        </div>
        <Button
          type="button"
          variant="secondary"
          onClick={() => setOpen((value) => !value)}
          aria-expanded={open}
          aria-controls={panelId}
        >
          {open ? "Cerrar soporte" : "Abrir soporte"}
        </Button>
      </div>

      {open && (
        <div id={panelId} className="mt-4 space-y-4">
          <div className="grid gap-3 lg:grid-cols-[1.2fr_0.65fr_1.5fr_auto] lg:items-end">
            <label className="space-y-1 text-sm font-bold text-slate-700">
              Herramienta
              <select
                value={toolId}
                onChange={(event) =>
                  setToolId(event.target.value as SupportRecoveryToolId)
                }
                className="min-h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-base font-semibold text-slate-900"
              >
                {SUPPORT_RECOVERY_TOOLS.map((tool) => (
                  <option key={tool.id} value={tool.id}>
                    {tool.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="space-y-1 text-sm font-bold text-slate-700">
              Duración
              <select
                value={durationMinutes}
                onChange={(event) =>
                  setDurationMinutes(
                    Number(
                      event.target.value,
                    ) as SupportRecoveryDurationMinutes,
                  )
                }
                className="min-h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-base font-semibold text-slate-900"
              >
                {SUPPORT_RECOVERY_DURATION_OPTIONS.map((minutes) => (
                  <option key={minutes} value={minutes}>
                    {minutes} min
                  </option>
                ))}
              </select>
            </label>
            <label className="space-y-1 text-sm font-bold text-slate-700">
              Motivo interno
              <input
                value={reason}
                onChange={(event) => setReason(event.target.value)}
                placeholder="Ej: revisar histórico de una migración"
                maxLength={500}
                className="min-h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-base font-semibold text-slate-900"
              />
            </label>
            <Button
              type="button"
              onClick={() =>
                void mutate({
                  action: "grant",
                  toolId,
                  durationMinutes,
                  reason,
                })
              }
              disabled={busyToolId !== null || reason.trim().length < 3}
            >
              <ShieldCheck className="h-4 w-4" />
              Activar
            </Button>
          </div>

          <div className="grid gap-3 lg:grid-cols-2">
            {SUPPORT_RECOVERY_TOOLS.map((tool) => {
              const active = activeByTool.get(tool.id);
              return (
                <div
                  key={tool.id}
                  className="rounded-xl border border-slate-200 bg-white p-4"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-bold text-slate-900">{tool.label}</p>
                      <p className="mt-1 text-sm text-slate-600">
                        {tool.description}
                      </p>
                    </div>
                    <span
                      className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-bold ${
                        active
                          ? "bg-emerald-100 text-emerald-800"
                          : "bg-slate-100 text-slate-600"
                      }`}
                    >
                      {active ? "Activa" : "Cerrada"}
                    </span>
                  </div>
                  {active && (
                    <div className="mt-3 flex flex-col gap-3 border-t border-slate-100 pt-3 sm:flex-row sm:items-center sm:justify-between">
                      <div className="text-xs text-slate-600">
                        <p className="flex items-center gap-1 font-bold text-slate-800">
                          <Clock3 className="h-3.5 w-3.5" />
                          Hasta {formatDateTime(active.expiresAt)}
                        </p>
                        <p className="mt-1">{active.reason}</p>
                      </div>
                      <Button
                        type="button"
                        variant="secondary"
                        onClick={() =>
                          void mutate({
                            action: "revoke",
                            toolId: tool.id,
                            reason: "Revocada manualmente desde Admin",
                          })
                        }
                        disabled={busyToolId !== null}
                      >
                        Revocar
                      </Button>
                    </div>
                  )}
                </div>
              );
            })}
            <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
              <div className="flex items-start gap-3">
                <LockKeyhole className="mt-0.5 h-5 w-5 shrink-0 text-amber-700" />
                <div>
                  <p className="font-bold text-slate-900">
                    {BLOCKED_RECOVERY_TOOL.label}
                  </p>
                  <p className="mt-1 text-sm text-slate-700">
                    {BLOCKED_RECOVERY_TOOL.description}
                  </p>
                  <span className="mt-2 inline-flex rounded-full bg-amber-100 px-2.5 py-1 text-xs font-bold text-amber-800">
                    Bloqueada
                  </span>
                </div>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <Button
              type="button"
              variant="secondary"
              onClick={load}
              disabled={loading}
            >
              <RefreshCw className="h-4 w-4" />
              {loading ? "Actualizando…" : "Actualizar estado"}
            </Button>
            {message && (
              <p className="text-sm font-semibold text-emerald-700">
                {message}
              </p>
            )}
            {error && (
              <p role="alert" className="text-sm font-semibold text-red-700">
                {error}
              </p>
            )}
          </div>

          {grants.length > 0 && (
            <details className="rounded-xl border border-slate-200 bg-white p-4">
              <summary className="cursor-pointer font-bold text-slate-900">
                Historial reciente ({grants.length})
              </summary>
              <ul className="mt-3 space-y-2 text-sm text-slate-600">
                {grants.slice(0, 10).map((grant) => (
                  <li key={grant.id} className="border-t border-slate-100 pt-2">
                    <strong className="text-slate-900">
                      {SUPPORT_RECOVERY_TOOLS.find(
                        (tool) => tool.id === grant.toolId,
                      )?.label ?? grant.toolId}
                    </strong>{" "}
                    · {formatDateTime(grant.grantedAt)} ·{" "}
                    {grant.revokedAt
                      ? `Revocada ${formatDateTime(grant.revokedAt)}`
                      : Date.parse(grant.expiresAt) <= Date.now()
                        ? "Caducada"
                        : `Activa hasta ${formatDateTime(grant.expiresAt)}`}
                  </li>
                ))}
              </ul>
            </details>
          )}
        </div>
      )}
    </div>
  );
}
