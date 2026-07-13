import {
  AlertTriangle,
  CalendarCheck2,
  CheckCircle2,
  Clock3,
  Eye,
} from "lucide-react";
import { Card } from "@/components/ui/Card";
import type {
  FiscalCalendarAdminHealth,
  FiscalCalendarHealthCode,
  FiscalCalendarHealthLevel,
  FiscalCalendarSourceHealth,
} from "@/lib/fiscal-calendar/admin-health";

export interface FiscalCalendarHealthPanelProps {
  health: FiscalCalendarAdminHealth | null;
  notice?: string | null;
}

const EXPECTED_FEEDS = [
  { category: "renta", label: "Renta" },
  { category: "renta_sociedades", label: "Renta y Sociedades" },
  { category: "sociedades", label: "Sociedades" },
  { category: "iva", label: "IVA" },
  {
    category: "declaraciones_informativas",
    label: "Declaraciones informativas",
  },
] as const satisfies ReadonlyArray<{
  category: FiscalCalendarSourceHealth["category"];
  label: string;
}>;

const HEALTH_CODE_LABELS = {
  OK: "Correcto",
  NO_UPCOMING_EVENTS: "Sin próximos eventos publicados",
  EMPTY_FEED: "El feed completo está vacío",
  TRUNCATED_FEED: "La lectura del feed está incompleta",
  PROBE_INCOMPLETE: "Comprobación incompleta",
  NOT_CONFIGURED: "Fuente no configurada",
  FORBIDDEN: "Acceso a la fuente denegado",
  RATE_LIMITED: "Límite temporal de peticiones",
  SOURCE_UNAVAILABLE: "Fuente no disponible",
  TIMEOUT: "Tiempo de espera agotado",
  NETWORK: "Error de conexión",
  INVALID_RESPONSE: "Respuesta no válida",
} as const satisfies Record<FiscalCalendarHealthCode, string>;

const HEALTH_CODES = new Set<string>(Object.keys(HEALTH_CODE_LABELS));
const SENSITIVE_NOTICE_PATTERN =
  /(https?:\/\/|www\.|calendar\.google|BEGIN:VCALENDAR|END:VCALENDAR|authorization|bearer|token|api[_-]?key|secret|password|contraseña)/i;

const DATE_TIME_FORMATTER = new Intl.DateTimeFormat("es-ES", {
  dateStyle: "medium",
  timeStyle: "short",
  timeZone: "Europe/Madrid",
});

const DATE_FORMATTER = new Intl.DateTimeFormat("es-ES", {
  day: "numeric",
  month: "short",
  year: "numeric",
  timeZone: "UTC",
});

function safeHealthCode(value: unknown): FiscalCalendarHealthCode {
  return typeof value === "string" && HEALTH_CODES.has(value)
    ? (value as FiscalCalendarHealthCode)
    : "PROBE_INCOMPLETE";
}

