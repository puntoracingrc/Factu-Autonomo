import {
  AeatPublicIcalendarProvider,
  type AeatPublicIcalendarSourceInspection,
} from "./aeat-public-icalendar-provider";
import { AEAT_CALENDAR_SOURCES } from "./catalog";
import {
  FISCAL_CALENDAR_CATEGORIES,
  type FiscalCalendarCategory,
} from "./types";

assertServerOnlyModule();

export type FiscalCalendarHealthLevel = "ok" | "watch" | "action";

export type FiscalCalendarHealthCode =
  | "OK"
  | "NO_UPCOMING_EVENTS"
  | "EMPTY_FEED"
  | "TRUNCATED_FEED"
  | "PROBE_INCOMPLETE"
  | "NOT_CONFIGURED"
  | "FORBIDDEN"
  | "RATE_LIMITED"
  | "SOURCE_UNAVAILABLE"
  | "TIMEOUT"
  | "NETWORK"
  | "INVALID_RESPONSE";

export interface FiscalCalendarSourceHealth {
  category: FiscalCalendarCategory;
  label: string;
  level: FiscalCalendarHealthLevel;
  code: FiscalCalendarHealthCode;
  checkedAt: string;
  fetchedAt: string | null;
  eventCount: number | null;
  upcomingEventCount: number | null;
  truncated: boolean | null;
  earliestEventDate: string | null;
  latestEventDate: string | null;
  latestSourceUpdatedAt: string | null;
  httpStatus: number | null;
  attempts: number;
}

export interface FiscalCalendarAdminHealth {
  generatedAt: string;
  level: FiscalCalendarHealthLevel;
  label: string;
  headline: string;
  expectedFeeds: number;
  checkedFeeds: number;
  healthyFeeds: number;
  watchFeeds: number;
  actionFeeds: number;
  totalEvents: number;
  feeds: readonly FiscalCalendarSourceHealth[];
  recommendations: readonly string[];
}

interface FiscalCalendarHealthInspector {
  inspectSources(
    categories: readonly FiscalCalendarCategory[],
  ): Promise<readonly AeatPublicIcalendarSourceInspection[]>;
}

interface FiscalCalendarHealthOptions {
  inspector?: FiscalCalendarHealthInspector;
  now?: () => Date;
}

function assertServerOnlyModule() {
  if (typeof window !== "undefined") {
    throw new Error(
      "La comprobación administrativa del calendario solo puede ejecutarse en servidor.",
    );
  }
}

function labelForLevel(level: FiscalCalendarHealthLevel): string {
  if (level === "action") return "Acción necesaria";
  if (level === "watch") return "Vigilar";
  return "Operativo";
}

function safeInteger(value: number, fallback = 0): number {
  if (!Number.isFinite(value)) return fallback;
  return Math.max(0, Math.min(100_000, Math.floor(value)));
}

