import { getAeatCalendarSource, FISCAL_CALENDAR_TIME_ZONE } from "./catalog";
import { FiscalCalendarProviderError } from "./errors";
import {
  normalizeGoogleCalendarEvent,
  sortFiscalCalendarEvents,
  type GoogleCalendarEventPayload,
} from "./normalize-google-event";
import type {
  FiscalCalendarCategory,
  FiscalCalendarDateRange,
  FiscalCalendarEvent,
  FiscalCalendarProvider,
  FiscalCalendarProviderResult,
} from "./types";

assertServerOnlyModule();

const GOOGLE_CALENDAR_API_BASE =
  "https://www.googleapis.com/calendar/v3/calendars";
const DEFAULT_TIMEOUT_MS = 5_000;
const MAX_TIMEOUT_MS = 10_000;
const DEFAULT_MAX_ATTEMPTS = 3;
const MAX_ATTEMPTS = 3;
const MAX_RETRY_DELAY_MS = 1_000;
const MAX_RESULTS_PER_PAGE = 250;
const MAX_PAGES_PER_CALENDAR = 10;
const MAX_TOTAL_EVENTS = 1_000;
const MAX_RESPONSE_BYTES = 1024 * 1024;
const MAX_ERROR_RESPONSE_BYTES = 64 * 1024;
const RESPONSE_FIELDS = [
  "nextPageToken",
  "timeZone",
  "updated",
  "items(id,iCalUID,status,summary,description,start,end,updated,recurringEventId,originalStartTime)",
].join(",");

type FetchLike = typeof fetch;

interface GooglePublicCalendarProviderOptions {
  apiKey: string;
  fetchImpl?: FetchLike;
  now?: () => Date;
  timeoutMs?: number;
  maxAttempts?: number;
  sleep?: (delayMs: number) => Promise<void>;
  random?: () => number;
}

interface GoogleCalendarPage {
  items: GoogleCalendarEventPayload[];
  nextPageToken: string | null;
  truncated: boolean;
}

function assertServerOnlyModule() {
  if (typeof window !== "undefined") {
    throw new Error(
      "El proveedor Google Calendar público solo puede cargarse en servidor.",
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
    // El cuerpo externo se descarta sin registrarlo.
  }
}

function invalidResponseError(response: Response) {
  return new FiscalCalendarProviderError({
    code: "INVALID_RESPONSE",
    status: response.status,
    retryable: false,
    attempts: 1,
  });
}

async function readBoundedText(
  response: Response,
  maxBytes: number,
  onLimitExceeded: () => void,
): Promise<string> {
  const advertisedLength = Number(response.headers.get("content-length"));
  if (Number.isFinite(advertisedLength) && advertisedLength > maxBytes) {
    await cancelResponseBody(response);
    onLimitExceeded();
    throw invalidResponseError(response);
  }

  if (!response.body) return "";
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  const chunks: string[] = [];
  let receivedBytes = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      receivedBytes += value.byteLength;
      if (receivedBytes > maxBytes) {
        try {
          await reader.cancel();
        } catch {
          // La conexión externa ya puede estar cerrada por AbortController.
        }
        onLimitExceeded();
        throw invalidResponseError(response);
      }
      chunks.push(decoder.decode(value, { stream: true }));
    }
    chunks.push(decoder.decode());
    return chunks.join("");
  } finally {
    try {
      reader.releaseLock();
    } catch {
      // El reader cancelado no requiere más trabajo.
    }
  }
}

