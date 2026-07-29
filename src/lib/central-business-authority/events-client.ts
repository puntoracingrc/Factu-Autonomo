"use client";

import {
  CLOUD_DEVICE_TOKEN_HEADER,
  getLocalCloudDeviceToken,
} from "@/lib/cloud/device-token";
import { getSupabaseClientAsync } from "@/lib/supabase/client";

import type {
  CentralBusinessEntityType,
  CentralBusinessJson,
  CentralBusinessOperationKind,
} from "./mutation-command";

export const CENTRAL_BUSINESS_EVENTS_CLIENT =
  "CENTRAL_BUSINESS_EVENTS_CLIENT_V1";

export interface CentralBusinessBrowserEvent {
  schema: "CENTRAL_BUSINESS_EVENTS_RPC_ADAPTER_V1";
  eventId: string;
  eventSequence: number;
  entityType: CentralBusinessEntityType;
  entityId: string;
  entityVersion: number;
  operationKind: CentralBusinessOperationKind;
  payload: CentralBusinessJson | null;
  contentHash: string;
  actorDeviceId: string;
  createdAt: string;
}

export type CentralBusinessEventsPullResult =
  | {
      ok: true;
      schema: typeof CENTRAL_BUSINESS_EVENTS_CLIENT;
      events: CentralBusinessBrowserEvent[];
      nextSequence: number;
      hasMore: boolean;
    }
  | {
      ok: false;
      status: number;
      code: string;
      message: string;
      retryable: boolean;
    };

export interface CentralBusinessEventsClientDependencies {
  fetchImpl?: typeof fetch;
  getAccessToken?: () => Promise<string | null>;
  getDeviceToken?: () => string | null;
}

const TYPES = new Set<CentralBusinessEntityType>([
  "customer",
  "supplier",
  "product",
  "expense",
  "recurring_expense",
  "user_reminder",
  "profile",
]);

async function defaultAccessToken() {
  const supabase = await getSupabaseClientAsync();
  if (!supabase) return null;
  const { data } = await supabase.auth.getSession();
  return data.session?.access_token ?? null;
}

function isObject(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function isJson(value: unknown): value is CentralBusinessJson {
  if (
    value === null ||
    typeof value === "boolean" ||
    typeof value === "string"
  ) {
    return true;
  }
  if (typeof value === "number") return Number.isFinite(value);
  if (Array.isArray(value)) return value.every(isJson);
  return isObject(value) && Object.values(value).every(isJson);
}

function parseEvent(value: unknown): CentralBusinessBrowserEvent | null {
  if (
    !isObject(value) ||
    value.schema !== "CENTRAL_BUSINESS_EVENTS_RPC_ADAPTER_V1" ||
    typeof value.eventId !== "string" ||
    typeof value.eventSequence !== "number" ||
    !Number.isSafeInteger(value.eventSequence) ||
    value.eventSequence <= 0 ||
    !TYPES.has(value.entityType as CentralBusinessEntityType) ||
    typeof value.entityId !== "string" ||
    typeof value.entityVersion !== "number" ||
    !Number.isInteger(value.entityVersion) ||
    value.entityVersion <= 0 ||
    (value.operationKind !== "upsert" && value.operationKind !== "delete") ||
    !isJson(value.payload) ||
    typeof value.contentHash !== "string" ||
    typeof value.actorDeviceId !== "string" ||
    typeof value.createdAt !== "string"
  ) {
    return null;
  }
  if (
    (value.operationKind === "upsert" &&
      (value.payload === null || typeof value.payload !== "object")) ||
    (value.operationKind === "delete" && value.payload !== null)
  ) {
    return null;
  }
  return {
    schema: value.schema,
    eventId: value.eventId,
    eventSequence: value.eventSequence,
    entityType: value.entityType as CentralBusinessEntityType,
    entityId: value.entityId,
    entityVersion: value.entityVersion,
    operationKind: value.operationKind,
    payload: value.payload,
    contentHash: value.contentHash,
    actorDeviceId: value.actorDeviceId,
    createdAt: value.createdAt,
  };
}

function failure(
  status: number,
  code: string,
  message: string,
): CentralBusinessEventsPullResult {
  return {
    ok: false,
    status,
    code,
    message,
    retryable: status === 0 || status === 429 || status >= 500,
  };
}

export async function pullCentralBusinessEventsFromBrowser(
  input: { afterSequence?: number; limit?: number } = {},
  dependencies: CentralBusinessEventsClientDependencies = {},
): Promise<CentralBusinessEventsPullResult> {
  const afterSequence =
    Number.isSafeInteger(input.afterSequence) &&
    (input.afterSequence ?? 0) >= 0
      ? input.afterSequence ?? 0
      : 0;
  const limit =
    Number.isInteger(input.limit) && (input.limit ?? 0) > 0
      ? Math.min(input.limit ?? 100, 500)
      : 100;
  const accessToken = await (
    dependencies.getAccessToken ?? defaultAccessToken
  )();
  const deviceToken = (
    dependencies.getDeviceToken ?? getLocalCloudDeviceToken
  )();
  if (!accessToken || !deviceToken) {
    return failure(
      401,
      "CENTRAL_BUSINESS_EVENTS_SESSION_REQUIRED",
      "Inicia sesion y registra este dispositivo antes de recibir cambios.",
    );
  }

  let response: Response;
  try {
    response = await (dependencies.fetchImpl ?? fetch)(
      `/api/central-business-authority/events?afterSequence=${afterSequence}&limit=${limit}`,
      {
        method: "GET",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          [CLOUD_DEVICE_TOKEN_HEADER]: deviceToken,
        },
        cache: "no-store",
      },
    );
  } catch {
    return failure(
      0,
      "CENTRAL_BUSINESS_EVENTS_NETWORK_ERROR",
      "No se pudo contactar con el servidor central.",
    );
  }

  const payload = (await response.json().catch(() => null)) as unknown;
  if (!response.ok) {
    const error =
      isObject(payload) && isObject(payload.error) ? payload.error : {};
    return failure(
      response.status,
      typeof error.code === "string"
        ? error.code
        : "CENTRAL_BUSINESS_EVENTS_REJECTED",
      typeof error.message === "string"
        ? error.message
        : "El servidor central rechazo la lectura.",
    );
  }
  if (
    !isObject(payload) ||
    payload.ok !== true ||
    payload.schema !== "CENTRAL_BUSINESS_EVENTS_ROUTE_V1" ||
    !Array.isArray(payload.events) ||
    typeof payload.nextSequence !== "number" ||
    !Number.isSafeInteger(payload.nextSequence) ||
    typeof payload.hasMore !== "boolean"
  ) {
    return failure(
      502,
      "CENTRAL_BUSINESS_EVENTS_INVALID_RESPONSE",
      "El servidor central devolvio eventos incompletos.",
    );
  }
  const events = payload.events.map(parseEvent);
  if (events.some((event) => event === null)) {
    return failure(
      502,
      "CENTRAL_BUSINESS_EVENTS_INVALID_RESPONSE",
      "El servidor central devolvio eventos incompletos.",
    );
  }
  return {
    ok: true,
    schema: CENTRAL_BUSINESS_EVENTS_CLIENT,
    events: events as CentralBusinessBrowserEvent[],
    nextSequence: payload.nextSequence,
    hasMore: payload.hasMore,
  };
}