function safeNotice(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const collapsed = value
    .replace(/[\u0000-\u001f\u007f]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  if (!collapsed) return null;
  if (SENSITIVE_NOTICE_PATTERN.test(collapsed)) {
    return "No se pudo obtener un diagnóstico verificable del calendario.";
  }
  return Array.from(collapsed).slice(0, 280).join("");
}

function safeLevel(value: unknown): FiscalCalendarHealthLevel {
  if (value === "ok" || value === "watch") return value;
  return "action";
}

function levelRank(level: FiscalCalendarHealthLevel): number {
  if (level === "action") return 2;
  if (level === "watch") return 1;
  return 0;
}

function highestLevel(
  levels: readonly FiscalCalendarHealthLevel[],
): FiscalCalendarHealthLevel {
  return levels.reduce<FiscalCalendarHealthLevel>(
    (highest, level) =>
      levelRank(level) > levelRank(highest) ? level : highest,
    "ok",
  );
}

function panelTone(level: FiscalCalendarHealthLevel) {
  if (level === "action") {
    return {
      panel:
        "border-red-300 bg-red-50 text-red-950 dark:border-red-800 dark:bg-red-950/35 dark:text-red-100",
      badge: "bg-red-600 text-white dark:bg-red-500 dark:text-red-950",
      icon: "bg-red-600 text-white dark:bg-red-500 dark:text-red-950",
      metric:
        "border-red-200 bg-white/70 dark:border-red-900/70 dark:bg-red-950/45",
    };
  }
  if (level === "watch") {
    return {
      panel:
        "border-amber-300 bg-amber-50 text-amber-950 dark:border-amber-800 dark:bg-amber-950/35 dark:text-amber-100",
      badge: "bg-amber-500 text-white dark:bg-amber-400 dark:text-amber-950",
      icon: "bg-amber-500 text-white dark:bg-amber-400 dark:text-amber-950",
      metric:
        "border-amber-200 bg-white/70 dark:border-amber-900/70 dark:bg-amber-950/45",
    };
  }
  return {
    panel:
      "border-emerald-300 bg-emerald-50 text-emerald-950 dark:border-emerald-800 dark:bg-emerald-950/35 dark:text-emerald-100",
    badge:
      "bg-emerald-600 text-white dark:bg-emerald-500 dark:text-emerald-950",
    icon:
      "bg-emerald-600 text-white dark:bg-emerald-500 dark:text-emerald-950",
    metric:
      "border-emerald-200 bg-white/70 dark:border-emerald-900/70 dark:bg-emerald-950/45",
  };
}

function feedTone(level: FiscalCalendarHealthLevel) {
  if (level === "action") {
    return {
      panel:
        "border-red-200 bg-white/80 dark:border-red-900/70 dark:bg-red-950/45",
      badge: "bg-red-100 text-red-800 dark:bg-red-900/70 dark:text-red-100",
      dot: "bg-red-500",
    };
  }
  if (level === "watch") {
    return {
      panel:
        "border-amber-200 bg-white/80 dark:border-amber-900/70 dark:bg-amber-950/45",
      badge:
        "bg-amber-100 text-amber-800 dark:bg-amber-900/70 dark:text-amber-100",
      dot: "bg-amber-500",
    };
  }
  return {
    panel:
      "border-emerald-200 bg-white/80 dark:border-emerald-900/70 dark:bg-emerald-950/45",
    badge:
      "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/70 dark:text-emerald-100",
    dot: "bg-emerald-500",
  };
}

function levelLabel(level: FiscalCalendarHealthLevel): string {
  if (level === "action") return "Acción necesaria";
  if (level === "watch") return "Vigilar";
  return "Operativo";
}

function validNonNegativeInteger(value: unknown): number | null {
  if (typeof value !== "number" || !Number.isFinite(value) || value < 0) {
    return null;
  }
  return Math.floor(value);
}

function formatInteger(value: unknown): string {
  const safe = validNonNegativeInteger(value);
  return safe === null ? "—" : safe.toLocaleString("es-ES");
}

function formatDateTime(value: unknown): string {
  if (typeof value !== "string") return "Sin fecha confirmada";
  const timestamp = Date.parse(value);
  if (!Number.isFinite(timestamp)) return "Sin fecha confirmada";
  return DATE_TIME_FORMATTER.format(new Date(timestamp));
}

function formatDate(value: unknown): string {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return "Sin fecha confirmada";
  }
  const timestamp = Date.parse(`${value}T12:00:00.000Z`);
  if (!Number.isFinite(timestamp)) return "Sin fecha confirmada";
  return DATE_FORMATTER.format(new Date(timestamp));
}

function eventCoverage(feed: FiscalCalendarSourceHealth | null): string {
  if (!feed?.earliestEventDate || !feed.latestEventDate) {
    return "Sin cobertura confirmada";
  }
  return `${formatDate(feed.earliestEventDate)} – ${formatDate(
    feed.latestEventDate,
  )}`;
}

