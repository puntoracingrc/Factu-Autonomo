import {
  AlertTriangle,
  CheckCircle2,
  Clock3,
  ExternalLink,
  FileSearch,
  ShieldCheck,
} from "lucide-react";
import { Card } from "@/components/ui/Card";
import type {
  FiscalWatchAdminIssue,
  FiscalWatchAdminLevel,
  FiscalWatchAdminStatus,
} from "@/lib/fiscal-watch/admin-status";

export interface FiscalWatchPanelProps {
  status: FiscalWatchAdminStatus | null;
  notice?: string | null;
}

const DATE_TIME_FORMATTER = new Intl.DateTimeFormat("es-ES", {
  dateStyle: "medium",
  timeStyle: "short",
  timeZone: "Europe/Madrid",
});

const SENSITIVE_NOTICE_PATTERN =
  /(https?:\/\/|www\.|authorization|bearer|token|api[_-]?key|secret|password|contraseña|body|sha|hash)/i;

const OFFICIAL_SOURCE_LABELS = new Map([
  ["www.boe.es", "BOE"],
  ["boe.es", "BOE"],
  ["sede.agenciatributaria.gob.es", "Agencia Tributaria"],
  ["www2.agenciatributaria.gob.es", "Agencia Tributaria · INFORMA"],
]);
const MODEL_CODE_PATTERN = /^(?:A\d{2}|\d{2,3}[A-Z]?)$/;
const MAX_MODEL_HINTS = 80;

