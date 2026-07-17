"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import {
  Activity,
  AlertTriangle,
  Ban,
  BarChart3,
  Brain,
  Clipboard,
  Cloud,
  CreditCard,
  Database,
  Gauge,
  HardDrive,
  Handshake,
  History,
  Mail,
  RefreshCw,
  Siren,
  ShieldCheck,
  TrendingUp,
  Trash2,
  UserCog,
  Users,
} from "lucide-react";
import { useSearchParams } from "next/navigation";
import { FiscalCalendarHealthPanel } from "@/components/admin/FiscalCalendarHealthPanel";
import { FiscalWatchPanel } from "@/components/admin/FiscalWatchPanel";
import { AdminPartnersPanel } from "@/components/admin/AdminPartnersPanel";
import { ExpenseScanCard } from "@/components/expenses/ExpenseScanCard";
import { useCloudSync } from "@/context/CloudSyncContext";
import type { ExpenseScanPayload } from "@/lib/expense-scan/schema";
import { resolveExpenseVat } from "@/lib/expenses";
import {
  ADMIN_PLAN_OPTIONS,
  ADMIN_STATUS_OPTIONS,
  aiUnitsToScanCredits,
  coerceNonNegativeInteger,
  dateOnlyFromIso,
  type AdminUserRow,
} from "@/lib/admin/users";
import type {
  AdminHealthHourlyPoint,
  AdminHealthLevel,
  AdminHealthSnapshot,
} from "@/lib/admin/health";
import type { AdminOperationsStatus } from "@/lib/admin/operations-status";
import type { FiscalCalendarAdminHealth } from "@/lib/fiscal-calendar/admin-health";
import type { FiscalWatchAdminStatus } from "@/lib/fiscal-watch/admin-status";
import {
  type AdminRestoreDataSummary,
  type AdminRestoreDiffSummary,
  type AdminUserRestorePointSummary,
} from "@/lib/admin/user-restore";
import { ADMIN_USER_RESTORE_APPLY_BLOCK_REASON } from "@/lib/admin/user-restore-policy";
import {
  AI_UNITS_PER_SCAN,
  UNLIMITED_AI_CREDIT_UNITS,
  isUnlimitedAiCreditUnits,
} from "@/lib/billing/scan-limits";
import { PLANS } from "@/lib/billing/plans";
import { getSupabaseClientAsync } from "@/lib/supabase/client";
import { Button, ButtonLink } from "@/components/ui/Button";
import { Card, PageHeader } from "@/components/ui/Card";

type AdminSection =
  | "usuarios"
  | "partners"
  | "sistema"
  | "supabase"
  | "vercel"
  | "seguridad"
  | "errores"
  | "aprendizaje";

type OperationsSection = Exclude<
  AdminSection,
  "usuarios" | "partners" | "aprendizaje"
>;

const ADMIN_MFA_UI_ENABLED = false;

