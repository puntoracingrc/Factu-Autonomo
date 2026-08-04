"use client";

import {
  CLOUD_DEVICE_TOKEN_HEADER,
  getLocalCloudDeviceToken,
} from "@/lib/cloud/device-token";
import { getSupabaseClientAsync } from "@/lib/supabase/client";

export const CENTRAL_INVOICE_AUTHORITY_EVENTS_CLIENT =
  "CENTRAL_INVOICE_AUTHORITY_EVENTS_CLIENT_V1";

export type CentralInvoiceAuthorityEventsClientJson =
  | null
  | boolean
  | number
  | string
  | CentralInvoiceAuthorityEventsClientJson[]
  | { [key: string]: CentralInvoiceAuthorityEventsClientJson };

export type CentralInvoiceAuthorityPulledBrowserEventType =
  | "invoice_issued"
  | "rectification_issued"
  | "document_repaired"
  | "invoice_collection_updated"
  | "invoice_relationship_updated";

export interface CentralInvoiceAuthorityPulledBrowserEvent {
  schema: "CENTRAL_INVOICE_AUTHORITY_EVENTS_RPC_ADAPTER_V1";
  eventId: string;
  documentId: string;
  identityId: string;
  eventType: CentralInvoiceAuthorityPulledBrowserEventType;
  createdAt: string;
  fullNumber: string;
  sequence: number;
  documentVersion: number;
  documentPayload: CentralInvoiceAuthorityEventsClientJson;
  emittedHash: string;
  safeSummary: CentralInvoiceAuthorityEventsClientJson;
}

export interface CentralInvoiceAuthorityEventsCursor {
  afterCreatedAt: string;
  afterEventId: string;
}

export interface CentralInvoiceAuthorityEventsPullInput {
  afterCreatedAt?: string | null;
  afterEventId?: string | null;
  limit?: number | null;
}

export type CentralInvoiceAuthorityEventsPullResult =
  | {
      ok: true;
      schema: typeof CENTRAL_INVOICE_AUTHORITY_EVENTS_CLIENT;
      events: CentralInvoiceAuthorityPulledBrowserEvent[];
      nextCursor: CentralInvoiceAuthorityEventsCursor | null;
    }
  | {
      ok: false;
      code: string;
      message: string;
      status: number;
    };

export interface CentralInvoiceAuthorityEventsClientDependencies {
  fetchImpl?: typeof fetch;
  getAccessToken?: () => Promise<string | null>;
  getDeviceToken?: () => string | null;
}

async function defaultAccessToken(): Promise<string | null> {
  const supabase = await getSupabaseClientAsync();
  if (!supabase) return null;
  const { data } = await supabase.auth.getSession();
  return data.session?.access_token ?? null;
}

function defaultDeviceToken(): string | null {
  return getLocalCloudDeviceToken();
}

