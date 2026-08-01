"use client";

import {
  CLOUD_DEVICE_TOKEN_HEADER,
  getOrCreateLocalCloudDeviceToken,
} from "@/lib/cloud/device-token";
import { getSupabaseClientAsync } from "@/lib/supabase/client";

import type {
  CentralBusinessEntityType,
  CentralBusinessJson,
  CentralBusinessOperationKind,
} from "./mutation-command";

export const CENTRAL_BUSINESS_MUTATION_CLIENT =
  "CENTRAL_BUSINESS_MUTATION_CLIENT_V1";

export interface CentralBusinessBrowserMutationInput {
  idempotencyKey: string;
  operationKind: CentralBusinessOperationKind;
  entityType: CentralBusinessEntityType;
  entityId: string;
  expectedVersion: number;
  payload: CentralBusinessJson | null;
}

export type CentralBusinessBrowserMutationResult =
  | {
      ok: true;
      schema: typeof CENTRAL_BUSINESS_MUTATION_CLIENT;
      status: "committed" | "replayed";
      eventId: string;
      eventSequence: number;
      entityVersion: number;
      deleted: boolean;
      contentHash: string;
    }
  | {
      ok: false;
      status: number;
      code: string;
      message: string;
      causeCode?: string;
      retryable: boolean;
      conflict: boolean;
    };

export interface CentralBusinessMutationClientDependencies {
  fetchImpl?: typeof fetch;
  getAccessToken?: () => Promise<string | null>;
  getDeviceToken?: () => string | null;
}

async function defaultAccessToken() {
  const supabase = await getSupabaseClientAsync();
  if (!supabase) return null;
  const { data } = await supabase.auth.getSession();
  return data.session?.access_token ?? null;
}

function isObject(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function failure(input: {
  status: number;
  code: string;
  message: string;
  causeCode?: string;
}): CentralBusinessBrowserMutationResult {
  return {
    ok: false,
    ...input,
    retryable:
      input.status === 0 ||
      input.status === 429 ||
      input.status >= 500,
    conflict:
      input.code === "CENTRAL_BUSINESS_VERSION_CONFLICT" ||
      input.code === "CENTRAL_BUSINESS_IDEMPOTENCY_CONFLICT" ||
      input.code === "CENTRAL_BUSINESS_ENTITY_NOT_FOUND" ||
      input.code === "CENTRAL_BUSINESS_RECURRING_OCCURRENCE_CONFLICT",
  };
}

function parseSuccess(
  payload: unknown,
): Extract<CentralBusinessBrowserMutationResult, { ok: true }> | null {
  if (
    !isObject(payload) ||
    payload.ok !== true ||
    payload.schema !== "CENTRAL_BUSINESS_MUTATION_ROUTE_V1" ||
    !isObject(payload.result) ||
    payload.result.schema !== "CENTRAL_BUSINESS_MUTATION_RPC_ADAPTER_V1" ||
    (payload.result.status !== "committed" &&
      payload.result.status !== "replayed") ||
    typeof payload.result.eventId !== "string" ||
    typeof payload.result.eventSequence !== "number" ||
    !Number.isSafeInteger(payload.result.eventSequence) ||
    typeof payload.result.entityVersion !== "number" ||
    !Number.isInteger(payload.result.entityVersion) ||
    typeof payload.result.deleted !== "boolean" ||
    typeof payload.result.contentHash !== "string"
  ) {
    return null;
  }
  return {
    ok: true,
    schema: CENTRAL_BUSINESS_MUTATION_CLIENT,
    status: payload.result.status,
    eventId: payload.result.eventId,
    eventSequence: payload.result.eventSequence,
    entityVersion: payload.result.entityVersion,
    deleted: payload.result.deleted,
    contentHash: payload.result.contentHash,
  };
}

export async function mutateCentralBusinessFromBrowser(
  input: CentralBusinessBrowserMutationInput,
  dependencies: CentralBusinessMutationClientDependencies = {},
): Promise<CentralBusinessBrowserMutationResult> {
  const accessToken = await (
    dependencies.getAccessToken ?? defaultAccessToken
  )();
  if (!accessToken) {
    return failure({
      status: 401,
      code: "CENTRAL_BUSINESS_MUTATION_SESSION_REQUIRED",
      message:
        "Inicia sesion y registra este dispositivo antes de guardar en el servidor central.",
    });
  }
  const deviceToken = (
    dependencies.getDeviceToken ?? getOrCreateLocalCloudDeviceToken
  )();
  if (!deviceToken) {
    return failure({
      status: 401,
      code: "CENTRAL_BUSINESS_MUTATION_SESSION_REQUIRED",
      message:
        "Inicia sesion y registra este dispositivo antes de guardar en el servidor central.",
    });
  }

  let response: Response;
  try {
    response = await (dependencies.fetchImpl ?? fetch)(
      "/api/central-business-authority/mutate",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          [CLOUD_DEVICE_TOKEN_HEADER]: deviceToken,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(input),
        cache: "no-store",
      },
    );
  } catch {
    return failure({
      status: 0,
      code: "CENTRAL_BUSINESS_MUTATION_NETWORK_ERROR",
      message: "No se pudo contactar con el servidor central.",
    });
  }

  const payload = (await response.json().catch(() => null)) as unknown;
  if (!response.ok) {
    const error =
      isObject(payload) && isObject(payload.error) ? payload.error : {};
    return failure({
      status: response.status,
      code:
        typeof error.code === "string"
          ? error.code
          : "CENTRAL_BUSINESS_MUTATION_REJECTED",
      message:
        typeof error.message === "string"
          ? error.message
          : "El servidor central rechazo el cambio.",
      causeCode:
        typeof error.causeCode === "string" ? error.causeCode : undefined,
    });
  }

  return (
    parseSuccess(payload) ??
    failure({
      status: 502,
      code: "CENTRAL_BUSINESS_MUTATION_INVALID_RESPONSE",
      message: "El servidor central devolvio una confirmacion incompleta.",
    })
  );
}