interface FeedDiagnostic {
  category: FiscalCalendarSourceHealth["category"];
  label: string;
  level: FiscalCalendarHealthLevel;
  code: FiscalCalendarHealthCode;
  feed: FiscalCalendarSourceHealth | null;
}

function diagnosticsFromHealth(
  health: FiscalCalendarAdminHealth | null,
): { diagnostics: FeedDiagnostic[]; complete: boolean } {
  const diagnostics = EXPECTED_FEEDS.map(({ category, label }) => {
    const matches = health?.feeds.filter((feed) => feed.category === category) ?? [];
    const feed = matches.length === 1 ? matches[0] : null;
    const code = safeHealthCode(feed?.code);
    return {
      category,
      label,
      level: feed && code !== "PROBE_INCOMPLETE" ? safeLevel(feed.level) : "action",
      code,
      feed,
    } satisfies FeedDiagnostic;
  });
  const complete = Boolean(
    health &&
      health.feeds.length === EXPECTED_FEEDS.length &&
      health.checkedFeeds === EXPECTED_FEEDS.length &&
      diagnostics.every(
        (diagnostic) =>
          diagnostic.feed !== null && diagnostic.code !== "PROBE_INCOMPLETE",
      ),
  );
  return { diagnostics, complete };
}

function headlineFor(
  health: FiscalCalendarAdminHealth | null,
  complete: boolean,
  level: FiscalCalendarHealthLevel,
  actionFeeds: number,
  watchFeeds: number,
): string {
  if (!health || !complete) {
    return "No se puede confirmar el estado de las cinco fuentes del calendario.";
  }
  if (level === "action") {
    return actionFeeds === 1
      ? "Una fuente del calendario requiere reparación."
      : `${actionFeeds} fuentes del calendario requieren reparación.`;
  }
  if (level === "watch") {
    return watchFeeds === 1
      ? "Una fuente necesita seguimiento."
      : `${watchFeeds} fuentes necesitan seguimiento.`;
  }
  return "Los cinco feeds públicos responden y contienen eventos.";
}

function diagnosticDescription(code: FiscalCalendarHealthCode): string {
  if (code === "NO_UPCOMING_EVENTS") {
    return "El feed es válido, pero aún no incluye fechas futuras.";
  }
  if (code === "OK") {
    return "Enlace, respuesta y lectura del calendario correctos.";
  }
  if (code === "EMPTY_FEED") {
    return "La fuente respondió, pero el calendario completo no contiene eventos.";
  }
  if (code === "TRUNCATED_FEED") {
    return "No se puede garantizar que se hayan leído todos los eventos.";
  }
  if (code === "PROBE_INCOMPLETE") {
    return "No hay un diagnóstico completo y verificable para esta fuente.";
  }
  return "La fuente no pudo superar todas las comprobaciones técnicas.";
}