async function readGooglePage(
  response: Response,
  onLimitExceeded: () => void,
): Promise<GoogleCalendarPage> {
  let value: unknown;
  try {
    value = JSON.parse(
      await readBoundedText(
        response,
        MAX_RESPONSE_BYTES,
        onLimitExceeded,
      ),
    );
  } catch (error) {
    if (error instanceof FiscalCalendarProviderError) throw error;
    throw new FiscalCalendarProviderError({
      code: "INVALID_RESPONSE",
      status: response.status,
      retryable: false,
      attempts: 1,
    });
  }
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new FiscalCalendarProviderError({
      code: "INVALID_RESPONSE",
      status: response.status,
      retryable: false,
      attempts: 1,
    });
  }

  const record = value as Record<string, unknown>;
  if (record.items !== undefined && !Array.isArray(record.items)) {
    throw invalidResponseError(response);
  }
  const rawItems = record.items ?? [];
  if (
    rawItems.some(
      (item) => !item || typeof item !== "object" || Array.isArray(item),
    )
  ) {
    throw invalidResponseError(response);
  }
  if (
    record.nextPageToken !== undefined &&
    (typeof record.nextPageToken !== "string" ||
      record.nextPageToken.length > 2_048)
  ) {
    throw invalidResponseError(response);
  }
  const nextPageToken =
    typeof record.nextPageToken === "string"
      ? record.nextPageToken
      : null;
  return {
    items: rawItems.slice(
      0,
      MAX_RESULTS_PER_PAGE,
    ) as GoogleCalendarEventPayload[],
    nextPageToken,
    truncated: rawItems.length > MAX_RESULTS_PER_PAGE,
  };
}

async function googleErrorReason(
  response: Response,
  onLimitExceeded: () => void,
): Promise<string | null> {
  try {
    const text = await readBoundedText(
      response,
      MAX_ERROR_RESPONSE_BYTES,
      onLimitExceeded,
    );
    const value = JSON.parse(text) as {
      error?: { errors?: Array<{ reason?: unknown }> };
    };
    const reason = value.error?.errors?.[0]?.reason;
    return typeof reason === "string" ? reason : null;
  } catch {
    return null;
  }
}

function transientGoogleStatus(status: number, reason: string | null): boolean {
  if (status === 403) {
    return reason === "rateLimitExceeded" || reason === "userRateLimitExceeded";
  }
  return status === 408 || status === 425 || status === 429 || status >= 500;
}

function providerErrorForStatus(
  status: number,
  reason: string | null,
  attempts: number,
): FiscalCalendarProviderError {
  const retryable = transientGoogleStatus(status, reason);
  const code =
    status === 403 && !retryable
      ? "FORBIDDEN"
      : status === 429 || (status === 403 && retryable)
        ? "RATE_LIMITED"
        : "SOURCE_UNAVAILABLE";
  return new FiscalCalendarProviderError({
    code,
    status,
    retryable,
    attempts,
  });
}

function retryDelayMs(
  response: Response | null,
  attempt: number,
  random: () => number,
): number | null {
  const retryAfter = response?.headers.get("retry-after");
  if (retryAfter) {
    const seconds = Number(retryAfter);
    if (Number.isFinite(seconds) && seconds >= 0) {
      const delay = Math.round(seconds * 1_000);
      return delay <= MAX_RETRY_DELAY_MS ? delay : null;
    }
    const retryAt = Date.parse(retryAfter);
    if (Number.isFinite(retryAt)) {
      const delay = Math.max(0, retryAt - Date.now());
      return delay <= MAX_RETRY_DELAY_MS ? delay : null;
    }
  }
  const jitter = Math.floor(Math.max(0, Math.min(1, random())) * 100);
  return Math.min(
    MAX_RETRY_DELAY_MS,
    100 * 2 ** Math.max(0, attempt - 1) + jitter,
  );
}

async function defaultSleep(delayMs: number): Promise<void> {
  await new Promise<void>((resolve) => setTimeout(resolve, delayMs));
}

