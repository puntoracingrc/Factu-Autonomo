import { getAeatCalendarSource } from "./catalog";
import { eventOverlapsRange, todayInMadrid } from "./dates";
import {
  FiscalCalendarProviderError,
  type FiscalCalendarProviderErrorCode,
} from "./errors";
import {
  normalizeGoogleCalendarEvent,
  sortFiscalCalendarEvents,
} from "./normalize-google-event";
import { parseAeatIcalendar } from "./parse-icalendar";
import type {
  FiscalCalendarCategory,
  FiscalCalendarDateRange,
  FiscalCalendarEvent,
  FiscalCalendarProvider,
  FiscalCalendarProviderResult,
} from "./types";

assertServerOnlyModule();

const DEFAULT_TIMEOUT_MS = 10_000;
const MAX_TIMEOUT_MS = 15_000;
const DEFAULT_MAX_ATTEMPTS = 2;
const MAX_ATTEMPTS = 3;
const DEFAULT_SOURCE_CACHE_TTL_MS = 10 * 60_000;
const MAX_SOURCE_CACHE_TTL_MS = 60 * 60_000;
const MAX_RESPONSE_BYTES = 3 * 1024 * 1024;
const MAX_TOTAL_EVENTS = 1_000;
const MAX_RETRY_DELAY_MS = 1_000;
const ALLOWED_FEED_HOST = "calendar.google.com";

type FetchLike = typeof fetch;

interface AeatPublicIcalendarProviderOptions {
  fetchImpl?: FetchLike;
  now?: () => Date;
  timeoutMs?: number;
  maxAttempts?: number;
  sourceCacheTtlMs?: number;
  sleep?: (delayMs: number) => Promise<void>;
}

interface SourceSnapshot {
  events: readonly FiscalCalendarEvent[];
  fetchedAt: string;
  truncated: boolean;
}

interface SourceCacheEntry {
  expiresAt: number;
  promise: Promise<SourceSnapshot>;
}

export type AeatPublicIcalendarSourceInspection =
  | {
      category: FiscalCalendarCategory;
      ok: true;
      fetchedAt: string;
      eventCount: number;
      upcomingEventCount: number;
      truncated: boolean;
      earliestEventDate: string | null;
      latestEventDate: string | null;
      latestSourceUpdatedAt: string | null;
    }
  | {
      category: FiscalCalendarCategory;
      ok: false;
      code: FiscalCalendarProviderErrorCode;
      status: number | null;
      attempts: number;
      retryable: boolean;
    };

function assertServerOnlyModule() {
  if (typeof window !== "undefined") {
    throw new Error(
      "El proveedor iCalendar público de la AEAT solo puede cargarse en servidor.",
    );
  }
}

function boundedInteger(
  value: number | undefined,
  fallback: number,
  maximum: number,
): number {
  if (!Number.isFinite(value)) return fallback;
  return Math.max(1, Math.min(maximum, Math.floor(value as number)));
}

function controlledRequestSignal(timeoutMs: number) {
  const controller = new AbortController();
  let timedOut = false;
  const timeout = setTimeout(() => {
    timedOut = true;
    controller.abort();
  }, timeoutMs);
  return {
    signal: controller.signal,
    abort: () => controller.abort(),
    timedOut: () => timedOut,
    dispose: () => clearTimeout(timeout),
  };
}

async function cancelResponseBody(response: Response): Promise<void> {
  try {
    await response.body?.cancel();
  } catch {
    // El cuerpo externo se descarta sin registrar contenido.
  }
}

function invalidResponse(status?: number): FiscalCalendarProviderError {
  return new FiscalCalendarProviderError({
    code: "INVALID_RESPONSE",
    status,
    retryable: false,
    attempts: 1,
  });
}

async function readBoundedIcalendar(
  response: Response,
  onLimitExceeded: () => void,
  timedOut: () => boolean,
): Promise<string> {
  const advertisedLength = Number(response.headers.get("content-length"));
  if (
    Number.isFinite(advertisedLength) &&
    advertisedLength > MAX_RESPONSE_BYTES
  ) {
    await cancelResponseBody(response);
    onLimitExceeded();
    throw invalidResponse(response.status);
  }
  if (!response.body) throw invalidResponse(response.status);

  const reader = response.body.getReader();
  const decoder = new TextDecoder("utf-8", { fatal: true });
  const chunks: string[] = [];
  let receivedBytes = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      receivedBytes += value.byteLength;
      if (receivedBytes > MAX_RESPONSE_BYTES) {
        try {
          await reader.cancel();
        } catch {
          // AbortController puede haber cerrado ya la conexión.
        }
        onLimitExceeded();
        throw invalidResponse(response.status);
      }
      chunks.push(decoder.decode(value, { stream: true }));
    }
    chunks.push(decoder.decode());
    return chunks.join("");
  } catch (error) {
    if (error instanceof FiscalCalendarProviderError) throw error;
    if (timedOut()) throw error;
    throw invalidResponse(response.status);
  } finally {
    try {
      reader.releaseLock();
    } catch {
      // Un reader cancelado no requiere más trabajo.
    }
  }
}