function cleanText(value: unknown, maxLength: number): string | null {
  if (typeof value !== "string") return null;
  const cleaned = value
    .replace(/[\u0000-\u001f\u007f]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  if (!cleaned) return null;
  return Array.from(cleaned).slice(0, maxLength).join("");
}

function safeNotice(value: unknown): string | null {
  const cleaned = cleanText(value, 280);
  if (!cleaned) return null;
  return SENSITIVE_NOTICE_PATTERN.test(cleaned)
    ? "No se pudo obtener un diagnóstico verificable de la vigilancia fiscal."
    : cleaned;
}

function safeDateTime(value: unknown): string {
  if (typeof value !== "string") return "Sin ejecución confirmada";
  const timestamp = Date.parse(value);
  if (!Number.isFinite(timestamp)) return "Sin ejecución confirmada";
  return DATE_TIME_FORMATTER.format(new Date(timestamp));
}

function safeCount(value: unknown): number | null {
  return typeof value === "number" && Number.isSafeInteger(value) && value >= 0
    ? value
    : null;
}

function safeModelCodes(value: unknown): string[] | null {
  if (!Array.isArray(value) || value.length > MAX_MODEL_HINTS) return null;
  const codes: string[] = [];
  for (const candidate of value) {
    if (
      typeof candidate !== "string" ||
      !MODEL_CODE_PATTERN.test(candidate) ||
      codes.includes(candidate)
    ) {
      return null;
    }
    codes.push(candidate);
  }
  const sorted = [...codes].sort();
  return codes.every((code, index) => code === sorted[index])
    ? codes
    : null;
}

function exactGithubUrl(
  value: unknown,
  kind: "workflow" | "issue",
  id: number,
): string | null {
  if (typeof value !== "string" || value.length > 500) return null;
  try {
    const url = new URL(value);
    const suffix =
      kind === "workflow" ? `/actions/runs/${id}` : `/issues/${id}`;
    if (
      url.protocol !== "https:" ||
      url.hostname !== "github.com" ||
      url.pathname !== `/puntoracingrc/Factu-Autonomo${suffix}` ||
      url.port ||
      url.username ||
      url.password ||
      url.search ||
      url.hash
    ) {
      return null;
    }
    return url.toString();
  } catch {
    return null;
  }
}

function officialSource(value: unknown): {
  label: string;
  url: string;
} | null {
  if (typeof value !== "string" || value.length > 800) return null;
  try {
    const url = new URL(value);
    const label = OFFICIAL_SOURCE_LABELS.get(url.hostname);
    if (
      !label ||
      url.protocol !== "https:" ||
      url.port ||
      url.username ||
      url.password
    ) {
      return null;
    }
    url.hash = "";
    return { label, url: url.toString() };
  } catch {
    return null;
  }
}

interface DisplayIssue {
  number: number;
  kind: FiscalWatchAdminIssue["kind"];
  title: string;
  issueUrl: string;
  source: { label: string; url: string } | null;
  detectedAt: string;
  modelCodes: string[];
  modelHintsTruncated: boolean;
}

function displayIssue(value: FiscalWatchAdminIssue): DisplayIssue | null {
  const number = safeCount(value?.number);
  const title = cleanText(value?.title, 240);
  if (
    !number ||
    !title ||
    (value.kind !== "change" && value.kind !== "baseline")
  ) {
    return null;
  }
  const issueUrl = exactGithubUrl(value.url, "issue", number);
  if (!issueUrl) return null;
  const modelCodes = safeModelCodes(value.modelCodes);
  if (
    !modelCodes ||
    typeof value.modelHintsTruncated !== "boolean" ||
    (value.modelHintsTruncated && modelCodes.length !== MAX_MODEL_HINTS)
  ) {
    return null;
  }
  const detectedTimestamp = Date.parse(value.detectedAt);
  if (!Number.isFinite(detectedTimestamp)) return null;
  return {
    number,
    kind: value.kind,
    title,
    issueUrl,
    source: officialSource(value.sourceUrl),
    detectedAt: new Date(detectedTimestamp).toISOString(),
    modelCodes,
    modelHintsTruncated: value.modelHintsTruncated,
  };
}

function levelTone(level: FiscalWatchAdminLevel) {
  if (level === "action") {
    return {
      panel:
        "border-red-300 bg-red-50 text-red-950 dark:border-red-800 dark:bg-red-950/35 dark:text-red-100",
      badge: "bg-red-600 text-white dark:bg-red-500 dark:text-red-950",
      icon: "bg-red-600 text-white dark:bg-red-500 dark:text-red-950",
      metric:
        "border-red-200 bg-white/75 dark:border-red-900/70 dark:bg-red-950/45",
    };
  }
  if (level === "watch") {
    return {
      panel:
        "border-amber-300 bg-amber-50 text-amber-950 dark:border-amber-800 dark:bg-amber-950/35 dark:text-amber-100",
      badge: "bg-amber-500 text-white dark:bg-amber-400 dark:text-amber-950",
      icon: "bg-amber-500 text-white dark:bg-amber-400 dark:text-amber-950",
      metric:
        "border-amber-200 bg-white/75 dark:border-amber-900/70 dark:bg-amber-950/45",
    };
  }
  return {
    panel:
      "border-emerald-300 bg-emerald-50 text-emerald-950 dark:border-emerald-800 dark:bg-emerald-950/35 dark:text-emerald-100",
    badge:
      "bg-emerald-600 text-white dark:bg-emerald-500 dark:text-emerald-950",
    icon: "bg-emerald-600 text-white dark:bg-emerald-500 dark:text-emerald-950",
    metric:
      "border-emerald-200 bg-white/75 dark:border-emerald-900/70 dark:bg-emerald-950/45",
  };
}

function safeLevel(value: unknown): FiscalWatchAdminLevel {
  return value === "ok" || value === "watch" ? value : "action";
}

function fallbackHeadline(level: FiscalWatchAdminLevel): string {
  if (level === "action") return "La vigilancia fiscal no puede verificarse.";
  if (level === "watch") return "Hay información pendiente de revisión humana.";
  return "Fuentes oficiales revisadas; no hay cambios pendientes.";
}

function issueTypeLabel(kind: FiscalWatchAdminIssue["kind"]): string {
  return kind === "baseline" ? "Línea base" : "Cambio detectado";
}

function IssueCard({ issue }: { issue: DisplayIssue }) {
  return (
    <li className="min-w-0 overflow-hidden rounded-2xl border border-slate-200 bg-white/80 p-4 dark:border-slate-700 dark:bg-slate-950/45">
      <div className="flex min-w-0 flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <span className="inline-flex rounded-full bg-amber-100 px-2.5 py-1 text-xs font-black uppercase tracking-wide text-amber-800 dark:bg-amber-900/70 dark:text-amber-100">
            {issueTypeLabel(issue.kind)}
          </span>
          <h3 className="mt-2 break-words text-base font-black text-slate-950 dark:text-slate-50">
            {issue.title}
          </h3>
          <p className="mt-1 break-words text-xs text-slate-600 dark:text-slate-300">
            Detectado: {safeDateTime(issue.detectedAt)}
          </p>
          {issue.modelCodes.length > 0 && (
            <div className="mt-3 rounded-xl border border-blue-200 bg-blue-50/80 p-3 dark:border-blue-900/70 dark:bg-blue-950/35">
              <p className="text-xs font-black uppercase tracking-wide text-blue-900 dark:text-blue-100">
                Fichas candidatas a revisar
              </p>
              <div
                className="mt-2 flex flex-wrap gap-2"
                aria-label="Modelos o formularios mencionados explícitamente"
              >
                {issue.modelCodes.map((code) => (
                  <span
                    key={code}
                    className="inline-flex rounded-full bg-blue-100 px-2.5 py-1 font-mono text-xs font-black text-blue-900 dark:bg-blue-900/70 dark:text-blue-100"
                  >
                    {code}
                  </span>
                ))}
              </div>
              {issue.modelHintsTruncated && (
                <p className="mt-2 text-xs font-bold text-blue-900 dark:text-blue-100">
                  Hay más referencias en la fuente oficial; examina el aviso
                  completo.
                </p>
              )}
              <p className="mt-2 text-xs leading-5 text-blue-900 dark:text-blue-100">
                Son menciones literales detectadas automáticamente; no
                confirman por sí solas un cambio del modelo.
              </p>
            </div>
          )}
        </div>
        <a
          href={issue.issueUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex min-h-11 w-full shrink-0 items-center justify-center gap-2 rounded-xl bg-slate-950 px-4 py-2 text-sm font-black text-white hover:bg-slate-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 dark:bg-white dark:text-slate-950 dark:hover:bg-slate-200 sm:w-auto"
        >
          Examinar aviso
          <ExternalLink aria-hidden="true" className="h-4 w-4" />
        </a>
      </div>
      {issue.source && (
        <p className="mt-3 border-t border-slate-200 pt-3 text-sm dark:border-slate-700">
          <a
            href={issue.source.url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex min-w-0 items-center gap-2 break-words font-bold text-blue-700 underline decoration-blue-300 underline-offset-4 hover:text-blue-900 dark:text-blue-300 dark:hover:text-blue-100"
          >
            Abrir fuente oficial: {issue.source.label}
            <ExternalLink aria-hidden="true" className="h-4 w-4 shrink-0" />
          </a>
        </p>
      )}
    </li>
  );
}

export function FiscalWatchPanel({ status, notice }: FiscalWatchPanelProps) {
  const rawIssues = Array.isArray(status?.issues) ? status.issues : [];
  const issues = rawIssues
    .map(displayIssue)
    .filter((issue): issue is DisplayIssue => issue !== null);
  const statusContractValid = Boolean(
    status &&
    status.sourcesValid === true &&
    safeCount(status.pendingReviews) !== null &&
    rawIssues.length === issues.length,
  );
  const level = statusContractValid ? safeLevel(status?.level) : "action";
  const tone = levelTone(level);
  const pendingReviews = statusContractValid
    ? (safeCount(status?.pendingReviews) ?? 0)
    : null;
  const baselinePending = statusContractValid
    ? status?.baselinePending === true
    : null;
  const headline =
    (statusContractValid && cleanText(status?.headline, 240)) ||
    fallbackHeadline(level);
  const displayedNotice = safeNotice(notice);
  const workflowId = safeCount(status?.workflow.id);
  const workflowUrl =
    statusContractValid && workflowId
      ? exactGithubUrl(status?.workflowUrl, "workflow", workflowId)
      : null;
  const StatusIcon =
    level === "action"
      ? AlertTriangle
      : level === "watch"
        ? FileSearch
        : CheckCircle2;

  return (
    <Card
      role={level === "action" ? "alert" : "status"}
      aria-labelledby="fiscal-watch-title"
      data-fiscal-watch-level={level}
      data-fiscal-watch-signal={
        cleanText(status?.signalId, 240) ?? "unavailable"
      }
      className={`min-w-0 overflow-hidden ${tone.panel}`}
    >
      <section className="min-w-0">
        <div className="flex min-w-0 flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="flex min-w-0 items-start gap-3">
            <span
              className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl ${tone.icon}`}
            >
              <StatusIcon aria-hidden="true" className="h-6 w-6" />
            </span>
            <div className="min-w-0">
              <div className="flex min-w-0 flex-wrap items-center gap-2">
                <h2
                  id="fiscal-watch-title"
                  className="break-words text-xl font-black text-slate-950 dark:text-slate-50"
                >
                  Vigilancia de cambios fiscales
                </h2>
                <span
                  className={`inline-flex rounded-full px-3 py-1 text-xs font-black uppercase tracking-wide ${tone.badge}`}
                >
                  {statusContractValid
                    ? cleanText(status?.label, 60) || fallbackHeadline(level)
                    : "Acción necesaria"}
                </span>
              </div>
              <p className="mt-2 break-words text-lg font-black leading-7 text-slate-950 dark:text-slate-50">
                {headline}
              </p>
              <p className="mt-2 max-w-3xl break-words text-sm leading-6 text-slate-700 dark:text-slate-200">
                El monitor compara cada día fuentes oficiales de la AEAT y el
                BOE. Detecta diferencias, pero nunca modifica automáticamente
                plazos, modelos ni reglas fiscales: cualquier impacto requiere
                revisión humana.
              </p>
              {displayedNotice && (
                <p className="mt-3 max-w-3xl break-words rounded-xl border border-red-200 bg-white/70 px-3 py-2 text-sm font-bold text-red-900 dark:border-red-900/70 dark:bg-red-950/45 dark:text-red-100">
                  {displayedNotice}
                </p>
              )}
            </div>
          </div>
          <div className="flex min-w-0 shrink-0 items-center gap-2 text-sm font-semibold text-slate-600 dark:text-slate-300">
            <Clock3 aria-hidden="true" className="h-4 w-4 shrink-0" />
            <span className="min-w-0 break-words">
              {safeDateTime(statusContractValid ? status?.lastRunAt : null)}
            </span>
          </div>
        </div>

        <dl className="mt-5 grid min-w-0 grid-cols-1 gap-3 sm:grid-cols-3">
          <div className={`min-w-0 rounded-2xl border p-3 ${tone.metric}`}>
            <dt className="break-words text-xs font-bold text-slate-500 dark:text-slate-400">
              Avisos por revisar
            </dt>
            <dd className="mt-1 break-words text-xl font-black tabular-nums text-slate-950 dark:text-slate-50">
              {pendingReviews ?? "—"}
            </dd>
          </div>
          <div className={`min-w-0 rounded-2xl border p-3 ${tone.metric}`}>
            <dt className="break-words text-xs font-bold text-slate-500 dark:text-slate-400">
              Línea base
            </dt>
            <dd className="mt-1 break-words text-base font-black text-slate-950 dark:text-slate-50">
              {baselinePending === null
                ? "Sin confirmar"
                : baselinePending
                  ? "Pendiente"
                  : "Validada"}
            </dd>
          </div>
          <div className={`min-w-0 rounded-2xl border p-3 ${tone.metric}`}>
            <dt className="break-words text-xs font-bold text-slate-500 dark:text-slate-400">
              Última comprobación
            </dt>
            <dd className="mt-1 break-words text-sm font-black text-slate-950 dark:text-slate-50">
              {safeDateTime(statusContractValid ? status?.lastRunAt : null)}
            </dd>
          </div>
        </dl>

        {issues.length > 0 ? (
          <div className="mt-6 min-w-0">
            <div className="flex min-w-0 items-center gap-2">
              <FileSearch
                aria-hidden="true"
                className="h-5 w-5 shrink-0 text-slate-700 dark:text-slate-200"
              />
              <h3 className="break-words text-base font-black text-slate-950 dark:text-slate-50">
                Avisos que requieren examen
              </h3>
            </div>
            <ul className="mt-3 grid min-w-0 gap-3 xl:grid-cols-2">
              {issues.map((issue) => (
                <IssueCard
                  key={`${issue.kind}-${issue.number}`}
                  issue={issue}
                />
              ))}
            </ul>
          </div>
        ) : (
          <div className="mt-6 flex min-w-0 items-start gap-3 rounded-2xl border border-slate-200 bg-white/70 p-4 dark:border-slate-700 dark:bg-slate-950/40">
            <ShieldCheck
              aria-hidden="true"
              className="mt-0.5 h-5 w-5 shrink-0 text-slate-700 dark:text-slate-200"
            />
            <p className="min-w-0 break-words text-sm leading-6 text-slate-700 dark:text-slate-200">
              No hay avisos abiertos. Que hoy no existan publicaciones nuevas es
              un resultado normal y no indica un fallo.
            </p>
          </div>
        )}

        {workflowUrl && (
          <p className="mt-4 text-sm">
            <a
              href={workflowUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex min-w-0 items-center gap-2 break-words font-bold text-blue-700 underline decoration-blue-300 underline-offset-4 hover:text-blue-900 dark:text-blue-300 dark:hover:text-blue-100"
            >
              Ver ejecución técnica en GitHub
              <ExternalLink aria-hidden="true" className="h-4 w-4 shrink-0" />
            </a>
          </p>
        )}
      </section>
    </Card>
  );
}