export class GooglePublicCalendarProvider
  implements FiscalCalendarProvider
{
  private readonly apiKey: string;
  private readonly fetchImpl: FetchLike;
  private readonly now: () => Date;
  private readonly timeoutMs: number;
  private readonly maxAttempts: number;
  private readonly sleep: (delayMs: number) => Promise<void>;
  private readonly random: () => number;

  constructor(options: GooglePublicCalendarProviderOptions) {
    const apiKey = options.apiKey.trim();
    if (!apiKey) {
      throw new FiscalCalendarProviderError({
        code: "NOT_CONFIGURED",
        retryable: false,
        attempts: 0,
      });
    }
    this.apiKey = apiKey;
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
    this.sleep = options.sleep ?? defaultSleep;
    this.random = options.random ?? Math.random;
  }

  private eventListUrl(
    category: FiscalCalendarCategory,
    dateRange: FiscalCalendarDateRange,
    pageToken: string | null,
  ): URL {
    const source = getAeatCalendarSource(category);
    const url = new URL(
      `${GOOGLE_CALENDAR_API_BASE}/${encodeURIComponent(source.calendarId)}/events`,
    );
    url.searchParams.set("timeMin", dateRange.timeMin);
    url.searchParams.set("timeMax", dateRange.timeMax);
    url.searchParams.set("singleEvents", "true");
    url.searchParams.set("orderBy", "startTime");
    url.searchParams.set("showDeleted", "false");
    url.searchParams.set("timeZone", FISCAL_CALENDAR_TIME_ZONE);
    url.searchParams.set("maxResults", String(MAX_RESULTS_PER_PAGE));
    url.searchParams.set("fields", RESPONSE_FIELDS);
    if (pageToken) url.searchParams.set("pageToken", pageToken);
    return url;
  }

  private async requestPage(url: URL): Promise<GoogleCalendarPage> {
    let attempts = 0;
    while (attempts < this.maxAttempts) {
      attempts += 1;
      const controlled = controlledRequestSignal(this.timeoutMs);
      let response: Response | null = null;
      try {
        response = await this.fetchImpl(url, {
          method: "GET",
          headers: {
            Accept: "application/json",
            "X-Goog-Api-Key": this.apiKey,
          },
          cache: "no-store",
          signal: controlled.signal,
        });
        if (response.ok) {
          return await readGooglePage(response, controlled.abort);
        }

        const reason = await googleErrorReason(response, controlled.abort);
        const failure = providerErrorForStatus(
          response.status,
          reason,
          attempts,
        );
        if (!failure.retryable || attempts >= this.maxAttempts) throw failure;
        const delay = retryDelayMs(response, attempts, this.random);
        if (delay === null) throw failure;
        controlled.dispose();
        await this.sleep(delay);
      } catch (error) {
        if (error instanceof FiscalCalendarProviderError) throw error;
        const timedOut = controlled.timedOut();
        const failure = new FiscalCalendarProviderError({
          code: timedOut ? "TIMEOUT" : "NETWORK",
          retryable: true,
          attempts,
        });
        if (attempts >= this.maxAttempts) throw failure;
        controlled.dispose();
        await this.sleep(retryDelayMs(response, attempts, this.random) ?? 0);
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

  async listEvents(
    dateRange: FiscalCalendarDateRange,
    categories: readonly FiscalCalendarCategory[],
  ): Promise<FiscalCalendarProviderResult> {
    const fetchedAt = this.now().toISOString();
    const eventsById = new Map<string, FiscalCalendarEvent>();
    let truncated = false;

    for (const category of categories) {
      let nextPageToken: string | null = null;
      const seenPageTokens = new Set<string>();
      for (
        let pageIndex = 0;
        pageIndex < MAX_PAGES_PER_CALENDAR;
        pageIndex += 1
      ) {
        const page = await this.requestPage(
          this.eventListUrl(category, dateRange, nextPageToken),
        );
        truncated ||= page.truncated;

        for (const payload of page.items) {
          const event = normalizeGoogleCalendarEvent(
            payload,
            category,
            fetchedAt,
          );
          if (!event || event.status === "cancelled") continue;
          eventsById.set(event.id, event);
          if (eventsById.size >= MAX_TOTAL_EVENTS) {
            truncated = true;
            return {
              events: sortFiscalCalendarEvents([...eventsById.values()]),
              fetchedAt,
              providerMode: "google-calendar",
              truncated,
            };
          }
        }

        if (!page.nextPageToken) break;
        if (seenPageTokens.has(page.nextPageToken)) {
          truncated = true;
          break;
        }
        seenPageTokens.add(page.nextPageToken);
        nextPageToken = page.nextPageToken;
        if (pageIndex === MAX_PAGES_PER_CALENDAR - 1) truncated = true;
      }
    }

    return {
      events: sortFiscalCalendarEvents([...eventsById.values()]),
      fetchedAt,
      providerMode: "google-calendar",
      truncated,
    };
  }
}