function validatedFeedUrl(category: FiscalCalendarCategory): URL {
  const source = getAeatCalendarSource(category);
  let url: URL;
  try {
    url = new URL(source.icalUrl);
  } catch {
    throw invalidResponse();
  }
  if (
    url.protocol !== "https:" ||
    url.hostname !== ALLOWED_FEED_HOST ||
    url.port !== "" ||
    url.username !== "" ||
    url.password !== "" ||
    url.search !== "" ||
    url.hash !== "" ||
    !url.pathname.startsWith("/calendar/ical/") ||
    !url.pathname.endsWith("/public/basic.ics")
  ) {
    throw invalidResponse();
  }
  return url;
}

function transientStatus(status: number): boolean {
  return status === 408 || status === 425 || status === 429 || status >= 500;
}

function statusError(status: number, attempts: number) {
  const retryable = transientStatus(status);
  return new FiscalCalendarProviderError({
    code:
      status === 403
        ? "FORBIDDEN"
        : status === 429
          ? "RATE_LIMITED"
          : "SOURCE_UNAVAILABLE",
    status,
    retryable,
    attempts,
  });
}

async function defaultSleep(delayMs: number): Promise<void> {
  await new Promise<void>((resolve) => setTimeout(resolve, delayMs));
}

export class AeatPublicIcalendarProvider implements FiscalCalendarProvider {
  private readonly fetchImpl: FetchLike;
  private readonly now: () => Date;
  private readonly timeoutMs: number;
  private readonly maxAttempts: number;
  private readonly sourceCacheTtlMs: number;
  private readonly sleep: (delayMs: number) => Promise<void>;
  private readonly sourceCache = new Map<
    FiscalCalendarCategory,
    SourceCacheEntry
  >();

  constructor(options: AeatPublicIcalendarProviderOptions = {}) {
    this.fetchImpl = options.fetchImpl ?? fetch;
    this.now = options.now ?? (() => new Date());
    this.timeoutMs = boundedInteger(
      options.timeoutMs,
      DEFAULT_TIMEOUT_MS,
      MAX_TIMEOUT_MS,
    );
    this.maxAttempts = boundedInteger(
      options.maxAttempts,
      DEFAULT_MAX_ATTEMPTS,
      MAX_ATTEMPTS,
    );
    this.sourceCacheTtlMs = boundedInteger(
      options.sourceCacheTtlMs,
      DEFAULT_SOURCE_CACHE_TTL_MS,
      MAX_SOURCE_CACHE_TTL_MS,
    );
    this.sleep = options.sleep ?? defaultSleep;
  }

  private async requestFeed(category: FiscalCalendarCategory): Promise<string> {
    const url = validatedFeedUrl(category);
    let attempts = 0;
    while (attempts < this.maxAttempts) {
      attempts += 1;
      const controlled = controlledRequestSignal(this.timeoutMs);
      let response: Response | null = null;
      try {
        response = await this.fetchImpl(url, {
          method: "GET",
          headers: { Accept: "text/calendar" },
          cache: "no-store",
          redirect: "error",
          signal: controlled.signal,
        });
        if (!response.ok) {
          await cancelResponseBody(response);
          const failure = statusError(response.status, attempts);
          if (!failure.retryable || attempts >= this.maxAttempts) throw failure;
          controlled.dispose();
          await this.sleep(
            Math.min(MAX_RETRY_DELAY_MS, 100 * 2 ** (attempts - 1)),
          );
          continue;
        }
        const contentType = response.headers.get("content-type")?.toLowerCase();
        if (!contentType?.startsWith("text/calendar")) {
          await cancelResponseBody(response);
          throw invalidResponse(response.status);
        }
        return await readBoundedIcalendar(
          response,
          controlled.abort,
          controlled.timedOut,
        );
      } catch (error) {
        if (error instanceof FiscalCalendarProviderError) throw error;
        const failure = new FiscalCalendarProviderError({
          code: controlled.timedOut() ? "TIMEOUT" : "NETWORK",
          retryable: true,
          attempts,
        });
        if (attempts >= this.maxAttempts) throw failure;
        controlled.dispose();
        await this.sleep(
          Math.min(MAX_RETRY_DELAY_MS, 100 * 2 ** (attempts - 1)),
        );
      } finally {
        controlled.dispose();
      }
    }
    throw new FiscalCalendarProviderError({
      code: "SOURCE_UNAVAILABLE",
      retryable: true,
      attempts: this.maxAttempts,
    });
  }