function sourceHealthFromInspection(
  category: FiscalCalendarCategory,
  inspection: AeatPublicIcalendarSourceInspection | undefined,
  checkedAt: string,
): FiscalCalendarSourceHealth {
  const label = AEAT_CALENDAR_SOURCES[category].label;
  if (!inspection || inspection.category !== category) {
    return {
      category,
      label,
      level: "action",
      code: "PROBE_INCOMPLETE",
      checkedAt,
      fetchedAt: null,
      eventCount: null,
      upcomingEventCount: null,
      truncated: null,
      earliestEventDate: null,
      latestEventDate: null,
      latestSourceUpdatedAt: null,
      httpStatus: null,
      attempts: 1,
    };
  }

  if (!inspection.ok) {
    return {
      category,
      label,
      level: "action",
      code: inspection.code,
      checkedAt,
      fetchedAt: null,
      eventCount: null,
      upcomingEventCount: null,
      truncated: null,
      earliestEventDate: null,
      latestEventDate: null,
      latestSourceUpdatedAt: null,
      httpStatus:
        inspection.status !== null &&
        inspection.status >= 100 &&
        inspection.status <= 599
          ? inspection.status
          : null,
      attempts: Math.max(1, Math.min(3, safeInteger(inspection.attempts, 1))),
    };
  }

  const eventCount = safeInteger(inspection.eventCount);
  const upcomingEventCount = safeInteger(inspection.upcomingEventCount);
  const level: FiscalCalendarHealthLevel =
    inspection.truncated || eventCount === 0
      ? "action"
      : upcomingEventCount === 0
        ? "watch"
        : "ok";
  const code: FiscalCalendarHealthCode = inspection.truncated
    ? "TRUNCATED_FEED"
    : eventCount === 0
      ? "EMPTY_FEED"
      : upcomingEventCount === 0
        ? "NO_UPCOMING_EVENTS"
        : "OK";

  return {
    category,
    label,
    level,
    code,
    checkedAt,
    fetchedAt: inspection.fetchedAt,
    eventCount,
    upcomingEventCount,
    truncated: inspection.truncated,
    earliestEventDate: inspection.earliestEventDate,
    latestEventDate: inspection.latestEventDate,
    latestSourceUpdatedAt: inspection.latestSourceUpdatedAt,
    httpStatus: null,
    attempts: 1,
  };
}

let defaultInspector: FiscalCalendarHealthInspector | undefined;

function getDefaultInspector(): FiscalCalendarHealthInspector {
  defaultInspector ??= new AeatPublicIcalendarProvider();
  return defaultInspector;
}

export async function probeAeatFiscalCalendarAdminHealth(
  options: FiscalCalendarHealthOptions = {},
): Promise<FiscalCalendarAdminHealth> {
  const checkedAt = (options.now?.() ?? new Date()).toISOString();
  const inspections = await (
    options.inspector ?? getDefaultInspector()
  ).inspectSources(FISCAL_CALENDAR_CATEGORIES);
  const inspectionByCategory = new Map(
    inspections.map((inspection) => [inspection.category, inspection]),
  );
  const feeds = FISCAL_CALENDAR_CATEGORIES.map((category) =>
    sourceHealthFromInspection(
      category,
      inspectionByCategory.get(category),
      checkedAt,
    ),
  );
  const actionFeeds = feeds.filter((feed) => feed.level === "action").length;
  const watchFeeds = feeds.filter((feed) => feed.level === "watch").length;
  const healthyFeeds = feeds.filter((feed) => feed.level === "ok").length;
  const checkedFeeds = feeds.filter(
    (feed) => feed.code !== "PROBE_INCOMPLETE",
  ).length;
  const level: FiscalCalendarHealthLevel =
    actionFeeds > 0 ? "action" : watchFeeds > 0 ? "watch" : "ok";
  const headline =
    level === "action"
      ? `${actionFeeds} fuente(s) del calendario requieren reparación.`
      : level === "watch"
        ? `${watchFeeds} fuente(s) no publican próximos eventos.`
        : "Los cinco calendarios públicos responden y contienen eventos.";
  const recommendations =
    level === "action"
      ? [
          "Revisa las fuentes marcadas en rojo y el estado de la publicación oficial.",
          "No sustituyas URLs ni corrijas fechas sin contrastarlas con la AEAT.",
        ]
      : level === "watch"
        ? [
            "Comprueba si la AEAT ha publicado ya el siguiente periodo del calendario.",
          ]
        : ["No se requiere ninguna intervención."];

  return {
    generatedAt: checkedAt,
    level,
    label: labelForLevel(level),
    headline,
    expectedFeeds: FISCAL_CALENDAR_CATEGORIES.length,
    checkedFeeds,
    healthyFeeds,
    watchFeeds,
    actionFeeds,
    totalEvents: feeds.reduce(
      (total, feed) => total + (feed.eventCount ?? 0),
      0,
    ),
    feeds,
    recommendations,
  };
}

export function resetFiscalCalendarAdminHealthForTests(): void {
  defaultInspector = undefined;
}