function FeedCard({ diagnostic }: { diagnostic: FeedDiagnostic }) {
  const { category, label, level, code, feed } = diagnostic;
  const tone = feedTone(level);
  const status =
    feed?.httpStatus && feed.httpStatus >= 100 && feed.httpStatus <= 599
      ? String(Math.floor(feed.httpStatus))
      : "—";

  return (
    <li
      data-feed-category={category}
      data-health-level={level}
      data-health-code={code}
      className={`min-w-0 overflow-hidden rounded-2xl border p-4 ${tone.panel}`}
    >
      <div className="flex min-w-0 flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <div className="flex min-w-0 items-start gap-2">
            <span
              aria-hidden="true"
              className={`mt-2 h-2.5 w-2.5 shrink-0 rounded-full ${tone.dot}`}
            />
            <h3 className="min-w-0 break-words text-base font-black text-slate-950 dark:text-slate-50">
              {label}
            </h3>
          </div>
          <p className="mt-2 break-words text-sm font-semibold leading-6 text-slate-700 dark:text-slate-200">
            {HEALTH_CODE_LABELS[code]}
          </p>
          <p className="mt-1 break-words text-xs leading-5 text-slate-600 dark:text-slate-300">
            {diagnosticDescription(code)}
          </p>
        </div>
        <span
          className={`inline-flex w-fit shrink-0 rounded-full px-2.5 py-1 text-xs font-black uppercase tracking-wide ${tone.badge}`}
        >
          {levelLabel(level)}
        </span>
      </div>

      <dl className="mt-4 grid min-w-0 grid-cols-1 gap-2 text-sm sm:grid-cols-2">
        <div className="min-w-0 rounded-xl bg-slate-50/90 p-3 dark:bg-slate-950/55">
          <dt className="text-xs font-bold text-slate-500 dark:text-slate-400">
            Eventos del feed completo
          </dt>
          <dd className="mt-1 break-words font-black tabular-nums text-slate-950 dark:text-slate-50">
            {formatInteger(feed?.eventCount)}
          </dd>
        </div>
        <div className="min-w-0 rounded-xl bg-slate-50/90 p-3 dark:bg-slate-950/55">
          <dt className="text-xs font-bold text-slate-500 dark:text-slate-400">
            Eventos próximos
          </dt>
          <dd className="mt-1 break-words font-black tabular-nums text-slate-950 dark:text-slate-50">
            {formatInteger(feed?.upcomingEventCount)}
          </dd>
        </div>
        <div className="min-w-0 rounded-xl bg-slate-50/90 p-3 dark:bg-slate-950/55">
          <dt className="text-xs font-bold text-slate-500 dark:text-slate-400">
            HTTP / intentos
          </dt>
          <dd className="mt-1 break-words font-semibold tabular-nums text-slate-800 dark:text-slate-100">
            {status} / {formatInteger(feed?.attempts)}
          </dd>
        </div>
        <div className="min-w-0 rounded-xl bg-slate-50/90 p-3 dark:bg-slate-950/55">
          <dt className="text-xs font-bold text-slate-500 dark:text-slate-400">
            Lectura completa
          </dt>
          <dd className="mt-1 break-words font-semibold text-slate-800 dark:text-slate-100">
            {feed?.truncated === false
              ? "Sí"
              : feed?.truncated === true
                ? "No"
                : "Sin confirmar"}
          </dd>
        </div>
      </dl>

      <dl className="mt-3 min-w-0 space-y-2 border-t border-slate-200/80 pt-3 text-xs dark:border-slate-700/80">
        <div className="grid min-w-0 gap-1 sm:grid-cols-[9rem_minmax(0,1fr)]">
          <dt className="font-bold text-slate-500 dark:text-slate-400">
            Cobertura
          </dt>
          <dd className="min-w-0 break-words text-slate-700 dark:text-slate-200">
            {eventCoverage(feed)}
          </dd>
        </div>
        <div className="grid min-w-0 gap-1 sm:grid-cols-[9rem_minmax(0,1fr)]">
          <dt className="font-bold text-slate-500 dark:text-slate-400">
            Actualización origen
          </dt>
          <dd className="min-w-0 break-words text-slate-700 dark:text-slate-200">
            {formatDateTime(feed?.latestSourceUpdatedAt)}
          </dd>
        </div>
        <div className="grid min-w-0 gap-1 sm:grid-cols-[9rem_minmax(0,1fr)]">
          <dt className="font-bold text-slate-500 dark:text-slate-400">
            Comprobado
          </dt>
          <dd className="min-w-0 break-words text-slate-700 dark:text-slate-200">
            {formatDateTime(feed?.checkedAt)}
          </dd>
        </div>
      </dl>

      <p className="mt-3 break-words font-mono text-[11px] font-bold text-slate-500 dark:text-slate-400">
        Código: {code}
      </p>
    </li>
  );
}