interface AdminCapabilitiesResponse {
  fullAdmin?: boolean;
  adminEmailAuthorized?: boolean;
  adminMfa?: {
    required?: boolean;
    satisfied?: boolean;
    currentLevel?: string | null;
  };
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

interface AdminUserRestorePointsResponse {
  mode?: "preview_only";
  email?: string | null;
  current?: AdminRestoreDataSummary;
  restorePoints?: AdminUserRestorePointSummary[];
  error?: string;
}

interface AdminUserRestoreActionResponse {
  ok?: boolean;
  mode?: "preview_only";
  restorePoint?: AdminUserRestorePointSummary;
  current?: AdminRestoreDataSummary;
  diff?: AdminRestoreDiffSummary;
  error?: string;
}

interface AdminUserMfaFactor {
  id: string;
  type: string;
  status: string;
  friendlyName: string | null;
  createdAt: string | null;
  updatedAt: string | null;
  lastChallengedAt: string | null;
}

interface AdminUserMfaResponse {
  email?: string | null;
  factors?: AdminUserMfaFactor[];
  expiresAt?: string;
  error?: string;
  code?: string;
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

interface AdminHealthResponse {
  health?: AdminHealthSnapshot | null;
  error?: string;
  message?: string;
  monitoringAvailable?: boolean;
}

interface AdminFiscalCalendarHealthResponse {
  health?: FiscalCalendarAdminHealth | null;
  error?: string;
}

interface AdminFiscalWatchResponse {
  status?: FiscalWatchAdminStatus | null;
  reviewStoreAvailable?: boolean;
  reviewed?: boolean;
  error?: string;
}

interface AdminVercelUsageResource {
  id: string;
  label: string;
  service: string;
  resource: string;
  costUsd: number;
  usageQuantity: number | null;
  usageUnit: string | null;
  project: string | null;
  sharePercent: number;
}

interface AdminVercelUsageProject {
  project: string;
  costUsd: number;
  sharePercent: number;
}

interface AdminVercelUsageSnapshot {
  generatedAt: string;
  level: AdminHealthLevel;
  label: string;
  headline: string;
  period: {
    from: string;
    to: string;
    daysRemaining: number;
  };
  plan: {
    name: "Pro";
    monthlyCreditUsd: number;
    includedFastDataTransferGb: number;
    includedEdgeRequests: number;
  };
  summary: {
    totalCostUsd: number;
    creditUsedUsd: number;
    onDemandUsd: number;
    creditUsedPercent: number;
    lineCount: number;
    primaryProjectSlug: string | null;
  };
  topResources: AdminVercelUsageResource[];
  topProjects: AdminVercelUsageProject[];
  recommendations: string[];
}

interface AdminVercelUsageResponse {
  configured?: boolean;
  vercel?: AdminVercelUsageSnapshot | null;
  message?: string;
  error?: string;
}

interface AdminOperationsStatusResponse {
  configured?: {
    github?: boolean;
    vercel?: boolean;
  };
  operations?: AdminOperationsStatus | null;
  message?: string;
  error?: string;
}

interface AdminSectionSignal {
  id: string;
  level: AdminHealthLevel;
}

type AdminSectionSignals = Partial<Record<AdminSection, AdminSectionSignal>>;

interface AdminMfaFactor {
  id: string;
  factor_type?: string;
  status?: string;
  friendly_name?: string;
}

const ADMIN_MENU: Array<{
  id: AdminSection;
  label: string;
  description: string;
  Icon: typeof UserCog;
}> = [
  {
    id: "sistema",
    label: "Panel de control",
    description: "Resumen operativo, picos y señales de capacidad.",
    Icon: Gauge,
  },
  {
    id: "usuarios",
    label: "Usuarios",
    description: "Planes, pagos, restauración y acceso de cuentas.",
    Icon: UserCog,
  },
  {
    id: "partners",
    label: "Partners",
    description: "Accesos, referidos, comisiones y datos de cobro.",
    Icon: Handshake,
  },
  {
    id: "supabase",
    label: "Supabase",
    description: "Base de datos, sync, capacidad y usuarios cloud.",
    Icon: Database,
  },
  {
    id: "vercel",
    label: "Vercel",
    description: "Coste, consumo, proyectos y despliegue del dominio.",
    Icon: Cloud,
  },
  {
    id: "seguridad",
    label: "Seguridad",
    description: "MFA, abuso, extracción y log seguro para diagnóstico.",
    Icon: ShieldCheck,
  },
  {
    id: "errores",
    label: "Errores",
    description: "Eventos técnicos recientes y rutas afectadas.",
    Icon: Siren,
  },
  {
    id: "aprendizaje",
    label: "IA y aprendizaje",
    description: "Escaneos de prueba y correcciones de lectura IA.",
    Icon: Brain,
  },
];

const SECTION_ALERTS_SEEN_KEY = "factu-admin-section-alerts-seen-v1";

function securityAlertIdFromHealth(health: AdminHealthSnapshot | null): string | null {
  if (!health || health.abuse.level !== "action") return null;
  return [
    health.abuse.latestAt ?? health.generatedAt,
    health.abuse.totalRequests,
    health.abuse.totalBuckets,
    health.abuse.namespaces
      .filter((item) => item.level === "action")
      .map((item) => `${item.namespace}:${item.requests}:${item.maxRequests}`)
      .join(","),
  ].join("|");
}

function adminLevelRank(level: AdminHealthLevel): number {
  return level === "action" ? 2 : level === "watch" ? 1 : 0;
}

function highestAdminLevel(levels: AdminHealthLevel[]): AdminHealthLevel {
  return levels.reduce<AdminHealthLevel>(
    (highest, level) =>
      adminLevelRank(level) > adminLevelRank(highest) ? level : highest,
    "ok",
  );
}

function buildAdminSectionSignals(input: {
  health: AdminHealthSnapshot | null;
  calendarHealth: FiscalCalendarAdminHealth | null;
  calendarHealthProbeFailed?: boolean;
  fiscalWatch: FiscalWatchAdminStatus | null;
  fiscalWatchProbeFailed?: boolean;
  operations: AdminOperationsStatus | null;
  vercel: AdminVercelUsageSnapshot | null;
  errors: AdminErrorRow[];
}): AdminSectionSignals {
  const signals: AdminSectionSignals = {};
  const {
    health,
    calendarHealth,
    calendarHealthProbeFailed,
    fiscalWatch,
    fiscalWatchProbeFailed,
    operations,
    vercel,
    errors,
  } = input;

  const systemLevels: AdminHealthLevel[] = [];
  const systemSignalIds: string[] = [];

  if (
    calendarHealthProbeFailed ||
    (calendarHealth !== null && calendarHealth.level !== "ok")
  ) {
    systemLevels.push(
      calendarHealthProbeFailed
        ? "action"
        : (calendarHealth?.level ?? "action"),
    );
    systemSignalIds.push(
      calendarHealthProbeFailed
        ? "fiscal-calendar-probe-failed"
        : calendarHealth?.feeds
            .filter((feed) => feed.level !== "ok")
            .map(
              (feed) =>
                `${feed.category}:${feed.level}:${feed.code}:${feed.eventCount ?? "unknown"}:${feed.upcomingEventCount ?? "unknown"}`,
            )
            .join("|") || "fiscal-calendar-unavailable",
    );
  }

  if (
    fiscalWatchProbeFailed ||
    (fiscalWatch !== null && fiscalWatch.level !== "ok")
  ) {
    systemLevels.push(
      fiscalWatchProbeFailed ? "action" : (fiscalWatch?.level ?? "action"),
    );
    systemSignalIds.push(
      fiscalWatchProbeFailed
        ? "fiscal-watch-probe-failed"
        : fiscalWatch?.signalId || "fiscal-watch-unavailable",
    );
  }

  if (systemLevels.length > 0) {
    signals.sistema = {
      level: highestAdminLevel(systemLevels),
      id: systemSignalIds.join("||"),
    };
  }

  if (health) {
    const securityLevel = highestAdminLevel([
      health.abuse.level,
      ...(operations ? [operations.firewall.level] : []),
      ...(operations ? [operations.github.schedulerLevel] : []),
    ]);
    if (securityLevel !== "ok") {
      signals.seguridad = {
        level: securityLevel,
        id: [
          securityAlertIdFromHealth(health) ?? "app-ok",
          operations?.firewall.level ?? "external-unknown",
          operations?.firewall.latestAt ?? "none",
          operations?.firewall.events24h ?? 0,
          operations?.github.scheduler?.id ?? "no-scheduler-run",
          operations?.github.scheduler?.conclusion ?? "unknown",
          operations?.github.scheduler?.updatedAt ?? "none",
        ].join("|"),
      };
    }

    const supabaseChecks = health.checks.filter((check) =>
      ["capacity", "database", "sync"].includes(check.id),
    );
    const supabaseLevel = highestAdminLevel(
      supabaseChecks.map((check) => check.level),
    );
    if (supabaseLevel !== "ok") {
      signals.supabase = {
        level: supabaseLevel,
        id: supabaseChecks
          .filter((check) => check.level !== "ok")
          .map((check) => `${check.id}:${check.level}:${check.value}`)
          .join("|"),
      };
    }
  }

  const vercelLevel = highestAdminLevel([
    vercel?.level ?? "ok",
    operations?.deployment.level ?? "ok",
  ]);
  if (vercelLevel !== "ok") {
    signals.vercel = {
      level: vercelLevel,
      id: [
        vercel?.period.from ?? "no-cycle",
        vercel?.level ?? "no-billing",
        operations?.deployment.aliasDeploymentId ?? "no-alias",
        operations?.deployment.latestDeploymentId ?? "no-deployment",
        operations?.deployment.alignedWithMain ?? "unknown",
      ].join("|"),
    };
  }

  const unresolvedErrors = errors.filter((item) => !item.resolved_at);
  const errorLevel: AdminHealthLevel = unresolvedErrors.some(
    (item) => item.severity === "error",
  )
    ? "action"
    : unresolvedErrors.some((item) => item.severity === "warning")
      ? "watch"
      : "ok";
  if (errorLevel !== "ok") {
    signals.errores = {
      level: errorLevel,
      id: `${unresolvedErrors[0]?.created_at ?? "none"}|${unresolvedErrors.length}|${errorLevel}`,
    };
  }

  return signals;
}

function formatDate(value: string | null) {
  if (!value) return "Sin fecha";
  return new Intl.DateTimeFormat("es-ES", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(new Date(value));
}

function formatDateTime(value: string | null) {
  if (!value) return "Sin fecha";
  return new Intl.DateTimeFormat("es-ES", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

function formatMoney(cents: number) {
  return (cents / 100).toLocaleString("es-ES", {
    style: "currency",
    currency: "EUR",
  });
}

function formatUsd(value: number) {
  return value.toLocaleString("es-ES", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 2,
  });
}

function formatInteger(value: number) {
  return Math.round(value).toLocaleString("es-ES");
}

function formatBytes(bytes: number) {
  if (bytes <= 0) return "0 MB";
  const units = ["B", "KB", "MB", "GB", "TB"];
  let value = bytes;
  let unitIndex = 0;
  while (value >= 1024 && unitIndex < units.length - 1) {
    value /= 1024;
    unitIndex += 1;
  }
  return `${value.toLocaleString("es-ES", {
    maximumFractionDigits: unitIndex >= 3 ? 2 : 1,
  })} ${units[unitIndex]}`;
}

function formatPercent(value: number) {
  return `${value.toLocaleString("es-ES", { maximumFractionDigits: 1 })}%`;
}

function formatUsageQuantity(value: number | null, unit: string | null) {
  if (value === null || value <= 0) return null;
  return `${value.toLocaleString("es-ES", { maximumFractionDigits: 2 })}${
    unit ? ` ${unit}` : ""
  }`;
}

function formatAiUnitCount(value: number) {
  if (value === Number.MAX_SAFE_INTEGER || isUnlimitedAiCreditUnits(value)) {
    return "Sin límite";
  }
  return value.toLocaleString("es-ES");
}

function formatAiScanCount(value: number) {
  if (value === Number.MAX_SAFE_INTEGER || isUnlimitedAiCreditUnits(value)) {
    return "Sin límite";
  }
  return value.toLocaleString("es-ES");
}

function severityClasses(severity: AdminErrorRow["severity"]) {
  if (severity === "warning") return "bg-amber-100 text-amber-800";
  if (severity === "info") return "bg-blue-100 text-blue-800";
  return "bg-red-100 text-red-800";
}

function healthToneClasses(level: AdminHealthLevel) {
  if (level === "action") {
    return {
      panel: "border-red-200 bg-red-50 text-red-950",
      badge: "bg-red-600 text-white",
      soft: "bg-red-100 text-red-800",
      bar: "bg-red-500",
    };
  }
  if (level === "watch") {
    return {
      panel: "border-amber-200 bg-amber-50 text-amber-950",
      badge: "bg-amber-500 text-white",
      soft: "bg-amber-100 text-amber-800",
      bar: "bg-amber-500",
    };
  }
  return {
    panel: "border-emerald-200 bg-emerald-50 text-emerald-950",
    badge: "bg-emerald-600 text-white",
    soft: "bg-emerald-100 text-emerald-800",
    bar: "bg-emerald-500",
  };
}

function hourLabel(value: string) {
  return new Intl.DateTimeFormat("es-ES", {
    hour: "2-digit",
  }).format(new Date(value));
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

async function readAdminJsonResponse<T>(response: Response): Promise<T> {
  try {
    return (await response.json()) as T;
  } catch {
    return {} as T;
  }
}

async function fetchAdminResponse(
  input: string,
  init: RequestInit,
): Promise<Response | null> {
  try {
    return await fetch(input, init);
  } catch {
    return null;
  }
}

function buildCodexHandoffBlock(scope: string) {
  return [
    "CODEX_HANDOFF_CONTEXT_V1",
    `scope=${scope}`,
    "project=facturacion-autonomos.app",
    "local_repo=<ruta-del-worktree-aislado>",
    "production=https://facturacion-autonomos.app",
    "github=https://github.com/puntoracingrc/Factu-Autonomo",
    "admin=/admin?seccion=sistema|usuarios|partners|supabase|vercel|seguridad|errores|aprendizaje",
    "rules=read-only-first; never expose tokens; never mutate Supabase/Vercel/real user data without explicit approval",
    "deploy_flow=branch -> commit -> push -> PR -> checks -> merge -> main CI -> Production Domain -> verify production",
    "verify_after_deploy=/admin 200; protected admin APIs return 401 without auth; Production Domain must pass",
    "security_focus=RLS owner isolation; CSP enforce; admin MFA aal2; distributed rate limit; no NEXT_PUBLIC secrets",
    "if_blocked=report exact blocker and do not force destructive rollback",
  ].join("\n");
}

async function copyTextToClipboard(value: string): Promise<boolean> {
  if (navigator.clipboard?.writeText) {
    try {
      await navigator.clipboard.writeText(value);
      return true;
    } catch {
      // Fall back to the textarea path below for browsers or embedded views
      // that expose Clipboard API but reject writes.
    }
  }

  const textarea = document.createElement("textarea");
  textarea.value = value;
  textarea.setAttribute("readonly", "true");
  textarea.style.position = "fixed";
  textarea.style.top = "-1000px";
  textarea.style.left = "-1000px";
  document.body.appendChild(textarea);
  textarea.select();
  textarea.setSelectionRange(0, textarea.value.length);
  let copied = false;
  try {
    copied = document.execCommand("copy");
  } catch {
    copied = false;
  } finally {
    document.body.removeChild(textarea);
  }
  return copied;
}

function CopyableLogPanel({
  title,
  description,
  log,
}: {
  title: string;
  description: string;
  log: string;
}) {
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const [copyState, setCopyState] = useState<"idle" | "copied" | "selected">(
    "idle",
  );

  const copy = useCallback(async () => {
    const ok = await copyTextToClipboard(log);
    if (!ok) {
      textareaRef.current?.focus();
      textareaRef.current?.select();
      setCopyState("selected");
      window.setTimeout(() => setCopyState("idle"), 3200);
      return;
    }
    setCopyState("copied");
    window.setTimeout(() => setCopyState("idle"), 2200);
  }, [log]);

  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-950 p-4 text-slate-100">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h3 className="font-bold text-white">{title}</h3>
          <p className="mt-1 text-sm text-slate-300">{description}</p>
        </div>
        <Button
          type="button"
          variant="secondary"
          onClick={() => void copy()}
          className="min-h-10 bg-white px-4 text-sm text-slate-900 hover:bg-slate-100"
        >
          <Clipboard className="h-4 w-4" />
          {copyState === "copied"
            ? "Copiado"
            : copyState === "selected"
              ? "Seleccionado"
              : "Copiar log"}
        </Button>
      </div>
      <textarea
        ref={textareaRef}
        readOnly
        value={log}
        onFocus={(event) => event.currentTarget.select()}
        aria-label={title}
        className="mt-4 h-72 w-full resize-y rounded-xl border border-white/10 bg-black/40 p-3 font-mono text-xs font-semibold leading-5 text-slate-100 outline-none focus:border-blue-300 focus:ring-2 focus:ring-blue-400/40"
      />
    </div>
  );
}

function AdminMenu({
  current,
  onSelect,
  sections,
  alerts = {},
}: {
  current: AdminSection;
  onSelect: (section: AdminSection) => void;
  sections: AdminSection[];
  alerts?: Partial<Record<AdminSection, AdminHealthLevel>>;
}) {
  const visibleMenu = ADMIN_MENU.filter((entry) => sections.includes(entry.id));

  return (
    <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
      {visibleMenu.map(({ id, label, description, Icon }) => {
        const selected = current === id;
        const alertLevel = alerts[id];
        const hasActionAlert = alertLevel === "action";
        const hasWatchAlert = alertLevel === "watch";
        const buttonClass = hasActionAlert
          ? "border-red-300 bg-red-50 shadow-red-100 hover:border-red-400 hover:bg-red-50"
          : hasWatchAlert
            ? "border-amber-300 bg-amber-50 shadow-amber-100 hover:border-amber-400 hover:bg-amber-50"
            : selected
              ? "border-blue-300 bg-blue-50"
              : "border-slate-200 bg-white hover:border-blue-200 hover:bg-blue-50/60";
        const iconClass = hasActionAlert
          ? "bg-red-600 text-white"
          : hasWatchAlert
            ? "bg-amber-500 text-white"
            : selected
              ? "bg-blue-600 text-white"
              : "bg-slate-100 text-slate-700";
        return (
          <button
            key={id}
            type="button"
            onClick={() => onSelect(id)}
            className={`min-h-[116px] rounded-2xl border p-3 text-left shadow-sm transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-500 ${buttonClass}`}
          >
            <div className="flex items-start gap-3">
              <span
                className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl ${iconClass}`}
              >
                {hasActionAlert ? (
                  <AlertTriangle className="h-5 w-5" />
                ) : (
                  <Icon className="h-5 w-5" />
                )}
              </span>
              <span className="min-w-0">
                <span className="flex flex-wrap items-center gap-2">
                  <span className="text-lg font-bold text-slate-900">{label}</span>
                  {hasActionAlert && (
                    <span className="rounded-full bg-red-600 px-2.5 py-1 text-xs font-black uppercase tracking-wide text-white">
                      Aviso
                    </span>
                  )}
                  {hasWatchAlert && (
                    <span className="rounded-full bg-amber-500 px-2.5 py-1 text-xs font-black uppercase tracking-wide text-white">
                      Vigilar
                    </span>
                  )}
                </span>
                <span className="mt-1 block text-sm text-slate-600">
                  {description}
                </span>
              </span>
            </div>
          </button>
        );
      })}
    </div>
  );
}

function RestoreDataSummary({
  summary,
}: {
  summary: AdminRestoreDataSummary | null;
}) {
  if (!summary) {
    return (
      <p className="text-sm font-semibold text-slate-500">
        Sin resumen cargado.
      </p>
    );
  }

  const items = [
    ["Facturas/doc.", summary.documents],
    ["Clientes", summary.customers],
    ["Gastos", summary.expenses],
    ["Gastos fijos", summary.recurringExpenses],
    ["Proveedores", summary.suppliers],
    ["Productos", summary.products],
  ];

  return (
    <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
      {items.map(([label, value]) => (
        <div key={label} className="rounded-xl bg-white px-3 py-2">
          <p className="text-xs font-bold uppercase text-slate-500">{label}</p>
          <p className="text-lg font-black text-slate-900">{value}</p>
        </div>
      ))}
      <div className="rounded-xl bg-white px-3 py-2">
        <p className="text-xs font-bold uppercase text-slate-500">Filas nube</p>
        <p className="text-lg font-black text-slate-900">{summary.totalRows}</p>
      </div>
      <div className="rounded-xl bg-white px-3 py-2">
        <p className="text-xs font-bold uppercase text-slate-500">Borrados</p>
        <p className="text-lg font-black text-slate-900">
          {summary.deletedEntities}
        </p>
      </div>
      <div className="rounded-xl bg-white px-3 py-2">
        <p className="text-xs font-bold uppercase text-slate-500">Último sync</p>
        <p className="text-sm font-bold text-slate-900">
          {formatDateTime(summary.latestSyncAt)}
        </p>
      </div>
    </div>
  );
}

function RestoreDiffSummary({ diff }: { diff: AdminRestoreDiffSummary | null }) {
  if (!diff) return null;

  return (
    <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-950">
      <p className="font-black text-slate-900">Vista previa de restauración</p>
      <p className="mt-1">
        {diff.totalChanges} cambio(s): {diff.added} añadido(s), {diff.updated}{" "}
        actualizado(s), {diff.deleted} borrado(s).
      </p>
      <div className="mt-3 grid gap-2 sm:grid-cols-3">
        {Object.entries(diff.byType)
          .filter(([, value]) => value.added + value.updated + value.deleted > 0)
          .map(([type, value]) => (
            <div key={type} className="rounded-xl bg-white px-3 py-2">
              <p className="text-xs font-bold uppercase text-slate-500">
                {type}
              </p>
              <p className="font-bold text-slate-900">
                Añadidos {value.added} · Actualizados {value.updated} · Borrados{" "}
                {value.deleted}
              </p>
            </div>
          ))}
      </div>
    </div>
  );
}

function UserRestorePanel({ user }: { user: AdminUserRow }) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState<"idle" | "create" | "preview">(
    "idle",
  );
  const [current, setCurrent] = useState<AdminRestoreDataSummary | null>(null);
  const [restorePoints, setRestorePoints] = useState<
    AdminUserRestorePointSummary[]
  >([]);
  const [selectedRestorePointId, setSelectedRestorePointId] = useState("");
  const [label, setLabel] = useState("Copia soporte admin");
  const [reason, setReason] = useState("");
  const [preview, setPreview] = useState<AdminRestoreDiffSummary | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const endpoint = `/api/admin/users/${encodeURIComponent(user.id)}/restore-points`;
  const restorePanelId = `admin-user-restore-${user.id}`;

  const loadRestorePoints = useCallback(async () => {
    setLoading(true);
    setError(null);
    setMessage(null);
    setPreview(null);
    const token = await getAccessToken();
    if (!token) {
      setError("Sesión no disponible.");
      setLoading(false);
      return;
    }

    const response = await fetch(endpoint, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const body = await readAdminJsonResponse<AdminUserRestorePointsResponse>(
      response,
    );
    if (!response.ok) {
      setError(body.error ?? "No se pudieron cargar las copias.");
    } else {
      const points = body.restorePoints ?? [];
      setCurrent(body.current ?? null);
      setRestorePoints(points);
      setSelectedRestorePointId((selected) =>
        points.some((point) => point.id === selected)
          ? selected
          : (points[0]?.id ?? ""),
      );
    }
    setLoading(false);
  }, [endpoint]);

  useEffect(() => {
    if (open) void loadRestorePoints();
  }, [loadRestorePoints, open]);

  const createRestorePoint = async () => {
    setBusy("create");
    setError(null);
    setMessage(null);
    const token = await getAccessToken();
    if (!token) {
      setError("Sesión no disponible.");
      setBusy("idle");
      return;
    }

    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        action: "create",
        label,
        reason,
      }),
    });
    const body = await readAdminJsonResponse<AdminUserRestoreActionResponse>(
      response,
    );
    if (!response.ok || !body.restorePoint) {
      setError(body.error ?? "No se pudo crear la copia.");
    } else {
      setSelectedRestorePointId(body.restorePoint.id);
      await loadRestorePoints();
      setMessage("Copia de restauración creada.");
    }
    setBusy("idle");
  };

  const previewRestore = async () => {
    if (!selectedRestorePointId) return;
    setBusy("preview");
    setError(null);
    setMessage(null);
    const token = await getAccessToken();
    if (!token) {
      setError("Sesión no disponible.");
      setBusy("idle");
      return;
    }

    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        action: "preview",
        restorePointId: selectedRestorePointId,
      }),
    });
    const body = await readAdminJsonResponse<AdminUserRestoreActionResponse>(
      response,
    );
    if (!response.ok || !body.diff) {
      setError(body.error ?? "No se pudo preparar la vista previa.");
    } else {
      setCurrent(body.current ?? null);
      setPreview(body.diff);
      setMessage(
        "Vista previa lista. La aplicación sigue bloqueada y no modifica datos.",
      );
    }
    setBusy("idle");
  };

  const selectedPoint = restorePoints.find(
    (point) => point.id === selectedRestorePointId,
  );

  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <p className="flex items-center gap-2 text-sm font-black uppercase tracking-wide text-slate-500">
            <History className="h-4 w-4" />
            Restauración de datos
          </p>
          <p className="mt-1 text-sm text-slate-600">
            Copias privadas y vista previa de cambios para esta cuenta.
          </p>
        </div>
        <Button
          type="button"
          variant="secondary"
          onClick={() => setOpen((value) => !value)}
          aria-expanded={open}
          aria-controls={restorePanelId}
        >
          {open ? "Cerrar copias" : "Abrir copias"}
        </Button>
      </div>

      {open && (
        <div id={restorePanelId} className="mt-4 space-y-4">
          {loading && <p className="text-sm font-semibold text-slate-500">Cargando...</p>}
          {!loading && !error && (
            <>
              <div className="rounded-2xl bg-slate-100 p-4">
                <p className="mb-3 text-sm font-black uppercase tracking-wide text-slate-500">
                  Estado actual en nube
                </p>
                <RestoreDataSummary summary={current} />
              </div>

              <div className="grid gap-3 lg:grid-cols-[1fr_1fr_auto] lg:items-end">
                <label className="space-y-1 text-sm font-bold text-slate-700">
                  Nombre de la copia
                  <input
                    value={label}
                    onChange={(event) => setLabel(event.target.value)}
                    className="min-h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-base font-semibold text-slate-900"
                  />
                </label>
                <label className="space-y-1 text-sm font-bold text-slate-700">
                  Motivo interno
                  <input
                    value={reason}
                    onChange={(event) => setReason(event.target.value)}
                    placeholder="Ej: soporte antes de restaurar"
                    className="min-h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-base font-semibold text-slate-900"
                  />
                </label>
                <Button
                  type="button"
                  onClick={createRestorePoint}
                  disabled={busy !== "idle" || !label.trim()}
                >
                  Crear copia actual
                </Button>
              </div>

              <div className="grid gap-3 lg:grid-cols-[1fr_auto] lg:items-end">
                <label className="space-y-1 text-sm font-bold text-slate-700">
                  Copia disponible
                  <select
                    value={selectedRestorePointId}
                    onChange={(event) => {
                      setSelectedRestorePointId(event.target.value);
                      setPreview(null);
                    }}
                    className="min-h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-base font-semibold text-slate-900"
                  >
                    {restorePoints.length === 0 && (
                      <option value="">Sin copias todavía</option>
                    )}
                    {restorePoints.map((point) => (
                      <option key={point.id} value={point.id}>
                        Vista previa · {formatDateTime(point.createdAt)} ·{" "}
                        {point.label}
                      </option>
                    ))}
                  </select>
                </label>
                <Button
                  type="button"
                  variant="secondary"
                  onClick={previewRestore}
                  disabled={busy !== "idle" || !selectedRestorePointId}
                >
                  Ver vista previa
                </Button>
              </div>

              {selectedPoint && (
                <div className="rounded-2xl bg-white p-4 text-sm text-slate-700">
                  <p className="font-bold text-slate-900">{selectedPoint.label}</p>
                  <p>Creada: {formatDateTime(selectedPoint.createdAt)}</p>
                  <p>
                    Tipo:{" "}
                    {selectedPoint.source === "pre_restore_safety"
                      ? "seguridad previa"
                      : "manual admin"}
                  </p>
                  {selectedPoint.reason && <p>Motivo: {selectedPoint.reason}</p>}
                </div>
              )}

              <RestoreDiffSummary diff={preview} />

              <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-amber-950">
                <p className="flex items-center gap-2 text-sm font-black uppercase tracking-wide">
                  <ShieldCheck className="h-4 w-4" />
                  Aplicación de restauraciones bloqueada
                </p>
                <p className="mt-2 text-sm font-semibold">
                  {ADMIN_USER_RESTORE_APPLY_BLOCK_REASON}
                </p>
                <p className="mt-2 text-sm">
                  Puedes crear copias privadas y revisar su vista previa sin
                  modificar los datos de la cuenta.
                </p>
              </div>
            </>
          )}
          {message && (
            <p role="status" className="text-sm font-semibold text-green-700">
              {message}
            </p>
          )}
          {error && (
            <p role="alert" className="text-sm font-semibold text-red-700">
              {error}
            </p>
          )}
        </div>
      )}
    </div>
  );
}

function UserMfaRecoveryPanel({ user }: { user: AdminUserRow }) {
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [factors, setFactors] = useState<AdminUserMfaFactor[]>([]);
  const [recoveryCode, setRecoveryCode] = useState("");
  const [confirmationEmail, setConfirmationEmail] = useState("");
  const [codeExpiresAt, setCodeExpiresAt] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const endpoint = `/api/admin/users/${encodeURIComponent(user.id)}/mfa`;

  const loadFactors = useCallback(async () => {
    setLoading(true);
    setError(null);
    const token = await getAccessToken();
    if (!token) {
      setError("Sesión no disponible.");
      setLoading(false);
      return;
    }

    const response = await fetch(endpoint, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const body = await readAdminJsonResponse<AdminUserMfaResponse>(response);
    if (!response.ok) {
      setError(body.error ?? "No se pudo cargar MFA del usuario.");
    } else {
      setFactors(body.factors ?? []);
    }
    setLoading(false);
  }, [endpoint]);

  const sendRecoveryCode = async () => {
    setBusy(true);
    setMessage(null);
    setError(null);
    const token = await getAccessToken();
    if (!token) {
      setError("Sesión no disponible.");
      setBusy(false);
      return;
    }

    const response = await fetch(endpoint, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
    });
    const body = await readAdminJsonResponse<AdminUserMfaResponse>(response);
    if (!response.ok) {
      setError(body.error ?? "No se pudo enviar el código.");
    } else {
      setRecoveryCode("");
      setCodeExpiresAt(body.expiresAt ?? null);
      setMessage(
        `Código enviado a ${body.email ?? user.email}. Pídeselo al usuario antes de quitar el factor.`,
      );
    }
    setBusy(false);
  };

  const deleteFactor = async (factor: AdminUserMfaFactor) => {
    const cleanCode = recoveryCode.trim().replace(/\s+/g, "");
    if (!/^\d{6}$/.test(cleanCode)) {
      setError("Introduce el código de 6 dígitos que ha recibido el usuario.");
      return;
    }
    if (confirmationEmail.trim().toLowerCase() !== user.email.toLowerCase()) {
      setError("Confirma el email completo del usuario antes de quitar el factor.");
      return;
    }

    setBusy(true);
    setMessage(null);
    setError(null);
    const token = await getAccessToken();
    if (!token) {
      setError("Sesión no disponible.");
      setBusy(false);
      return;
    }

    const response = await fetch(endpoint, {
      method: "DELETE",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        factorId: factor.id,
        confirmationEmail,
        recoveryCode: cleanCode,
      }),
    });
    const body = await readAdminJsonResponse<AdminUserMfaResponse>(response);
    if (!response.ok) {
      setError(body.error ?? "No se pudo quitar el factor MFA.");
    } else {
      setRecoveryCode("");
      setConfirmationEmail("");
      setCodeExpiresAt(null);
      setMessage("Factor MFA eliminado. El usuario deberá iniciar sesión y configurarlo de nuevo.");
      await loadFactors();
    }
    setBusy(false);
  };

  return (
    <details className="rounded-2xl border border-amber-200 bg-amber-50 p-4">
      <summary className="cursor-pointer text-sm font-black text-amber-950">
        Recuperación de doble factor
      </summary>
      <div className="mt-4 space-y-3">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
          <div className="text-sm leading-6 text-amber-950">
            <p className="font-bold">Solo para soporte con identidad comprobada.</p>
            <p>
              Quitar un factor permite al usuario recuperar acceso y configurarlo
              otra vez. La acción queda registrada como evento de seguridad.
            </p>
          </div>
          <Button
            type="button"
            variant="secondary"
            onClick={() => void loadFactors()}
            disabled={loading || busy}
            className="bg-white"
          >
            <RefreshCw className="h-4 w-4" />
            Ver factores
          </Button>
        </div>

        <div className="grid gap-3 rounded-xl bg-white p-3 lg:grid-cols-[1fr_1fr_auto] lg:items-end">
          <label className="space-y-1 text-sm font-bold text-slate-700">
            Código recibido por el usuario
            <input
              value={recoveryCode}
              onChange={(event) => setRecoveryCode(event.target.value)}
              inputMode="numeric"
              placeholder="6 dígitos"
              className="min-h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-base font-semibold text-slate-900"
            />
            {codeExpiresAt ? (
              <span className="block text-xs font-semibold text-slate-500">
                Caduca: {formatDateTime(codeExpiresAt)}
              </span>
            ) : null}
          </label>
          <label className="space-y-1 text-sm font-bold text-slate-700">
            Confirmar email
            <input
              value={confirmationEmail}
              onChange={(event) => setConfirmationEmail(event.target.value)}
              placeholder={user.email}
              className="min-h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-base font-semibold text-slate-900"
            />
            <span className="block text-xs font-semibold text-slate-500">
              Escribe el email completo antes de quitar un factor.
            </span>
          </label>
          <Button
            type="button"
            variant="secondary"
            onClick={() => void sendRecoveryCode()}
            disabled={busy}
          >
            <Mail className="h-4 w-4" />
            Enviar código
          </Button>
        </div>

        {loading ? (
          <p className="text-sm font-semibold text-amber-900">Cargando factores...</p>
        ) : null}

        {!loading && factors.length === 0 ? (
          <p className="rounded-xl bg-white px-3 py-2 text-sm font-semibold text-amber-900">
            Sin factores cargados o sin doble factor activo.
          </p>
        ) : null}

        {factors.length > 0 ? (
          <div className="space-y-2">
            {factors.map((factor) => (
              <div
                key={factor.id}
                className="flex flex-col gap-3 rounded-xl bg-white px-3 py-2 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="text-sm text-slate-700">
                  <p className="font-black text-slate-900">
                    {factor.friendlyName || factor.type} · {factor.status}
                  </p>
                  <p className="text-xs font-semibold text-slate-500">
                    Creado: {formatDateTime(factor.createdAt)} · Último reto:{" "}
                    {formatDateTime(factor.lastChallengedAt)}
                  </p>
                </div>
                <Button
                  type="button"
                  variant="danger"
                  onClick={() => void deleteFactor(factor)}
                  disabled={busy}
                  className="min-h-10 px-4 text-sm"
                >
                  <Trash2 className="h-4 w-4" />
                  Quitar factor
                </Button>
              </div>
            ))}
          </div>
        ) : null}

        {message ? (
          <p className="text-sm font-semibold text-emerald-700">{message}</p>
        ) : null}
        {error ? (
          <p className="text-sm font-semibold text-red-700">{error}</p>
        ) : null}
      </div>
    </details>
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
  const initialUnlimitedAi = isUnlimitedAiCreditUnits(
    user.subscription.aiCreditUnits,
  );
  const [aiCreditUnits, setAiCreditUnits] = useState(
    initialUnlimitedAi ? 0 : user.subscription.aiCreditUnits,
  );
  const [unlimitedAi, setUnlimitedAi] = useState(initialUnlimitedAi);
  const [scanTrialRemaining, setScanTrialRemaining] = useState(
    user.subscription.scanTrialRemaining,
  );
  const [banReason, setBanReason] = useState(user.ban.reason ?? "");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const manualAiCreditUnits = coerceNonNegativeInteger(aiCreditUnits);
  const normalizedAiCreditUnits = unlimitedAi
    ? UNLIMITED_AI_CREDIT_UNITS
    : manualAiCreditUnits;
  const aiScanEquivalent = unlimitedAi
    ? Number.MAX_SAFE_INTEGER
    : aiUnitsToScanCredits(manualAiCreditUnits);
  const monthlyUsage = user.aiUsage;
  const monthlyPercent = monthlyUsage.percentRemaining;

  useEffect(() => {
    const nextUnlimitedAi = isUnlimitedAiCreditUnits(
      user.subscription.aiCreditUnits,
    );
    setPlan(user.subscription.plan);
    setStatus(user.subscription.status);
    setTrialEndsAt(dateOnlyFromIso(user.subscription.trialEndsAt));
    setCurrentPeriodEnd(dateOnlyFromIso(user.subscription.currentPeriodEnd));
    setUnlimitedAi(nextUnlimitedAi);
    setAiCreditUnits(nextUnlimitedAi ? 0 : user.subscription.aiCreditUnits);
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
        <div className="space-y-1 text-sm font-bold text-slate-700">
          <label className="block" htmlFor={`ai-credits-${user.id}`}>
            Créditos IA extra
          </label>
          <input
            id={`ai-credits-${user.id}`}
            type="number"
            min="0"
            value={unlimitedAi ? "" : aiCreditUnits}
            placeholder={unlimitedAi ? "Sin límite" : undefined}
            disabled={unlimitedAi}
            onChange={(event) =>
              setAiCreditUnits(coerceNonNegativeInteger(event.target.value))
            }
            className="min-h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-base font-semibold text-slate-900"
          />
          <span className="block text-xs font-semibold text-slate-500">
            {AI_UNITS_PER_SCAN} unidades = 1 escaneo extra.
          </span>
          <label className="mt-2 flex items-start gap-2 rounded-xl border border-blue-100 bg-blue-50 px-3 py-2 text-xs font-semibold text-slate-700">
            <input
              type="checkbox"
              checked={unlimitedAi}
              onChange={(event) => setUnlimitedAi(event.target.checked)}
              className="mt-0.5 h-4 w-4 rounded border-slate-300 text-blue-600"
            />
            <span>
              Sin límite IA/escaneos para pruebas. Permite también lotes de más de
              10 documentos.
            </span>
          </label>
        </div>
        <div className="rounded-2xl bg-slate-50 px-4 py-3 text-sm text-slate-700">
          <p className="font-bold text-slate-500">Créditos extra</p>
          <p className="text-lg font-bold text-slate-900">
            {formatAiScanCount(aiScanEquivalent)} escaneo(s) extra
          </p>
          <p className="mt-1 text-xs font-semibold text-slate-500">
            {unlimitedAi
              ? "La app no bloqueará ni descontará usos IA para esta cuenta."
              : `${manualAiCreditUnits.toLocaleString("es-ES")} unidades extra disponibles.`}
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
              {formatAiUnitCount(monthlyUsage.monthlyRemainingUnits)} de{" "}
              {formatAiUnitCount(monthlyUsage.monthlyIncludedUnits)} unidades
              del mes.
            </p>
          </div>
          <div className="grid gap-2 text-sm font-semibold text-slate-700 sm:grid-cols-3 lg:min-w-[34rem]">
            <div className="rounded-2xl bg-white px-4 py-3">
              <span className="block text-xs uppercase text-slate-500">Usadas</span>
              <span className="text-lg font-bold text-slate-900">
                {formatAiUnitCount(monthlyUsage.monthlyUsedUnits)}
              </span>
            </div>
            <div className="rounded-2xl bg-white px-4 py-3">
              <span className="block text-xs uppercase text-slate-500">Extra</span>
              <span className="text-lg font-bold text-slate-900">
                {formatAiUnitCount(monthlyUsage.extraUnits)}
              </span>
            </div>
            <div className="rounded-2xl bg-white px-4 py-3">
              <span className="block text-xs uppercase text-slate-500">Total</span>
              <span className="text-lg font-bold text-slate-900">
                {formatAiUnitCount(monthlyUsage.totalRemainingUnits)}
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

      <UserRestorePanel user={user} />
      {ADMIN_MFA_UI_ENABLED && <UserMfaRecoveryPanel user={user} />}

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

function HealthMetricCard({
  label,
  value,
  detail,
  Icon,
}: {
  label: string;
  value: string;
  detail: string;
  Icon: typeof Users;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4">
      <div className="flex items-center gap-2 text-slate-500">
        <Icon className="h-4 w-4" />
        <p className="text-sm font-bold">{label}</p>
      </div>
      <p className="mt-2 text-2xl font-bold text-slate-900">{value}</p>
      <p className="mt-1 text-sm text-slate-500">{detail}</p>
    </div>
  );
}

function HealthHourlyBars({ points }: { points: AdminHealthHourlyPoint[] }) {
  const visible = points.slice(-24);
  const maxValue = Math.max(
    1,
    ...visible.map((point) => point.syncUpdates + point.errors),
  );

  if (visible.length === 0) {
    return <p className="text-sm text-slate-500">Sin actividad por horas todavía.</p>;
  }

  return (
    <div className="space-y-3">
      <div className="flex h-24 items-end gap-1">
        {visible.map((point) => {
          const total = point.syncUpdates + point.errors;
          const height = Math.max(8, Math.round((total / maxValue) * 88));
          return (
            <div
              key={point.hour}
              className="flex min-w-0 flex-1 flex-col items-center justify-end"
              title={`${formatDateTime(point.hour)} · ${point.syncUpdates} sync · ${point.errors} errores`}
            >
              <div
                className={`w-full rounded-t-md ${
                  point.errors > 0 ? "bg-red-400" : "bg-sky-500"
                }`}
                style={{ height }}
              />
            </div>
          );
        })}
      </div>
      <div className="flex justify-between text-xs font-bold text-slate-400">
        <span>{hourLabel(visible[0]?.hour ?? new Date().toISOString())}</span>
        <span>{hourLabel(visible[visible.length - 1]?.hour ?? new Date().toISOString())}</span>
      </div>
      <div className="flex flex-wrap gap-3 text-xs font-bold text-slate-500">
        <span className="inline-flex items-center gap-1">
          <span className="h-2.5 w-2.5 rounded-full bg-sky-500" />
          Sync/API
        </span>
        <span className="inline-flex items-center gap-1">
          <span className="h-2.5 w-2.5 rounded-full bg-red-400" />
          Errores
        </span>
      </div>
    </div>
  );
}

function buildAdminSecurityLog(
  health: AdminHealthSnapshot,
  operations: AdminOperationsStatus | null,
) {
  const abuseLines =
    health.abuse.namespaces.length > 0
      ? health.abuse.namespaces.map(
          (item) =>
            `- ${item.namespace}|${item.level}|requests=${item.requests}|buckets=${item.buckets}|max=${item.maxRequests}|latest=${item.latestAt ?? "none"}`,
        )
      : ["- none"];

  return [
    "FACTU_SECURITY_HEALTH_V1",
    buildCodexHandoffBlock("admin_security_abuse"),
    `generatedAt=${health.generatedAt}`,
    `overall=${health.level}`,
    `headline=${health.headline}`,
    `activeUsers7d=${health.summary.activeUsers7d}`,
    `activeUsers30d=${health.summary.activeUsers30d}`,
    `syncRows=${health.summary.syncRows}`,
    `syncUpdates24h=${health.summary.syncUpdates24h}`,
    `errors24h=${health.summary.errors24h}`,
    `errors7d=${health.summary.errors7d}`,
    `abuse.level=${health.abuse.level}`,
    `abuse.label=${health.abuse.label}`,
    `abuse.totalRequests=${health.abuse.totalRequests}`,
    `abuse.totalBuckets=${health.abuse.totalBuckets}`,
    `abuse.latestAt=${health.abuse.latestAt ?? "none"}`,
    `waf.available=${operations?.firewall.available ?? "unknown"}`,
    `waf.enabled=${operations?.firewall.enabled ?? "unknown"}`,
    `waf.level=${operations?.firewall.level ?? "unknown"}`,
    `waf.botProtection=${operations?.firewall.botProtection ?? "unknown"}`,
    `waf.aiBots=${operations?.firewall.aiBots ?? "unknown"}`,
    `waf.events24h=${operations?.firewall.events24h ?? "unknown"}`,
    `waf.latestAt=${operations?.firewall.latestAt ?? "none"}`,
    "waf.eventsRedacted=",
    ...(operations?.firewall.events.length
      ? operations.firewall.events.map(
          (item) =>
            `- ${item.action}|host=${item.host}|count=${item.count}|latest=${item.latestAt ?? "none"}`,
        )
      : ["- none"]),
    "abuse.namespaces=",
    ...abuseLines,
    "recommendations=",
    ...(health.recommendations.length > 0
      ? health.recommendations.map((item) => `- ${item}`)
      : ["- none"]),
  ].join("\n");
}

function buildSupabaseOperationsLog(health: AdminHealthSnapshot) {
  const topUserLines =
    health.topUsers.length > 0
      ? health.topUsers.slice(0, 8).map((user, index) =>
          [
            `- user_${index + 1}`,
            `rows=${user.rowCount}`,
            `deleted=${user.deletedRows}`,
            `documents=${user.documentRows}`,
            `customers=${user.customerRows}`,
            `expenses=${user.expenseRows}`,
            `products=${user.productRows}`,
            `latestSync=${user.latestSyncAt ?? "none"}`,
          ].join("|"),
        )
      : ["- none"];
  const typeLines =
    health.entityTypes.length > 0
      ? health.entityTypes
          .slice(0, 12)
          .map((item) => `- ${item.type}|rows=${item.rows}|deleted=${item.deletedRows}`)
      : ["- none"];

  return [
    "FACTU_SUPABASE_OPERATIONS_V1",
    buildCodexHandoffBlock("admin_supabase_capacity_sync"),
    `generatedAt=${health.generatedAt}`,
    `overall=${health.level}`,
    `plan=${health.plan.supabasePlan}`,
    `compute=${health.plan.compute}`,
    `includedDatabaseGb=${health.plan.includedDatabaseGb}`,
    `comfortableActiveUsers=${health.plan.comfortableActiveUsers}`,
    `databaseBytes=${health.summary.databaseBytes}`,
    `databaseLimitBytes=${health.summary.databaseLimitBytes}`,
    `databaseUsedPercent=${health.summary.databaseUsedPercent}`,
    `totalUsers=${health.summary.totalUsers}`,
    `activeUsers7d=${health.summary.activeUsers7d}`,
    `activeUsers30d=${health.summary.activeUsers30d}`,
    `cloudUsers=${health.summary.cloudUsers}`,
    `syncRows=${health.summary.syncRows}`,
    `deletedRows=${health.summary.deletedRows}`,
    `syncUpdates24h=${health.summary.syncUpdates24h}`,
    `syncUpdates7d=${health.summary.syncUpdates7d}`,
    `syncActiveUsers24h=${health.summary.syncActiveUsers24h}`,
    `syncActiveUsers7d=${health.summary.syncActiveUsers7d}`,
    `latestSyncAt=${health.summary.latestSyncAt ?? "none"}`,
    "topUsersRedacted=",
    ...topUserLines,
    "entityTypes=",
    ...typeLines,
    "recommendations=",
    ...(health.recommendations.length > 0
      ? health.recommendations.map((item) => `- ${item}`)
      : ["- none"]),
  ].join("\n");
}

function buildVercelOperationsLog(
  vercel: AdminVercelUsageSnapshot | null,
  notice: string | null,
  operations: AdminOperationsStatus | null,
) {
  if (!vercel) {
    return [
      "FACTU_VERCEL_OPERATIONS_V1",
      buildCodexHandoffBlock("admin_vercel_usage"),
      `configured=${notice ? "partial_or_missing" : "unknown"}`,
      `notice=${notice ?? "none"}`,
      "status=no_snapshot",
      `operations=${operations?.level ?? "unavailable"}`,
    ].join("\n");
  }

  return [
    "FACTU_VERCEL_OPERATIONS_V1",
    buildCodexHandoffBlock("admin_vercel_usage"),
    `generatedAt=${vercel.generatedAt}`,
    `overall=${vercel.level}`,
    `headline=${vercel.headline}`,
    `periodFrom=${vercel.period.from}`,
    `periodTo=${vercel.period.to}`,
    `daysRemaining=${vercel.period.daysRemaining}`,
    `totalCostUsd=${vercel.summary.totalCostUsd}`,
    `creditUsedUsd=${vercel.summary.creditUsedUsd}`,
    `onDemandUsd=${vercel.summary.onDemandUsd}`,
    `creditUsedPercent=${vercel.summary.creditUsedPercent}`,
    `lineCount=${vercel.summary.lineCount}`,
    `primaryProjectSlug=${vercel.summary.primaryProjectSlug ?? "none"}`,
    `domain=${operations?.deployment.domain ?? "unknown"}`,
    `domain.level=${operations?.deployment.level ?? "unknown"}`,
    `domain.alignedWithMain=${operations?.deployment.alignedWithMain ?? "unknown"}`,
    `domain.pointsToLatest=${operations?.deployment.domainPointsToLatest ?? "unknown"}`,
    `domain.aliasDeployment=${operations?.deployment.aliasDeploymentId ?? "none"}`,
    `domain.latestDeployment=${operations?.deployment.latestDeploymentId ?? "none"}`,
    `domain.deployedSha=${operations?.deployment.deployedSha ?? "none"}`,
    `github.mainSha=${operations?.github.mainSha ?? "none"}`,
    `github.ci.status=${operations?.github.ci?.status ?? "unknown"}`,
    `github.ci.conclusion=${operations?.github.ci?.conclusion ?? "unknown"}`,
    `github.codeql.status=${operations?.github.codeql?.status ?? "unknown"}`,
    `github.codeql.conclusion=${operations?.github.codeql?.conclusion ?? "unknown"}`,
    `github.scheduler.level=${operations?.github.schedulerLevel ?? "unknown"}`,
    `github.scheduler.status=${operations?.github.scheduler?.status ?? "unknown"}`,
    `github.scheduler.conclusion=${operations?.github.scheduler?.conclusion ?? "unknown"}`,
    `github.scheduler.updatedAt=${operations?.github.scheduler?.updatedAt ?? "none"}`,
    `waf.enabled=${operations?.firewall.enabled ?? "unknown"}`,
    `waf.botProtection=${operations?.firewall.botProtection ?? "unknown"}`,
    `waf.aiBots=${operations?.firewall.aiBots ?? "unknown"}`,
    `waf.events24h=${operations?.firewall.events24h ?? "unknown"}`,
    "topProjects=",
    ...(vercel.topProjects.length > 0
      ? vercel.topProjects.map(
          (item) =>
            `- ${item.project}|costUsd=${item.costUsd}|sharePercent=${item.sharePercent}`,
        )
      : ["- none"]),
    "topResources=",
    ...(vercel.topResources.length > 0
      ? vercel.topResources.map(
          (item) =>
            `- ${item.label}|project=${item.project ?? "team"}|costUsd=${item.costUsd}|usage=${item.usageQuantity ?? "none"} ${item.usageUnit ?? ""}`.trim(),
        )
      : ["- none"]),
    "recommendations=",
    ...(vercel.recommendations.length > 0
      ? vercel.recommendations.map((item) => `- ${item}`)
      : ["- none"]),
  ].join("\n");
}

function buildAdminOperationsLog(
  operations: AdminOperationsStatus | null,
  notice: string | null,
) {
  if (!operations) {
    return [
      "FACTU_OPERATIONS_STATUS_V1",
      buildCodexHandoffBlock("admin_ci_deploy_domain_waf"),
      "status=unavailable",
      `notice=${notice ?? "none"}`,
    ].join("\n");
  }

  return [
    "FACTU_OPERATIONS_STATUS_V1",
    buildCodexHandoffBlock("admin_ci_deploy_domain_waf"),
    `generatedAt=${operations.generatedAt}`,
    `overall=${operations.level}`,
    `headline=${operations.headline}`,
    `github.level=${operations.github.level}`,
    `github.mainSha=${operations.github.mainSha ?? "none"}`,
    `github.mainUpdatedAt=${operations.github.mainUpdatedAt ?? "none"}`,
    `github.ci.status=${operations.github.ci?.status ?? "unknown"}`,
    `github.ci.conclusion=${operations.github.ci?.conclusion ?? "unknown"}`,
    `github.ci.run=${operations.github.ci?.id ?? "none"}`,
    `github.codeql.status=${operations.github.codeql?.status ?? "unknown"}`,
    `github.codeql.conclusion=${operations.github.codeql?.conclusion ?? "unknown"}`,
    `github.scheduler.level=${operations.github.schedulerLevel}`,
    `github.scheduler.status=${operations.github.scheduler?.status ?? "unknown"}`,
    `github.scheduler.conclusion=${operations.github.scheduler?.conclusion ?? "unknown"}`,
    `github.scheduler.run=${operations.github.scheduler?.id ?? "none"}`,
    `github.scheduler.updatedAt=${operations.github.scheduler?.updatedAt ?? "none"}`,
    `deployment.level=${operations.deployment.level}`,
    `deployment.domain=${operations.deployment.domain}`,
    `deployment.alignedWithMain=${operations.deployment.alignedWithMain ?? "unknown"}`,
    `deployment.domainPointsToLatest=${operations.deployment.domainPointsToLatest ?? "unknown"}`,
    `deployment.aliasId=${operations.deployment.aliasDeploymentId ?? "none"}`,
    `deployment.latestId=${operations.deployment.latestDeploymentId ?? "none"}`,
    `deployment.sha=${operations.deployment.deployedSha ?? "none"}`,
    `deployment.branch=${operations.deployment.branch ?? "none"}`,
    `deployment.createdAt=${operations.deployment.createdAt ?? "none"}`,
    `firewall.level=${operations.firewall.level}`,
    `firewall.available=${operations.firewall.available}`,
    `firewall.enabled=${operations.firewall.enabled}`,
    `firewall.botProtection=${operations.firewall.botProtection}`,
    `firewall.aiBots=${operations.firewall.aiBots}`,
    `firewall.events24h=${operations.firewall.events24h}`,
    `firewall.latestAt=${operations.firewall.latestAt ?? "none"}`,
    "firewall.eventsRedacted=",
    ...(operations.firewall.events.length
      ? operations.firewall.events.map(
          (item) =>
            `- ${item.action}|host=${item.host}|count=${item.count}|latest=${item.latestAt ?? "none"}`,
        )
      : ["- none"]),
    "recommendations=",
    ...(operations.recommendations.length
      ? operations.recommendations.map((item) => `- ${item}`)
      : ["- none"]),
  ].join("\n");
}

function buildAdminErrorsLog(errors: AdminErrorRow[]) {
  const errorLines =
    errors.length > 0
      ? errors.slice(0, 30).map((item) =>
          [
            `- severity=${item.severity}`,
            `area=${item.area}`,
            `code=${item.code ?? "none"}`,
            `route=${item.route ?? "none"}`,
            `createdAt=${item.created_at}`,
            `resolved=${item.resolved_at ? "yes" : "no"}`,
            `message=${item.message.slice(0, 240).replace(/\s+/g, " ")}`,
          ].join("|"),
        )
      : ["- none"];

  return [
    "FACTU_ADMIN_ERRORS_V1",
    buildCodexHandoffBlock("admin_recent_errors"),
    `generatedAt=${new Date().toISOString()}`,
    `errorCount=${errors.length}`,
    "errors=",
    ...errorLines,
  ].join("\n");
}

function HealthDashboard({ health }: { health: AdminHealthSnapshot }) {
  const tone = healthToneClasses(health.level);
  const topUsers = health.topUsers.slice(0, 6);
  const abuseTone = healthToneClasses(health.abuse.level);
  const securityLog = buildAdminSecurityLog(health, null);
  const [copiedSecurityLog, setCopiedSecurityLog] = useState(false);

  const copySecurityLog = useCallback(async () => {
    const ok = await copyTextToClipboard(securityLog);
    if (!ok) return;
    setCopiedSecurityLog(true);
    window.setTimeout(() => setCopiedSecurityLog(false), 2200);
  }, [securityLog]);

  return (
    <div className="space-y-4">
      <div className={`rounded-2xl border p-4 ${tone.panel}`}>
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-start gap-3">
            <div className={`rounded-2xl p-3 ${tone.badge}`}>
              {health.level === "action" ? (
                <AlertTriangle className="h-5 w-5" />
              ) : (
                <Gauge className="h-5 w-5" />
              )}
            </div>
            <div>
              <p className="text-sm font-bold uppercase tracking-wide">
                Estado general · {health.label}
              </p>
              <p className="mt-1 text-xl font-black">{health.headline}</p>
              <p className="mt-1 text-sm">
                Supabase {health.plan.supabasePlan} · {health.plan.compute} ·{" "}
                {health.plan.includedDatabaseGb} GB incluidos
              </p>
            </div>
          </div>
          <div className="rounded-2xl bg-white/70 px-4 py-3 text-sm font-bold">
            Actualizado: {formatDateTime(health.generatedAt)}
          </div>
        </div>
      </div>

      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        {health.checks.map((check) => {
          const checkTone = healthToneClasses(check.level);
          return (
            <div key={check.id} className="rounded-2xl border border-slate-200 bg-white p-4">
              <div className="flex items-center justify-between gap-2">
                <p className="text-sm font-bold text-slate-500">{check.label}</p>
                <span className={`rounded-full px-2.5 py-1 text-xs font-bold ${checkTone.soft}`}>
                  {check.level === "action"
                    ? "Actuar"
                    : check.level === "watch"
                      ? "Vigilar"
                      : "OK"}
                </span>
              </div>
              <p className="mt-2 text-2xl font-black text-slate-900">{check.value}</p>
              <p className="mt-1 text-sm text-slate-500">{check.detail}</p>
            </div>
          );
        })}
      </div>

      <div className={`rounded-2xl border p-4 ${abuseTone.panel}`}>
        <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
          <div className="flex items-start gap-3">
            <div className={`rounded-2xl p-3 ${abuseTone.badge}`}>
              {health.abuse.level === "action" ? (
                <AlertTriangle className="h-5 w-5" />
              ) : (
                <ShieldCheck className="h-5 w-5" />
              )}
            </div>
            <div>
              <p className="text-sm font-bold uppercase tracking-wide">
                Abuso, scraping y extracción · {health.abuse.label}
              </p>
              <p className="mt-1 text-lg font-black">{health.abuse.headline}</p>
              <p className="mt-1 text-sm">
                {formatInteger(health.abuse.totalRequests)} golpes en{" "}
                {formatInteger(health.abuse.totalBuckets)} contador(es) recientes
              </p>
            </div>
          </div>
          <Button
            type="button"
            variant="secondary"
            onClick={() => void copySecurityLog()}
            className="min-h-10 px-4 text-sm"
          >
            <Clipboard className="h-4 w-4" />
            {copiedSecurityLog ? "Copiado" : "Copiar log"}
          </Button>
        </div>

        <div className="mt-4 grid gap-3 lg:grid-cols-[minmax(0,1fr)_minmax(280px,420px)]">
          <div className="space-y-2">
            {health.abuse.namespaces.length === 0 && (
              <p className="rounded-2xl bg-white/70 px-3 py-2 text-sm font-bold">
                Sin señales en rutas protegidas.
              </p>
            )}
            {health.abuse.namespaces.map((item) => {
              const itemTone = healthToneClasses(item.level);
              return (
                <div
                  key={item.namespace}
                  className="rounded-2xl bg-white/75 px-3 py-2"
                >
                  <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                    <p className="text-sm font-black">{item.label}</p>
                    <span
                      className={`w-fit rounded-full px-2.5 py-1 text-xs font-bold ${itemTone.soft}`}
                    >
                      {item.level === "action"
                        ? "Actuar"
                        : item.level === "watch"
                          ? "Vigilar"
                          : "OK"}
                    </span>
                  </div>
                  <p className="mt-1 text-xs font-semibold opacity-75">
                    {formatInteger(item.requests)} golpes · {item.detail} ·{" "}
                    {formatDateTime(item.latestAt)}
                  </p>
                </div>
              );
            })}
          </div>
          <pre className="max-h-64 overflow-auto whitespace-pre-wrap rounded-2xl bg-slate-950 p-3 text-xs font-semibold text-slate-100">
            {securityLog}
          </pre>
        </div>
      </div>

      <div className="grid gap-3 lg:grid-cols-4">
        <HealthMetricCard
          Icon={Users}
          label="Usuarios activos"
          value={`${formatInteger(health.summary.activeUsers7d)} / ${formatInteger(
            health.summary.activeUsers30d,
          )}`}
          detail="7 días / 30 días"
        />
        <HealthMetricCard
          Icon={Database}
          label="Filas cloud"
          value={formatInteger(health.summary.syncRows)}
          detail={`${formatInteger(health.summary.deletedRows)} borradas lógicas`}
        />
        <HealthMetricCard
          Icon={HardDrive}
          label="Base Postgres"
          value={formatBytes(health.summary.databaseBytes)}
          detail={`${formatPercent(health.summary.databaseUsedPercent)} de ${formatBytes(
            health.summary.databaseLimitBytes,
          )}`}
        />
        <HealthMetricCard
          Icon={TrendingUp}
          label="Actividad 24h"
          value={formatInteger(health.summary.syncUpdates24h)}
          detail={`${formatInteger(health.summary.syncActiveUsers24h)} usuario(s) con sync`}
        />
      </div>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1.15fr)_minmax(0,0.85fr)]">
        <div className="rounded-2xl border border-slate-200 bg-white p-4">
          <div className="mb-3 flex items-center gap-2">
            <BarChart3 className="h-4 w-4 text-slate-500" />
            <h3 className="font-bold text-slate-900">Picos últimas 24h</h3>
          </div>
          <HealthHourlyBars points={health.hourly} />
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-4">
          <div className="mb-3 flex items-center gap-2">
            <Activity className="h-4 w-4 text-slate-500" />
            <h3 className="font-bold text-slate-900">Señales rápidas</h3>
          </div>
          <div className="space-y-3 text-sm">
            <div className="flex items-center justify-between gap-3">
              <span className="text-slate-500">Usuarios cloud</span>
              <span className="font-bold text-slate-900">
                {formatInteger(health.summary.cloudUsers)}
              </span>
            </div>
            <div className="flex items-center justify-between gap-3">
              <span className="text-slate-500">Último sync</span>
              <span className="font-bold text-slate-900">
                {formatDateTime(health.summary.latestSyncAt)}
              </span>
            </div>
            <div className="flex items-center justify-between gap-3">
              <span className="text-slate-500">Errores 24h / 7d</span>
              <span className="font-bold text-slate-900">
                {formatInteger(health.summary.errors24h)} /{" "}
                {formatInteger(health.summary.errors7d)}
              </span>
            </div>
            <div className="flex items-center justify-between gap-3">
              <span className="text-slate-500">IA mes</span>
              <span className="font-bold text-slate-900">
                {formatInteger(health.summary.expenseScansThisMonth)} escaneos
              </span>
            </div>
          </div>
          <div className="mt-4 space-y-2">
            {health.recommendations.map((item) => (
              <p key={item} className={`rounded-2xl px-3 py-2 text-sm font-bold ${tone.soft}`}>
                {item}
              </p>
            ))}
          </div>
        </div>
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <div className="rounded-2xl border border-slate-200 bg-white p-4">
          <h3 className="mb-3 font-bold text-slate-900">Usuarios que más pesan</h3>
          <div className="space-y-3">
            {topUsers.length === 0 && (
              <p className="text-sm text-slate-500">Sin datos cloud todavía.</p>
            )}
            {topUsers.map((user) => (
              <div
                key={user.userId || user.email}
                className="rounded-2xl bg-slate-50 p-3"
              >
                <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                  <p className="break-all text-sm font-bold text-slate-900">
                    {user.email}
                  </p>
                  <p className="text-sm font-black text-slate-900">
                    {formatInteger(user.rowCount)} filas
                  </p>
                </div>
                <p className="mt-1 text-xs font-semibold text-slate-500">
                  Doc. {formatInteger(user.documentRows)} · Clientes{" "}
                  {formatInteger(user.customerRows)} · Gastos{" "}
                  {formatInteger(user.expenseRows)} · Productos{" "}
                  {formatInteger(user.productRows)} · Sync{" "}
                  {formatDateTime(user.latestSyncAt)}
                </p>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-4">
          <h3 className="mb-3 font-bold text-slate-900">Tipos de datos</h3>
          <div className="space-y-3">
            {health.entityTypes.length === 0 && (
              <p className="text-sm text-slate-500">Sin filas cloud todavía.</p>
            )}
            {health.entityTypes.slice(0, 8).map((item) => {
              const width =
                health.summary.syncRows > 0
                  ? Math.max(4, Math.round((item.rows / health.summary.syncRows) * 100))
                  : 0;
              return (
                <div key={item.type} className="space-y-1">
                  <div className="flex items-center justify-between gap-3 text-sm">
                    <span className="font-bold text-slate-700">{item.type}</span>
                    <span className="font-bold text-slate-900">
                      {formatInteger(item.rows)}
                    </span>
                  </div>
                  <div className="h-2 rounded-full bg-slate-100">
                    <div
                      className="h-2 rounded-full bg-sky-500"
                      style={{ width: `${width}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

function SupabaseDashboard({ health }: { health: AdminHealthSnapshot }) {
  const tone = healthToneClasses(health.level);
  const topUsers = health.topUsers.slice(0, 8);
  const supabaseLog = buildSupabaseOperationsLog(health);

  return (
    <div className="space-y-4">
      <div className={`rounded-2xl border p-4 ${tone.panel}`}>
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-start gap-3">
            <div className={`rounded-2xl p-3 ${tone.badge}`}>
              <Database className="h-5 w-5" />
            </div>
            <div>
              <p className="text-sm font-bold uppercase tracking-wide">
                Supabase · {health.label}
              </p>
              <p className="mt-1 text-xl font-black">{health.headline}</p>
              <p className="mt-1 text-sm">
                {health.plan.supabasePlan} · {health.plan.compute} ·{" "}
                {health.plan.includedDatabaseGb} GB incluidos
              </p>
            </div>
          </div>
          <div className="rounded-2xl bg-white/70 px-4 py-3 text-sm font-bold">
            Actualizado: {formatDateTime(health.generatedAt)}
          </div>
        </div>
      </div>

      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <HealthMetricCard
          Icon={HardDrive}
          label="Base Postgres"
          value={formatBytes(health.summary.databaseBytes)}
          detail={`${formatPercent(health.summary.databaseUsedPercent)} de ${formatBytes(
            health.summary.databaseLimitBytes,
          )}`}
        />
        <HealthMetricCard
          Icon={Users}
          label="Usuarios activos"
          value={`${formatInteger(health.summary.activeUsers7d)} / ${formatInteger(
            health.summary.activeUsers30d,
          )}`}
          detail="7 días / 30 días"
        />
        <HealthMetricCard
          Icon={Database}
          label="Filas cloud"
          value={formatInteger(health.summary.syncRows)}
          detail={`${formatInteger(health.summary.deletedRows)} borradas lógicas`}
        />
        <HealthMetricCard
          Icon={TrendingUp}
          label="Sync 24h"
          value={formatInteger(health.summary.syncUpdates24h)}
          detail={`${formatInteger(health.summary.syncActiveUsers24h)} usuario(s) activos`}
        />
      </div>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(0,0.9fr)]">
        <div className="rounded-2xl border border-slate-200 bg-white p-4">
          <div className="mb-3 flex items-center gap-2">
            <BarChart3 className="h-4 w-4 text-slate-500" />
            <h3 className="font-bold text-slate-900">Actividad cloud por horas</h3>
          </div>
          <HealthHourlyBars points={health.hourly} />
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-4">
          <div className="mb-3 flex items-center gap-2">
            <Activity className="h-4 w-4 text-slate-500" />
            <h3 className="font-bold text-slate-900">Estado rápido</h3>
          </div>
          <div className="space-y-3 text-sm">
            <div className="flex items-center justify-between gap-3">
              <span className="text-slate-500">Usuarios cloud</span>
              <span className="font-bold text-slate-900">
                {formatInteger(health.summary.cloudUsers)}
              </span>
            </div>
            <div className="flex items-center justify-between gap-3">
              <span className="text-slate-500">Último sync</span>
              <span className="font-bold text-slate-900">
                {formatDateTime(health.summary.latestSyncAt)}
              </span>
            </div>
            <div className="flex items-center justify-between gap-3">
              <span className="text-slate-500">Actualizaciones 7d</span>
              <span className="font-bold text-slate-900">
                {formatInteger(health.summary.syncUpdates7d)}
              </span>
            </div>
            <div className="flex items-center justify-between gap-3">
              <span className="text-slate-500">Uso IA mes</span>
              <span className="font-bold text-slate-900">
                {formatInteger(health.summary.expenseScansThisMonth)} escaneos
              </span>
            </div>
          </div>
          <div className="mt-4 space-y-2">
            {health.recommendations.map((item) => (
              <p key={item} className={`rounded-2xl px-3 py-2 text-sm font-bold ${tone.soft}`}>
                {item}
              </p>
            ))}
          </div>
        </div>
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <div className="rounded-2xl border border-slate-200 bg-white p-4">
          <h3 className="mb-3 font-bold text-slate-900">Usuarios que más pesan</h3>
          <div className="space-y-3">
            {topUsers.length === 0 && (
              <p className="text-sm text-slate-500">Sin datos cloud todavía.</p>
            )}
            {topUsers.map((user) => (
              <div key={user.userId || user.email} className="rounded-2xl bg-slate-50 p-3">
                <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                  <p className="break-all text-sm font-bold text-slate-900">
                    {user.email}
                  </p>
                  <p className="text-sm font-black text-slate-900">
                    {formatInteger(user.rowCount)} filas
                  </p>
                </div>
                <p className="mt-1 text-xs font-semibold text-slate-500">
                  Doc. {formatInteger(user.documentRows)} · Clientes{" "}
                  {formatInteger(user.customerRows)} · Gastos{" "}
                  {formatInteger(user.expenseRows)} · Productos{" "}
                  {formatInteger(user.productRows)} · Sync{" "}
                  {formatDateTime(user.latestSyncAt)}
                </p>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-4">
          <h3 className="mb-3 font-bold text-slate-900">Tipos de datos</h3>
          <div className="space-y-3">
            {health.entityTypes.length === 0 && (
              <p className="text-sm text-slate-500">Sin filas cloud todavía.</p>
            )}
            {health.entityTypes.slice(0, 10).map((item) => {
              const width =
                health.summary.syncRows > 0
                  ? Math.max(4, Math.round((item.rows / health.summary.syncRows) * 100))
                  : 0;
              return (
                <div key={item.type} className="space-y-1">
                  <div className="flex items-center justify-between gap-3 text-sm">
                    <span className="font-bold text-slate-700">{item.type}</span>
                    <span className="font-bold text-slate-900">
                      {formatInteger(item.rows)}
                    </span>
                  </div>
                  <div className="h-2 rounded-full bg-slate-100">
                    <div className="h-2 rounded-full bg-sky-500" style={{ width: `${width}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <CopyableLogPanel
        title="Log Supabase para Codex"
        description="Incluye capacidad, sync y contexto operativo sin emails ni tokens en el bloque copiable."
        log={supabaseLog}
      />
    </div>
  );
}

function operationsRunLabel(run: AdminOperationsStatus["github"]["ci"]): string {
  if (!run) return "Sin confirmar";
  if (run.status !== "completed") return "En curso";
  return run.conclusion === "success" ? "Correcto" : "Falló";
}

function deploymentAlignmentLabel(
  value: boolean | null,
): string {
  return value === true ? "Al día" : value === false ? "Desfasado" : "Sin confirmar";
}

function firewallModeLabel(mode: string): string {
  if (mode === "log") return "Registro";
  if (mode === "challenge") return "Reto";
  if (mode === "deny") return "Bloqueo";
  if (mode === "off") return "Apagado";
  return mode;
}

function OperationsStatusDashboard({
  operations,
  notice,
}: {
  operations: AdminOperationsStatus | null;
  notice: string | null;
}) {
  const operationsLog = buildAdminOperationsLog(operations, notice);
  if (!operations) {
    return (
      <div className="space-y-4">
        <Card className="border-amber-200 bg-amber-50 text-amber-900">
          {notice ?? "No se pudo confirmar el estado externo del proyecto."}
        </Card>
        <CopyableLogPanel
          title="Log operativo para Codex"
          description="Incluye el contexto necesario para revisar por qué no están disponibles GitHub o Vercel."
          log={operationsLog}
        />
      </div>
    );
  }

  const tone = healthToneClasses(operations.level);
  return (
    <div className="space-y-4">
      <div className={`rounded-2xl border p-4 ${tone.panel}`}>
        <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
          <div className="flex items-start gap-3">
            <div className={`rounded-2xl p-3 ${tone.badge}`}>
              {operations.level === "action" ? (
                <AlertTriangle className="h-5 w-5" />
              ) : (
                <Activity className="h-5 w-5" />
              )}
            </div>
            <div>
              <p className="text-sm font-bold uppercase tracking-wide">
                Producción y controles externos · {operations.label}
              </p>
              <p className="mt-1 text-xl font-black">{operations.headline}</p>
              <p className="mt-1 text-sm">
                GitHub, CI, dominio real, deployment y Firewall en una sola comprobación.
              </p>
            </div>
          </div>
          <div className="rounded-2xl bg-white/70 px-4 py-3 text-sm font-bold">
            Actualizado: {formatDateTime(operations.generatedAt)}
          </div>
        </div>

        <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-5">
          <HealthMetricCard
            Icon={Cloud}
            label="Dominio"
            value={deploymentAlignmentLabel(operations.deployment.alignedWithMain)}
            detail={
              operations.deployment.domainPointsToLatest === true
                ? "apunta al último deployment listo"
                : operations.deployment.domainPointsToLatest === false
                  ? "apunta a un deployment anterior"
                  : "no se pudo comparar el alias"
            }
          />
          <HealthMetricCard
            Icon={Activity}
            label="GitHub CI"
            value={operationsRunLabel(operations.github.ci)}
            detail={`CodeQL: ${operationsRunLabel(operations.github.codeql)}`}
          />
          <HealthMetricCard
            Icon={Mail}
            label="Alertas automáticas"
            value={operationsRunLabel(operations.github.scheduler)}
            detail={
              operations.github.scheduler?.updatedAt
                ? `última ${formatDateTime(operations.github.scheduler.updatedAt)}`
                : "sin ejecución confirmada"
            }
          />
          <HealthMetricCard
            Icon={ShieldCheck}
            label="Vigilancia bots"
            value={`${firewallModeLabel(operations.firewall.botProtection)} / ${firewallModeLabel(
              operations.firewall.aiBots,
            )}`}
            detail="bots de navegador / bots de IA"
          />
          <HealthMetricCard
            Icon={Siren}
            label="Eventos WAF 24h"
            value={formatInteger(operations.firewall.events24h)}
            detail={
              operations.firewall.latestAt
                ? `último ${formatDateTime(operations.firewall.latestAt)}`
                : "sin eventos registrados"
            }
          />
        </div>

        {(operations.firewall.events.length > 0 ||
          operations.recommendations.length > 0) && (
          <div className="mt-4 grid gap-4 xl:grid-cols-2">
            <div className="rounded-2xl bg-white/75 p-4">
              <h3 className="font-bold text-slate-900">Actividad del Firewall</h3>
              <div className="mt-3 space-y-2">
                {operations.firewall.events.length === 0 && (
                  <p className="text-sm font-semibold text-slate-500">
                    Sin actividad de bots registrada en las últimas 24 horas.
                  </p>
                )}
                {operations.firewall.events.map((item) => (
                  <div key={`${item.action}-${item.host}`} className="rounded-xl bg-slate-50 p-3">
                    <div className="flex items-center justify-between gap-3">
                      <p className="min-w-0 break-all text-sm font-bold text-slate-800">
                        {item.action} · {item.host}
                      </p>
                      <span className="shrink-0 text-sm font-black text-slate-900">
                        {formatInteger(item.count)}
                      </span>
                    </div>
                    <p className="mt-1 text-xs font-semibold text-slate-500">
                      Último: {formatDateTime(item.latestAt)} · sin mostrar IPs
                    </p>
                  </div>
                ))}
              </div>
            </div>
            <div className="rounded-2xl bg-white/75 p-4">
              <h3 className="font-bold text-slate-900">Qué conviene hacer</h3>
              <div className="mt-3 space-y-2">
                {operations.recommendations.map((item) => (
                  <p key={item} className={`rounded-xl px-3 py-2 text-sm font-bold ${tone.soft}`}>
                    {item}
                  </p>
                ))}
              </div>
            </div>
          </div>
        )}
        {notice && <p className="mt-3 text-sm font-semibold">{notice}</p>}
      </div>

      <CopyableLogPanel
        title="Log operativo para Codex"
        description="Compara main, CI, dominio, deployment y WAF sin incluir tokens ni direcciones IP."
        log={operationsLog}
      />
    </div>
  );
}

function SecurityDashboard({
  health,
  operations,
}: {
  health: AdminHealthSnapshot;
  operations: AdminOperationsStatus | null;
}) {
  const securityLevel = highestAdminLevel([
    health.abuse.level,
    operations?.firewall.level ?? "ok",
  ]);
  const abuseTone = healthToneClasses(securityLevel);
  const securityLog = buildAdminSecurityLog(health, operations);
  const externalFirewallLeads =
    operations &&
    adminLevelRank(operations.firewall.level) > adminLevelRank(health.abuse.level);
  const securityLabel = externalFirewallLeads
    ? operations.firewall.level === "action"
      ? "Actuar"
      : "Vigilar"
    : health.abuse.label;
  const securityHeadline = externalFirewallLeads
    ? "Vercel ha registrado actividad de bots que conviene revisar."
    : health.abuse.headline;

  return (
    <div className="space-y-4">
      <div className={`rounded-2xl border p-4 ${abuseTone.panel}`}>
        <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
          <div className="flex items-start gap-3">
            <div className={`rounded-2xl p-3 ${abuseTone.badge}`}>
              {health.abuse.level === "action" ? (
                <AlertTriangle className="h-5 w-5" />
              ) : (
                <ShieldCheck className="h-5 w-5" />
              )}
            </div>
            <div>
              <p className="text-sm font-bold uppercase tracking-wide">
                Abuso, scraping y extracción · {securityLabel}
              </p>
              <p className="mt-1 text-xl font-black">{securityHeadline}</p>
              <p className="mt-1 text-sm">
                {formatInteger(health.abuse.totalRequests)} golpes en{" "}
                {formatInteger(health.abuse.totalBuckets)} contador(es) internos ·{" "}
                {formatInteger(operations?.firewall.events24h ?? 0)} evento(s) WAF
              </p>
            </div>
          </div>
          <div className="rounded-2xl bg-white/70 px-4 py-3 text-sm font-bold">
            Última señal: {formatDateTime(health.abuse.latestAt)}
          </div>
        </div>
      </div>

      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <HealthMetricCard
          Icon={ShieldCheck}
          label="Estado abuso"
          value={health.abuse.label}
          detail={health.abuse.headline}
        />
        <HealthMetricCard
          Icon={Cloud}
          label="Firewall Vercel"
          value={operations?.firewall.enabled ? "Activo" : "Sin confirmar"}
          detail={
            operations
              ? `${firewallModeLabel(operations.firewall.botProtection)} bots · ${formatInteger(
                  operations.firewall.events24h,
                )} eventos/24h`
              : "estado externo no disponible"
          }
        />
        <HealthMetricCard
          Icon={Siren}
          label="Errores 24h"
          value={formatInteger(health.summary.errors24h)}
          detail={`${formatInteger(health.summary.errors7d)} errores en 7 días`}
        />
        <HealthMetricCard
          Icon={Gauge}
          label="CSP y rate limit"
          value={formatInteger(health.abuse.totalRequests)}
          detail="golpes recientes registrados en rutas protegidas"
        />
      </div>

      <div className="grid gap-3 xl:grid-cols-2">
        {health.abuse.namespaces.length === 0 && (
          <div className="rounded-2xl border border-slate-200 bg-white p-4 text-sm font-bold text-slate-600">
            Sin señales en rutas protegidas.
          </div>
        )}
        {health.abuse.namespaces.map((item) => {
          const itemTone = healthToneClasses(item.level);
          return (
            <div key={item.namespace} className="rounded-2xl border border-slate-200 bg-white p-4">
              <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-sm font-black text-slate-900">{item.label}</p>
                <span className={`w-fit rounded-full px-2.5 py-1 text-xs font-bold ${itemTone.soft}`}>
                  {item.level === "action"
                    ? "Actuar"
                    : item.level === "watch"
                      ? "Vigilar"
                      : "OK"}
                </span>
              </div>
              <p className="mt-1 text-xs font-semibold text-slate-500">
                {formatInteger(item.requests)} golpes · {item.detail} ·{" "}
                {formatDateTime(item.latestAt)}
              </p>
            </div>
          );
        })}
      </div>

      <CopyableLogPanel
        title="Log seguridad para Codex"
        description="Pensado para investigar scraping, extracción, abusos, CSP y rate limits sin copiar IPs, tokens ni emails."
        log={securityLog}
      />
    </div>
  );
}

function VercelUsageDashboard({
  vercel,
  notice,
  operations,
}: {
  vercel: AdminVercelUsageSnapshot | null;
  notice: string | null;
  operations: AdminOperationsStatus | null;
}) {
  if (!vercel) {
    return notice ? (
      <div className="space-y-4">
        <Card className="border-blue-100 bg-blue-50 text-blue-900">
          {notice}
        </Card>
        <CopyableLogPanel
          title="Log Vercel para Codex"
          description="Incluye el estado de conexión del panel Vercel y las instrucciones seguras de actuación."
          log={buildVercelOperationsLog(null, notice, operations)}
        />
      </div>
    ) : null;
  }

  const tone = healthToneClasses(vercel.level);
  const creditWidth = Math.min(100, Math.max(4, vercel.summary.creditUsedPercent));
  const vercelLog = buildVercelOperationsLog(vercel, notice, operations);

  return (
    <div className="space-y-4">
      <div className={`rounded-2xl border p-4 ${tone.panel}`}>
        <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
          <div className="flex items-start gap-3">
            <div className={`rounded-2xl p-3 ${tone.badge}`}>
              {vercel.level === "action" ? (
                <AlertTriangle className="h-5 w-5" />
              ) : (
                <Cloud className="h-5 w-5" />
              )}
            </div>
            <div>
              <p className="text-sm font-bold uppercase tracking-wide">
                Vercel Pro · {vercel.label}
              </p>
              <p className="mt-1 text-xl font-black">{vercel.headline}</p>
              <p className="mt-1 text-sm">
                Ciclo {formatDateTime(vercel.period.from)} -{" "}
                {formatDateTime(vercel.period.to)} · {vercel.period.daysRemaining} dia(s)
                restantes
              </p>
            </div>
          </div>
          <div className="rounded-2xl bg-white/70 px-4 py-3 text-sm font-bold">
            Actualizado: {formatDateTime(vercel.generatedAt)}
          </div>
        </div>

        <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          <HealthMetricCard
            Icon={CreditCard}
            label="Coste ciclo"
            value={formatUsd(vercel.summary.totalCostUsd)}
            detail={`${formatInteger(vercel.summary.lineCount)} línea(s) de uso`}
          />
          <HealthMetricCard
            Icon={Gauge}
            label="Crédito incluido"
            value={`${formatUsd(vercel.summary.creditUsedUsd)} / ${formatUsd(
              vercel.plan.monthlyCreditUsd,
            )}`}
            detail={`${formatPercent(vercel.summary.creditUsedPercent)} consumido`}
          />
          <HealthMetricCard
            Icon={TrendingUp}
            label="Bajo demanda"
            value={formatUsd(vercel.summary.onDemandUsd)}
            detail={
              vercel.summary.onDemandUsd > 0
                ? "ya hay coste fuera del crédito"
                : "sin coste fuera del crédito"
            }
          />
          <HealthMetricCard
            Icon={Cloud}
            label="Incluido Pro"
            value={`${formatInteger(vercel.plan.includedEdgeRequests / 1_000_000)}M req.`}
            detail={`${formatInteger(vercel.plan.includedFastDataTransferGb)} GB transferencia`}
          />
        </div>

        <div className="mt-4 h-2 overflow-hidden rounded-full bg-white/70">
          <div className={`h-full ${tone.bar}`} style={{ width: `${creditWidth}%` }} />
        </div>

        <div className="mt-4 grid gap-4 xl:grid-cols-2">
          <div className="rounded-2xl bg-white/75 p-4">
            <h3 className="font-bold text-slate-900">Recursos que más consumen</h3>
            <div className="mt-3 space-y-3">
              {vercel.topResources.length === 0 && (
                <p className="text-sm font-semibold text-slate-500">
                  Sin consumo registrado en el ciclo.
                </p>
              )}
              {vercel.topResources.map((item) => {
                const quantity = formatUsageQuantity(
                  item.usageQuantity,
                  item.usageUnit,
                );
                return (
                  <div key={item.id} className="space-y-1">
                    <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                      <div>
                        <p className="text-sm font-black text-slate-900">
                          {item.label}
                        </p>
                        <p className="text-xs font-semibold text-slate-500">
                          {item.project ?? "Equipo completo"}
                          {quantity ? ` · ${quantity}` : ""}
                        </p>
                      </div>
                      <p className="text-sm font-black text-slate-900">
                        {formatUsd(item.costUsd)}
                      </p>
                    </div>
                    <div className="h-2 rounded-full bg-slate-100">
                      <div
                        className={`h-2 rounded-full ${tone.bar}`}
                        style={{ width: `${Math.max(4, item.sharePercent)}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="rounded-2xl bg-white/75 p-4">
            <h3 className="font-bold text-slate-900">Proyectos y avisos</h3>
            <div className="mt-3 space-y-3">
              {vercel.topProjects.length === 0 && (
                <p className="text-sm font-semibold text-slate-500">
                  La API no ha devuelto desglose por proyecto.
                </p>
              )}
              {vercel.topProjects.map((item) => (
                <div key={item.project} className="space-y-1">
                  <div className="flex items-center justify-between gap-3 text-sm">
                    <span className="break-all font-bold text-slate-700">
                      {item.project}
                    </span>
                    <span className="font-black text-slate-900">
                      {formatUsd(item.costUsd)}
                    </span>
                  </div>
                  <div className="h-2 rounded-full bg-slate-100">
                    <div
                      className={`h-2 rounded-full ${tone.bar}`}
                      style={{ width: `${Math.max(4, item.sharePercent)}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-4 space-y-2">
              {vercel.recommendations.map((item) => (
                <p key={item} className={`rounded-2xl px-3 py-2 text-sm font-bold ${tone.soft}`}>
                  {item}
                </p>
              ))}
            </div>
          </div>
        </div>

        {notice && <p className="mt-3 text-sm font-semibold">{notice}</p>}
      </div>

      <CopyableLogPanel
        title="Log Vercel para Codex"
        description="Incluye coste, proyectos y contexto de despliegue sin copiar el token privado."
        log={vercelLog}
      />
    </div>
  );
}

function ErrorsListDashboard({ errors }: { errors: AdminErrorRow[] }) {
  const errorsLog = buildAdminErrorsLog(errors);

  return (
    <div className="space-y-4">
      <CopyableLogPanel
        title="Log de errores para Codex"
        description="Lista eventos recientes saneados y contexto de actuación para diagnosticar sin ver secretos."
        log={errorsLog}
      />

      {errors.length === 0 && (
        <Card className="text-slate-600">Sin errores registrados.</Card>
      )}
      {errors.map((item) => (
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
    </div>
  );
}

function OperationsPanel({
  section,
  onSignalsLoaded,
}: {
  section: OperationsSection;
  onSignalsLoaded?: (signals: AdminSectionSignals) => void;
}) {
  const [errors, setErrors] = useState<AdminErrorRow[]>([]);
  const [health, setHealth] = useState<AdminHealthSnapshot | null>(null);
  const [calendarHealth, setCalendarHealth] =
    useState<FiscalCalendarAdminHealth | null>(null);
  const [fiscalWatch, setFiscalWatch] =
    useState<FiscalWatchAdminStatus | null>(null);
  const [fiscalWatchReviewStoreAvailable, setFiscalWatchReviewStoreAvailable] =
    useState(false);
  const [reviewingFiscalWatchIssue, setReviewingFiscalWatchIssue] = useState<
    string | null
  >(null);
  const [vercel, setVercel] = useState<AdminVercelUsageSnapshot | null>(null);
  const [operations, setOperations] = useState<AdminOperationsStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [healthNotice, setHealthNotice] = useState<string | null>(null);
  const [calendarHealthNotice, setCalendarHealthNotice] = useState<
    string | null
  >(null);
  const [fiscalWatchNotice, setFiscalWatchNotice] = useState<string | null>(
    null,
  );
  const [vercelNotice, setVercelNotice] = useState<string | null>(null);
  const [operationsNotice, setOperationsNotice] = useState<string | null>(null);

  const loadOperations = useCallback(async () => {
    setLoading(true);
    setErrors([]);
    setHealth(null);
    setCalendarHealth(null);
    setFiscalWatch(null);
    setFiscalWatchReviewStoreAvailable(false);
    setVercel(null);
    setOperations(null);
    setError(null);
    setNotice(null);
    setHealthNotice(null);
    setCalendarHealthNotice(null);
    setFiscalWatchNotice(null);
    setVercelNotice(null);
    setOperationsNotice(null);
    const token = await getAccessToken();
    if (!token) {
      setError("Inicia sesión con una cuenta administradora.");
      setLoading(false);
      return;
    }

    const headers = { Authorization: `Bearer ${token}` };
    const [
      errorsResponse,
      healthResponse,
      vercelResponse,
      operationsResponse,
      calendarHealthResponse,
      fiscalWatchResponse,
    ] = await Promise.all([
      fetchAdminResponse("/api/admin/errors?limit=80", { headers }),
      fetchAdminResponse("/api/admin/health", { headers }),
      fetchAdminResponse("/api/admin/vercel-usage", { headers }),
      fetchAdminResponse("/api/admin/operations-status", { headers }),
      fetchAdminResponse("/api/admin/fiscal-calendar-health", { headers }),
      fetchAdminResponse("/api/admin/fiscal-watch", { headers }),
    ]);

    const calendarHealthBody = calendarHealthResponse
      ? await readAdminJsonResponse<AdminFiscalCalendarHealthResponse>(
          calendarHealthResponse,
        )
      : {};
    let nextCalendarHealth: FiscalCalendarAdminHealth | null = null;
    const calendarHealthProbeFailed = !calendarHealthResponse?.ok;
    if (calendarHealthProbeFailed) {
      setCalendarHealth(null);
      setCalendarHealthNotice(
        calendarHealthBody.error ??
          "No se pudo comprobar el calendario fiscal de la AEAT.",
      );
    } else {
      nextCalendarHealth = calendarHealthBody.health ?? null;
      setCalendarHealth(nextCalendarHealth);
      setCalendarHealthNotice(
        nextCalendarHealth
          ? null
          : "La comprobación no devolvió un diagnóstico utilizable.",
      );
    }

    const fiscalWatchBody = fiscalWatchResponse
      ? await readAdminJsonResponse<AdminFiscalWatchResponse>(
          fiscalWatchResponse,
        )
      : {};
    let nextFiscalWatch: FiscalWatchAdminStatus | null = null;
    const fiscalWatchProbeFailed = !fiscalWatchResponse?.ok;
    if (fiscalWatchProbeFailed) {
      setFiscalWatch(null);
      setFiscalWatchReviewStoreAvailable(false);
      setFiscalWatchNotice(
        fiscalWatchBody.error ??
          "No se pudo comprobar la vigilancia de fuentes fiscales.",
      );
    } else {
      nextFiscalWatch = fiscalWatchBody.status ?? null;
      setFiscalWatch(nextFiscalWatch);
      setFiscalWatchReviewStoreAvailable(
        fiscalWatchBody.reviewStoreAvailable === true,
      );
      setFiscalWatchNotice(
        nextFiscalWatch
          ? null
          : "La vigilancia no devolvió un diagnóstico utilizable.",
      );
    }

    const errorsBody = errorsResponse
      ? await readAdminJsonResponse<AdminErrorsResponse>(errorsResponse)
      : {};
    if (!errorsResponse?.ok) {
      setError(
        errorsBody.error ??
          "No se pudieron cargar todos los datos de administración.",
      );
      onSignalsLoaded?.(
        buildAdminSectionSignals({
          health: null,
          calendarHealth: nextCalendarHealth,
          calendarHealthProbeFailed:
            calendarHealthProbeFailed || !nextCalendarHealth,
          fiscalWatch: nextFiscalWatch,
          fiscalWatchProbeFailed:
            fiscalWatchProbeFailed || !nextFiscalWatch,
          operations: null,
          vercel: null,
          errors: [],
        }),
      );
      setLoading(false);
      return;
    }

    const healthBody = healthResponse
      ? await readAdminJsonResponse<AdminHealthResponse>(healthResponse)
      : {};
    const nextErrors = errorsBody.errors ?? [];
    setErrors(nextErrors);
    setNotice(
      errorsBody.monitoringAvailable === false ? errorsBody.message ?? null : null,
    );
    if (!healthResponse?.ok) {
      setHealth(null);
      setHealthNotice(healthBody.error ?? "No se pudo cargar salud del sistema.");
    } else {
      const nextHealth = healthBody.health ?? null;
      setHealth(nextHealth);
      setHealthNotice(
        healthBody.monitoringAvailable === false ? healthBody.message ?? null : null,
      );
    }

    const vercelBody = vercelResponse
      ? await readAdminJsonResponse<AdminVercelUsageResponse>(vercelResponse)
      : {};
    let nextVercel: AdminVercelUsageSnapshot | null = null;
    if (!vercelResponse?.ok) {
      setVercel(null);
      setVercelNotice(vercelBody.error ?? "No se pudo cargar Vercel.");
    } else {
      nextVercel = vercelBody.vercel ?? null;
      setVercel(nextVercel);
      setVercelNotice(
        vercelBody.configured === false
          ? vercelBody.message ?? "Panel Vercel pendiente de conectar."
          : vercelBody.message ?? null,
      );
    }

    const operationsBody = operationsResponse
      ? await readAdminJsonResponse<AdminOperationsStatusResponse>(
          operationsResponse,
        )
      : {};
    let nextOperations: AdminOperationsStatus | null = null;
    if (!operationsResponse?.ok) {
      setOperations(null);
      setOperationsNotice(
        operationsBody.error ?? "No se pudo comprobar GitHub, dominio y Firewall.",
      );
    } else {
      nextOperations = operationsBody.operations ?? null;
      setOperations(nextOperations);
      setOperationsNotice(operationsBody.message ?? null);
    }

    onSignalsLoaded?.(
      buildAdminSectionSignals({
        health: healthResponse?.ok ? healthBody.health ?? null : null,
        calendarHealth: nextCalendarHealth,
        calendarHealthProbeFailed:
          calendarHealthProbeFailed || !nextCalendarHealth,
        fiscalWatch: nextFiscalWatch,
        fiscalWatchProbeFailed:
          fiscalWatchProbeFailed || !nextFiscalWatch,
        operations: nextOperations,
        vercel: nextVercel,
        errors: nextErrors,
      }),
    );
    setLoading(false);
  }, [onSignalsLoaded]);

  useEffect(() => {
    void loadOperations();
  }, [loadOperations]);

  const reviewFiscalWatchIssue = useCallback(
    async (issue: { number: number; kind: "change" | "baseline" }) => {
      const confirmed = window.confirm(
        "Confirma que ya has examinado este aviso. Se retirará del panel, pero la incidencia y la fuente oficial seguirán conservadas.",
      );
      if (!confirmed) return;

      const issueKey = `${issue.kind}:${issue.number}`;
      setReviewingFiscalWatchIssue(issueKey);
      setFiscalWatchNotice(null);
      try {
        const token = await getAccessToken();
        if (!token) {
          setFiscalWatchNotice("Inicia sesión con una cuenta administradora.");
          return;
        }
        const response = await fetchAdminResponse("/api/admin/fiscal-watch", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            action: "review",
            issueNumber: issue.number,
            kind: issue.kind,
          }),
        });
        const body = response
          ? await readAdminJsonResponse<AdminFiscalWatchResponse>(response)
          : {};
        if (!response?.ok || body.reviewed !== true) {
          setFiscalWatchNotice(
            body.error ?? "No se pudo guardar la revisión del aviso.",
          );
          return;
        }
        await loadOperations();
      } catch {
        setFiscalWatchNotice("No se pudo guardar la revisión del aviso.");
      } finally {
        setReviewingFiscalWatchIssue(null);
      }
    },
    [loadOperations],
  );

  const syncErrors = errors.filter((item) => item.area === "sync").length;
  const browserErrors = errors.filter((item) => item.area === "browser").length;
  const sectionMeta = ADMIN_MENU.find((item) => item.id === section);
  const SectionIcon = sectionMeta?.Icon ?? Gauge;

  return (
    <section className="mt-6 space-y-4">
      <Card className="space-y-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-start gap-3">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-slate-100 text-slate-700">
              <SectionIcon className="h-5 w-5" />
            </span>
            <div>
              <h2 className="text-xl font-bold text-slate-900">
                {sectionMeta?.label ?? "Panel de control"}
              </h2>
              <p className="text-sm text-slate-600">
                {sectionMeta?.description ??
                  "Control operativo seguro del proyecto."}
              </p>
            </div>
          </div>
          <Button type="button" variant="secondary" onClick={loadOperations} disabled={loading}>
            <RefreshCw className="h-4 w-4" />
            Actualizar
          </Button>
        </div>
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
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
          <div className="rounded-2xl bg-slate-50 p-4">
            <p className="text-sm font-bold text-slate-500">Vercel</p>
            <p className="text-2xl font-bold text-slate-900">
              {vercel ? formatUsd(vercel.summary.onDemandUsd) : "—"}
            </p>
          </div>
          <div className="rounded-2xl bg-slate-50 p-4">
            <p className="text-sm font-bold text-slate-500">Producción</p>
            <p className="text-2xl font-bold text-slate-900">
              {operations
                ? deploymentAlignmentLabel(operations.deployment.alignedWithMain)
                : "—"}
            </p>
          </div>
        </div>
      </Card>

      {loading && <Card>Cargando datos de administración...</Card>}
      {error && (
        <Card className="border-amber-200 bg-amber-50 text-amber-900">
          {error}
        </Card>
      )}
      {!loading && section === "sistema" && (
        <>
          <FiscalCalendarHealthPanel
            health={calendarHealth}
            notice={calendarHealthNotice}
          />
          <FiscalWatchPanel
            status={fiscalWatch}
            notice={fiscalWatchNotice}
            reviewStoreAvailable={fiscalWatchReviewStoreAvailable}
            reviewingIssueKey={reviewingFiscalWatchIssue}
            onReviewIssue={reviewFiscalWatchIssue}
          />
          {!error && health && (
            <>
              <OperationsStatusDashboard
                operations={operations}
                notice={operationsNotice}
              />
              <HealthDashboard health={health} />
              <VercelUsageDashboard
                vercel={vercel}
                notice={vercelNotice}
                operations={operations}
              />
            </>
          )}
        </>
      )}
      {!loading && !error && section === "supabase" && health && (
        <SupabaseDashboard health={health} />
      )}
      {!loading && !error && section === "vercel" && (
        <div className="space-y-4">
          <OperationsStatusDashboard
            operations={operations}
            notice={operationsNotice}
          />
          <VercelUsageDashboard
            vercel={vercel}
            notice={vercelNotice}
            operations={operations}
          />
        </div>
      )}
      {!loading && !error && section === "seguridad" && health && (
        <SecurityDashboard health={health} operations={operations} />
      )}
      {!loading && !error && section === "errores" && (
        <ErrorsListDashboard errors={errors} />
      )}
      {!loading && !error && healthNotice && (
        <Card className="border-blue-100 bg-blue-50 text-blue-900">
          {healthNotice}
        </Card>
      )}
      {!loading && !error && notice && (
        <Card className="border-blue-100 bg-blue-50 text-blue-900">
          {notice}
        </Card>
      )}
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
  const vat = resolveExpenseVat(payload.expense);
  const vatTypes = vat.breakdown
    .map((row) => `${row.ivaPercent.toLocaleString("es-ES")}%`)
    .join(" + ");
  const vatSource =
    vat.source === "lines"
      ? "Líneas conciliadas"
      : vat.source === "blocked"
        ? "Desglose mixto bloqueado"
        : "Cabecera legacy";
  return [
    ["Proveedor", payload.supplier.name],
    ["Tipo", payload.expense.businessKind ?? "Compra"],
    ["Descripción", payload.expense.description],
    ["Base", payload.expense.amount.toLocaleString("es-ES")],
    ["Tipos IVA", vatTypes || `${payload.expense.ivaPercent}%`],
    ["Cuota IVA", vat.iva.toLocaleString("es-ES")],
    ["Total", vat.total.toLocaleString("es-ES")],
    ["Origen IVA", vatSource],
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

function qrCodeSrc(qrCode: string): string {
  if (qrCode.startsWith("data:")) return qrCode;
  return `data:image/svg+xml;utf8,${encodeURIComponent(qrCode)}`;
}

function AdminMfaPanel({
  adminMfa,
  onChanged,
}: {
  adminMfa: NonNullable<AdminCapabilitiesResponse["adminMfa"]>;
  onChanged: () => void;
}) {
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<"idle" | "enroll" | "verify">("idle");
  const [factors, setFactors] = useState<AdminMfaFactor[]>([]);
  const [currentLevel, setCurrentLevel] = useState<string | null>(
    adminMfa.currentLevel ?? null,
  );
  const [enrollment, setEnrollment] = useState<{
    factorId: string;
    qrCode: string;
    secret: string;
  } | null>(null);
  const [code, setCode] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const loadMfa = useCallback(async () => {
    setLoading(true);
    setError(null);
    const supabase = await getSupabaseClientAsync();
    if (!supabase) {
      setError("Supabase no está disponible en este entorno.");
      setLoading(false);
      return;
    }

    const [aalResult, factorsResult] = await Promise.all([
      supabase.auth.mfa.getAuthenticatorAssuranceLevel(),
      supabase.auth.mfa.listFactors(),
    ]);

    if (aalResult.error) {
      setError(aalResult.error.message);
    } else {
      setCurrentLevel(aalResult.data.currentLevel ?? null);
    }

    if (factorsResult.error) {
      setError(factorsResult.error.message);
    } else {
      setFactors((factorsResult.data.all ?? []) as AdminMfaFactor[]);
    }

    setLoading(false);
  }, []);

  useEffect(() => {
    void loadMfa();
  }, [loadMfa]);

  const verifiedTotp = factors.find(
    (factor) => factor.factor_type === "totp" && factor.status === "verified",
  );
  const satisfied = currentLevel === "aal2" || adminMfa.satisfied === true;
  const required = adminMfa.required === true;

  const startEnrollment = async () => {
    setBusy("enroll");
    setError(null);
    setMessage(null);
    const supabase = await getSupabaseClientAsync();
    if (!supabase) {
      setError("Supabase no está disponible en este entorno.");
      setBusy("idle");
      return;
    }

    const { data, error: enrollError } = await supabase.auth.mfa.enroll({
      factorType: "totp",
      friendlyName: "Factura Autonomo Admin",
    });
    if (enrollError) {
      setError(enrollError.message);
      setBusy("idle");
      return;
    }

    setEnrollment({
      factorId: data.id,
      qrCode: data.totp.qr_code,
      secret: data.totp.secret,
    });
    setBusy("idle");
  };

  const verifyFactor = async (factorId: string) => {
    const cleanCode = code.trim().replace(/\s+/g, "");
    if (!cleanCode) {
      setError("Introduce el código de 6 dígitos.");
      return;
    }

    setBusy("verify");
    setError(null);
    setMessage(null);
    const supabase = await getSupabaseClientAsync();
    if (!supabase) {
      setError("Supabase no está disponible en este entorno.");
      setBusy("idle");
      return;
    }

    const challenge = await supabase.auth.mfa.challenge({ factorId });
    if (challenge.error) {
      setError(challenge.error.message);
      setBusy("idle");
      return;
    }

    const verified = await supabase.auth.mfa.verify({
      factorId,
      challengeId: challenge.data.id,
      code: cleanCode,
    });
    if (verified.error) {
      setError(verified.error.message);
      setBusy("idle");
      return;
    }

    setCode("");
    setEnrollment(null);
    setMessage("Verificación en dos pasos activa en esta sesión.");
    await loadMfa();
    onChanged();
    setBusy("idle");
  };

  return (
    <Card
      className={
        required && !satisfied
          ? "mb-5 border-amber-200 bg-amber-50 text-amber-950"
          : "mb-5 border-emerald-100 bg-emerald-50 text-emerald-950"
      }
    >
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div className="space-y-1">
          <h2 className="text-lg font-bold text-slate-900">
            MFA admin
          </h2>
          <p className="text-sm text-slate-700">
            Estado: {satisfied ? "verificado" : "pendiente"} · Nivel{" "}
            {currentLevel ?? "sin confirmar"}
            {required ? " · obligatorio" : " · preparado"}
          </p>
        </div>
        <Button
          type="button"
          variant="secondary"
          onClick={loadMfa}
          disabled={loading || busy !== "idle"}
        >
          <RefreshCw className="h-4 w-4" />
          Actualizar
        </Button>
      </div>

      {loading && <p className="mt-3 text-sm text-slate-600">Comprobando MFA...</p>}

      {!loading && satisfied && (
        <p className="mt-3 text-sm font-semibold text-emerald-800">
          Esta sesión admin ya tiene segundo factor validado.
        </p>
      )}

      {!loading && !satisfied && verifiedTotp && (
        <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-end">
          <label className="block flex-1 space-y-1">
            <span className="text-sm font-bold text-slate-700">
              Código MFA
            </span>
            <input
              value={code}
              onChange={(event) => setCode(event.target.value)}
              inputMode="numeric"
              autoComplete="one-time-code"
              className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-base text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            />
          </label>
          <Button
            type="button"
            onClick={() => verifyFactor(verifiedTotp.id)}
            disabled={busy !== "idle"}
          >
            <ShieldCheck className="h-4 w-4" />
            Verificar
          </Button>
        </div>
      )}

      {!loading && !verifiedTotp && !enrollment && (
        <div className="mt-4">
          <Button
            type="button"
            onClick={startEnrollment}
            disabled={busy !== "idle"}
          >
            <ShieldCheck className="h-4 w-4" />
            Preparar TOTP
          </Button>
        </div>
      )}

      {enrollment && (
        <div className="mt-4 grid gap-4 lg:grid-cols-[180px_1fr]">
          <div className="rounded-lg border border-slate-200 bg-white p-3">
            <Image
              src={qrCodeSrc(enrollment.qrCode)}
              alt="Código QR MFA"
              width={144}
              height={144}
              unoptimized
              className="h-36 w-36"
            />
          </div>
          <div className="space-y-3">
            <p className="break-all rounded-lg bg-white px-3 py-2 font-mono text-xs text-slate-700">
              {enrollment.secret}
            </p>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
              <label className="block flex-1 space-y-1">
                <span className="text-sm font-bold text-slate-700">
                  Código MFA
                </span>
                <input
                  value={code}
                  onChange={(event) => setCode(event.target.value)}
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-base text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                />
              </label>
              <Button
                type="button"
                onClick={() => verifyFactor(enrollment.factorId)}
                disabled={busy !== "idle"}
              >
                <ShieldCheck className="h-4 w-4" />
                Activar
              </Button>
            </div>
          </div>
        </div>
      )}

      {message && <p className="mt-3 text-sm font-semibold text-emerald-800">{message}</p>}
      {error && <p className="mt-3 text-sm font-semibold text-red-700">{error}</p>}
    </Card>
  );
}

export default function AdminPage() {
  const { user, cloudEnabled } = useCloudSync();
  const searchParams = useSearchParams();
  const [section, setSection] = useState<AdminSection>("sistema");
  const [sectionSignals, setSectionSignals] = useState<AdminSectionSignals>({});
  const [seenSectionAlerts, setSeenSectionAlerts] = useState<
    Partial<Record<AdminSection, string>>
  >({});
  const [capabilities, setCapabilities] =
    useState<AdminCapabilitiesResponse | null>(null);
  const [capabilitiesLoading, setCapabilitiesLoading] = useState(false);
  const [capabilitiesRefreshKey, setCapabilitiesRefreshKey] = useState(0);

  const availableSections = useMemo<AdminSection[]>(() => {
    if (!capabilities) return [];
    if (capabilities.fullAdmin) return ADMIN_MENU.map((entry) => entry.id);
    if (capabilities.aiLearning) return ["aprendizaje"];
    return [];
  }, [capabilities]);
  const sectionAlerts = useMemo<Partial<Record<AdminSection, AdminHealthLevel>>>(
    () =>
      Object.fromEntries(
        Object.entries(sectionSignals)
          .filter(
            ([sectionId, signal]) =>
              signal &&
              seenSectionAlerts[sectionId as AdminSection] !== signal.id,
          )
          .map(([sectionId, signal]) => [sectionId, signal?.level]),
      ) as Partial<Record<AdminSection, AdminHealthLevel>>,
    [sectionSignals, seenSectionAlerts],
  );

  const markSectionAlertSeen = useCallback((sectionId: AdminSection, alertId: string) => {
    setSeenSectionAlerts((current) => {
      const next = { ...current, [sectionId]: alertId };
      try {
        window.localStorage.setItem(SECTION_ALERTS_SEEN_KEY, JSON.stringify(next));
      } catch {
        // El aviso seguirá funcionando aunque el navegador bloquee almacenamiento local.
      }
      return next;
    });
  }, []);

  const handleSignalsLoaded = useCallback((signals: AdminSectionSignals) => {
    setSectionSignals(signals);
  }, []);

  const loadSecurityAlert = useCallback(async () => {
    const token = await getAccessToken();
    if (!token) return;
    const response = await fetchAdminResponse("/api/admin/health", {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!response?.ok) return;
    const body = (await response.json().catch(() => ({}))) as AdminHealthResponse;
    const signals = buildAdminSectionSignals({
      health: body.health ?? null,
      calendarHealth: null,
      calendarHealthProbeFailed: false,
      fiscalWatch: null,
      fiscalWatchProbeFailed: false,
      operations: null,
      vercel: null,
      errors: [],
    });
    setSectionSignals((current) => {
      const next = { ...current };
      if (signals.seguridad) next.seguridad = signals.seguridad;
      else delete next.seguridad;
      if (signals.supabase) next.supabase = signals.supabase;
      else delete next.supabase;
      return next;
    });
  }, []);

  useEffect(() => {
    try {
      const stored = window.localStorage.getItem(SECTION_ALERTS_SEEN_KEY);
      const parsed = stored ? (JSON.parse(stored) as unknown) : null;
      setSeenSectionAlerts(
        parsed && typeof parsed === "object" && !Array.isArray(parsed)
          ? (parsed as Partial<Record<AdminSection, string>>)
          : {},
      );
    } catch {
      setSeenSectionAlerts({});
    }
  }, []);

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
  }, [user, capabilitiesRefreshKey]);

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

  useEffect(() => {
    if (capabilities?.fullAdmin) void loadSecurityAlert();
  }, [capabilities?.fullAdmin, loadSecurityAlert]);

  useEffect(() => {
    const signal = sectionSignals[section];
    if (signal) markSectionAlertSeen(section, signal.id);
  }, [markSectionAlertSeen, section, sectionSignals]);

  return (
    <div>
      <PageHeader
        title="Admin"
        subtitle="Gestión interna de Factura Autónomo. Solo para cuentas autorizadas."
        action={
          <div className="flex flex-wrap items-center gap-2">
            {capabilities?.fullAdmin && (
              <ButtonLink href="/admin/tax-diagnostic-insights" variant="secondary">
                <BarChart3 className="h-4 w-4" /> Uso del diagnóstico
              </ButtonLink>
            )}
            <span className="inline-flex items-center gap-2 rounded-full bg-slate-900 px-4 py-2 text-sm font-bold text-white">
              <ShieldCheck className="h-4 w-4" />
              Panel interno
            </span>
          </div>
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

      {user &&
        !capabilitiesLoading &&
        availableSections.length === 0 &&
        !capabilities?.adminEmailAuthorized && (
        <Card className="mb-5 border-amber-200 bg-amber-50 text-amber-900">
          Esta cuenta no tiene acceso al panel interno.
        </Card>
      )}

      {ADMIN_MFA_UI_ENABLED &&
        capabilities?.adminEmailAuthorized &&
        capabilities.adminMfa && (
        <AdminMfaPanel
          adminMfa={capabilities.adminMfa}
          onChanged={() => setCapabilitiesRefreshKey((value) => value + 1)}
        />
      )}

      {availableSections.length > 0 && (
        <AdminMenu
          current={section}
          onSelect={setSection}
          sections={availableSections}
          alerts={sectionAlerts}
        />
      )}

      {capabilities?.fullAdmin && section === "usuarios" && <UsersPanel />}
      {capabilities?.fullAdmin && section === "partners" && (
        <AdminPartnersPanel />
      )}
      {capabilities?.fullAdmin &&
        section !== "usuarios" &&
        section !== "partners" &&
        section !== "aprendizaje" && (
        <OperationsPanel section={section} onSignalsLoaded={handleSignalsLoaded} />
      )}
      {capabilities?.aiLearning && section === "aprendizaje" && (
        <AiLearningPanel />
      )}
    </div>
  );
}