  private async fetchSource(
    category: FiscalCalendarCategory,
  ): Promise<SourceSnapshot> {
    const fetchedAt = this.now().toISOString();
    const parsed = parseAeatIcalendar(await this.requestFeed(category));
    if (!parsed) throw invalidResponse();

    const events: FiscalCalendarEvent[] = [];
    let truncated = parsed.truncated;
    for (const payload of parsed.events) {
      const normalized = normalizeGoogleCalendarEvent(
        payload,
        category,
        fetchedAt,
      );
      if (!normalized || normalized.status === "cancelled") {
        truncated ||= Boolean(normalized === null);
        continue;
      }
      events.push(normalized);
    }
    return {
      events: sortFiscalCalendarEvents(events),
      fetchedAt,
      truncated,
    };
  }

  private sourceSnapshot(
    category: FiscalCalendarCategory,
  ): Promise<SourceSnapshot> {
    const nowMs = this.now().getTime();
    const cached = this.sourceCache.get(category);
    if (cached && cached.expiresAt > nowMs) return cached.promise;

    const promise = this.fetchSource(category);
    const entry: SourceCacheEntry = {
      expiresAt: nowMs + this.sourceCacheTtlMs,
      promise,
    };
    this.sourceCache.set(category, entry);
    void promise.catch(() => {
      if (this.sourceCache.get(category) === entry) {
        this.sourceCache.delete(category);
      }
    });
    return promise;
  }

  /**
   * Diagnóstico server-only del feed completo, antes de aplicar rangos de UI.
   * Reutiliza la misma allowlist, descarga acotada, parser y caché del calendario.
   */
  async inspectSources(
    categories: readonly FiscalCalendarCategory[],
  ): Promise<readonly AeatPublicIcalendarSourceInspection[]> {
    const today = todayInMadrid(this.now());
    return Promise.all(
      categories.map(async (category) => {
        try {
          const snapshot = await this.sourceSnapshot(category);
          const eventDates = snapshot.events.map((event) =>
            event.startDate.slice(0, 10),
          );
          const updatedDates = snapshot.events
            .map((event) => event.sourceUpdatedAt)
            .filter((value): value is string => Boolean(value))
            .sort();
          return {
            category,
            ok: true as const,
            fetchedAt: snapshot.fetchedAt,
            eventCount: snapshot.events.length,
            upcomingEventCount: snapshot.events.filter(
              (event) => event.endDateExclusive.slice(0, 10) > today,
            ).length,
            truncated: snapshot.truncated,
            earliestEventDate:
              eventDates.length > 0 ? [...eventDates].sort()[0] : null,
            latestEventDate:
              eventDates.length > 0 ? [...eventDates].sort().at(-1) ?? null : null,
            latestSourceUpdatedAt: updatedDates.at(-1) ?? null,
          };
        } catch (error) {
          const failure =
            error instanceof FiscalCalendarProviderError
              ? error
              : new FiscalCalendarProviderError({
                  code: "SOURCE_UNAVAILABLE",
                  retryable: true,
                  attempts: 1,
                });
          return {
            category,
            ok: false as const,
            code: failure.code,
            status: failure.status ?? null,
            attempts: failure.attempts,
            retryable: failure.retryable,
          };
        }
      }),
    );
  }

  async listEvents(
    dateRange: FiscalCalendarDateRange,
    categories: readonly FiscalCalendarCategory[],
  ): Promise<FiscalCalendarProviderResult> {
    const snapshots = await Promise.all(
      categories.map((category) => this.sourceSnapshot(category)),
    );
    const eventsById = new Map<string, FiscalCalendarEvent>();
    let truncated = snapshots.some((snapshot) => snapshot.truncated);

    for (const snapshot of snapshots) {
      for (const event of snapshot.events) {
        if (!eventOverlapsRange(event, dateRange)) continue;
        if (eventsById.size >= MAX_TOTAL_EVENTS) {
          truncated = true;
          break;
        }
        eventsById.set(event.id, event);
      }
    }

    return {
      events: sortFiscalCalendarEvents([...eventsById.values()]),
      fetchedAt:
        snapshots.map((snapshot) => snapshot.fetchedAt).sort()[0] ??
        this.now().toISOString(),
      providerMode: "aeat-icalendar",
      truncated,
    };
  }
}