export function FiscalCalendarHealthPanel({
  health,
  notice,
}: FiscalCalendarHealthPanelProps) {
  const displayedNotice = safeNotice(notice);
  const { diagnostics, complete } = diagnosticsFromHealth(health);
  const diagnosticLevel = highestLevel(
    diagnostics.map((diagnostic) => diagnostic.level),
  );
  const level = highestLevel([
    diagnosticLevel,
    health ? safeLevel(health.level) : "action",
  ]);
  const tone = panelTone(level);
  const checkedFeeds = diagnostics.filter(
    (diagnostic) =>
      diagnostic.feed !== null && diagnostic.code !== "PROBE_INCOMPLETE",
  ).length;
  const healthyFeeds = diagnostics.filter(
    (diagnostic) => diagnostic.level === "ok",
  ).length;
  const watchFeeds = diagnostics.filter(
    (diagnostic) => diagnostic.level === "watch",
  ).length;
  const actionFeeds = diagnostics.filter(
    (diagnostic) => diagnostic.level === "action",
  ).length;
  const totalEvents = diagnostics.reduce((total, diagnostic) => {
    return total + (validNonNegativeInteger(diagnostic.feed?.eventCount) ?? 0);
  }, 0);
  const headline = headlineFor(
    health,
    complete,
    level,
    actionFeeds,
    watchFeeds,
  );
  const StatusIcon =
    level === "action"
      ? AlertTriangle
      : level === "watch"
        ? Eye
        : CheckCircle2;

  const metrics = [
    ["Fuentes comprobadas", `${checkedFeeds} / ${EXPECTED_FEEDS.length}`],
    ["Correctas", formatInteger(healthyFeeds)],
    ["Vigilar", formatInteger(watchFeeds)],
    ["Acción", formatInteger(actionFeeds)],
    ["Eventos en feeds", health ? formatInteger(totalEvents) : "—"],
  ] as const;

  return (
    <Card
      role={level === "action" ? "alert" : "status"}
      aria-labelledby="fiscal-calendar-health-title"
      data-health-level={level}
      data-health-available={health !== null ? "true" : "false"}
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
                  id="fiscal-calendar-health-title"
                  className="break-words text-xl font-black text-slate-950 dark:text-slate-50"
                >
                  Salud del calendario fiscal
                </h2>
                <span
                  className={`inline-flex rounded-full px-3 py-1 text-xs font-black uppercase tracking-wide ${tone.badge}`}
                >
                  {levelLabel(level)}
                </span>
              </div>
              <p className="mt-2 break-words text-lg font-black leading-7 text-slate-950 dark:text-slate-50">
                {headline}
              </p>
              <p className="mt-2 max-w-3xl break-words text-sm leading-6 text-slate-700 dark:text-slate-200">
                Esta comprobación lee el feed completo de cada fuente. Que un
                rango de fechas elegido por un usuario no tenga resultados no
                activa por sí solo una alerta.
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
            <time
              dateTime={health?.generatedAt}
              className="min-w-0 break-words"
            >
              {formatDateTime(health?.generatedAt)}
            </time>
          </div>
        </div>

        <div className="mt-5 grid min-w-0 grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-5">
          {metrics.map(([label, value]) => (
            <div
              key={label}
              className={`min-w-0 rounded-2xl border p-3 ${tone.metric}`}
            >
              <p className="break-words text-xs font-bold text-slate-500 dark:text-slate-400">
                {label}
              </p>
              <p className="mt-1 break-words text-xl font-black tabular-nums text-slate-950 dark:text-slate-50">
                {value}
              </p>
            </div>
          ))}
        </div>

        <div className="mt-6 flex min-w-0 items-center gap-2">
          <CalendarCheck2
            aria-hidden="true"
            className="h-5 w-5 shrink-0 text-slate-700 dark:text-slate-200"
          />
          <h3 className="break-words text-base font-black text-slate-950 dark:text-slate-50">
            Diagnóstico de las cinco fuentes
          </h3>
        </div>

        <ul className="mt-3 grid min-w-0 gap-3 xl:grid-cols-2">
          {diagnostics.map((diagnostic) => (
            <FeedCard key={diagnostic.category} diagnostic={diagnostic} />
          ))}
        </ul>
      </section>
    </Card>
  );
}