function isObject(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function isJsonObjectOrArray(
  value: unknown,
): value is CentralInvoiceAuthorityEventsClientJson {
  return isObject(value) || Array.isArray(value);
}

function errorResult(
  status: number,
  code: string,
  message: string,
): CentralInvoiceAuthorityEventsPullResult {
  return { ok: false, status, code, message };
}

function normalizeLimit(value: number | null | undefined): number {
  if (value === null || value === undefined) return 50;
  if (!Number.isInteger(value)) return 50;
  return Math.min(Math.max(value, 1), 100);
}

function eventType(
  value: unknown,
): CentralInvoiceAuthorityPulledBrowserEventType | null {
  if (
    value === "invoice_issued" ||
    value === "rectification_issued" ||
    value === "document_repaired" ||
    value === "invoice_collection_updated" ||
    value === "invoice_relationship_updated"
  ) {
    return value;
  }
  return null;
}

function buildEventsUrl(input: CentralInvoiceAuthorityEventsPullInput): string {
  const params = new URLSearchParams();
  const afterCreatedAt = input.afterCreatedAt?.trim();
  const afterEventId = input.afterEventId?.trim();
  if (afterCreatedAt) params.set("afterCreatedAt", afterCreatedAt);
  if (afterEventId) params.set("afterEventId", afterEventId);
  params.set("limit", String(normalizeLimit(input.limit)));
  const query = params.toString();
  return `/api/central-invoice-authority/events${query ? `?${query}` : ""}`;
}

function parseEvent(
  row: unknown,
): CentralInvoiceAuthorityPulledBrowserEvent | null {
  if (!isObject(row)) return null;
  const parsedEventType = eventType(row.eventType);
  const sequence = row.sequence;
  const documentVersion = row.documentVersion;
  if (
    row.schema !== "CENTRAL_INVOICE_AUTHORITY_EVENTS_RPC_ADAPTER_V1" ||
    typeof row.eventId !== "string" ||
    typeof row.documentId !== "string" ||
    typeof row.identityId !== "string" ||
    !parsedEventType ||
    typeof row.createdAt !== "string" ||
    typeof row.fullNumber !== "string" ||
    typeof sequence !== "number" ||
    !Number.isInteger(sequence) ||
    sequence <= 0 ||
    typeof documentVersion !== "number" ||
    !Number.isInteger(documentVersion) ||
    documentVersion <= 0 ||
    !isJsonObjectOrArray(row.documentPayload) ||
    typeof row.emittedHash !== "string" ||
    !isJsonObjectOrArray(row.safeSummary)
  ) {
    return null;
  }

  return {
    schema: row.schema,
    eventId: row.eventId,
    documentId: row.documentId,
    identityId: row.identityId,
    eventType: parsedEventType,
    createdAt: row.createdAt,
    fullNumber: row.fullNumber,
    sequence,
    documentVersion,
    documentPayload: row.documentPayload,
    emittedHash: row.emittedHash,
    safeSummary: row.safeSummary,
  };
}

function parseCursor(value: unknown): CentralInvoiceAuthorityEventsCursor | null {
  if (value === null) return null;
  if (
    isObject(value) &&
    typeof value.afterCreatedAt === "string" &&
    typeof value.afterEventId === "string"
  ) {
    return {
      afterCreatedAt: value.afterCreatedAt,
      afterEventId: value.afterEventId,
    };
  }
  return null;
}

function parseEventsPayload(
  payload: unknown,
): Pick<
  Extract<CentralInvoiceAuthorityEventsPullResult, { ok: true }>,
  "events" | "nextCursor"
> | null {
  if (
    !isObject(payload) ||
    payload.ok !== true ||
    payload.schema !== "CENTRAL_INVOICE_AUTHORITY_EVENTS_ROUTE_V1" ||
    !Array.isArray(payload.events)
  ) {
    return null;
  }
  const events = payload.events.map(parseEvent);
  if (events.some((event) => event === null)) return null;
  const nextCursor = parseCursor(payload.nextCursor);
  if (payload.nextCursor !== null && nextCursor === null) return null;
  return {
    events: events as CentralInvoiceAuthorityPulledBrowserEvent[],
    nextCursor,
  };
}

export async function pullCentralInvoiceAuthorityEventsFromBrowser(
  input: CentralInvoiceAuthorityEventsPullInput = {},
  dependencies: CentralInvoiceAuthorityEventsClientDependencies = {},
): Promise<CentralInvoiceAuthorityEventsPullResult> {
  const getAccessToken = dependencies.getAccessToken ?? defaultAccessToken;
  const getDeviceToken = dependencies.getDeviceToken ?? defaultDeviceToken;
  const fetchImpl = dependencies.fetchImpl ?? fetch;
  const accessToken = await getAccessToken();
  const deviceToken = getDeviceToken();

  if (!accessToken || !deviceToken) {
    return errorResult(
      401,
      "CENTRAL_AUTHORITY_EVENTS_SESSION_REQUIRED",
      "Inicia sesion y registra este dispositivo antes de recibir facturas centrales.",
    );
  }

  let response: Response;
  try {
    response = await fetchImpl(buildEventsUrl(input), {
      method: "GET",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        [CLOUD_DEVICE_TOKEN_HEADER]: deviceToken,
      },
      cache: "no-store",
    });
  } catch {
    return errorResult(
      0,
      "CENTRAL_AUTHORITY_EVENTS_NETWORK_ERROR",
      "No se pudo contactar con la autoridad central de facturas.",
    );
  }

  const payload = (await response.json().catch(() => null)) as unknown;
  if (!response.ok) {
    const error =
      isObject(payload) && isObject(payload.error) ? payload.error : {};
    return errorResult(
      response.status,
      typeof error.code === "string"
        ? error.code
        : "CENTRAL_AUTHORITY_EVENTS_REJECTED",
      typeof error.message === "string"
        ? error.message
        : "La autoridad central no acepto la lectura de eventos.",
    );
  }

  const parsed = parseEventsPayload(payload);
  if (!parsed) {
    return errorResult(
      502,
      "CENTRAL_AUTHORITY_EVENTS_INVALID_RESPONSE",
      "La autoridad central no devolvio eventos validos.",
    );
  }

  return {
    ok: true,
    schema: CENTRAL_INVOICE_AUTHORITY_EVENTS_CLIENT,
    events: parsed.events,
    nextCursor: parsed.nextCursor,
  };
}
