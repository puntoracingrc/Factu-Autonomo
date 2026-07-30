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

export const CENTRAL_BUSINESS_BATCH_MUTATION_CLIENT =
  "CENTRAL_BUSINESS_BATCH_MUTATION_CLIENT_V1";

export interface CentralBusinessBrowserBatchMutationInput {
  idempotencyKey: string;
  operationKind: CentralBusinessOperationKind;
  entityType: CentralBusinessEntityType;
  entityId: string;
  expectedVersion: number;
  payload: CentralBusinessJson | null;
}

export interface CentralBusinessBrowserBatchMutationItem {
  operationIndex: number;
  status: "committed" | "replayed";
  eventId: string;
  eventSequence: number;
  entityVersion: number;
  deleted: boolean;
  contentHash: string;
}

export type CentralBusinessBrowserBatchMutationResult =
  | {
      ok: true;
      schema: typeof CENTRAL_BUSINESS_BATCH_MUTATION_CLIENT;
      operations: CentralBusinessBrowserBatchMutationItem[];
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

export interface CentralBusinessBatchMutationClientDependencies {
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
}): CentralBusinessBrowserBatchMutationResult {
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
      input.code === "CENTRAL_BUSINESS_ENTITY_NOT_FOUND",
  };
}

function parseSuccess(
  payload: unknown,
  expectedCount: number,
): Extract<CentralBusinessBrowserBatchMutationResult, { ok: true }> | null {
  if (
    !isObject(payload) ||
    payload.ok !== true ||
    payload.schema !== "CENTRAL_BUSINESS_BATCH_MUTATION_ROUTE_V1" ||
    !isObject(payload.result) ||
    payload.result.schema !==
      "CENTRAL_BUSINESS_BATCH_MUTATION_RPC_ADAPTER_V1" ||
    !Array.isArray(payload.result.operations) ||
    payload.result.operations.length !== expectedCount
  ) {
    return null;
  }
  const operations = payload.result.operations.map((operation) => {
    if (
      !isObject(operation) ||
      typeof operation.operationIndex !== "number" ||
      !Number.isInteger(operation.operationIndex) ||
      (operation.status !== "committed" &&
        operation.status !== "replayed") ||
      typeof operation.eventId !== "string" ||
      typeof operation.eventSequence !== "number" ||
      !Number.isSafeInteger(operation.eventSequence) ||
      typeof operation.entityVersion !== "number" ||
      !Number.isInteger(operation.entityVersion) ||
      typeof operation.deleted !== "boolean" ||
      typeof operation.contentHash !== "string"
    ) {
      return null;
    }
    return operation as unknown as CentralBusinessBrowserBatchMutationItem;
  });
  if (
    operations.some((operation) => operation === null) ||
    operations.some(
      (operation, index) => operation?.operationIndex !== index,
    )
  ) {
    return null;
  }
  return {
    ok: true,
    schema: CENTRAL_BUSINESS_BATCH_MUTATION_CLIENT,
    operations: operations as CentralBusinessBrowserBatchMutationItem[],
  };
}

export async function mutateCentralBusinessBatchFromBrowser(
  operations: CentralBusinessBrowserBatchMutationInput[],
  dependencies: CentralBusinessBatchMutationClientDependencies = {},
): Promise<CentralBusinessBrowserBatchMutationResult> {
  if (operations.length < 1 || operations.length > 20) {
    return failure({
      status: 400,
      code: "CENTRAL_BUSINESS_BATCH_INVALID_SIZE",
      message: "El lote central debe contener entre 1 y 20 operaciones.",
    });
  }
  const accessToken = await (
    dependencies.getAccessToken ?? defaultAccessToken
  )();
  const deviceToken = (
    dependencies.getDeviceToken ?? getLocalCloudDeviceToken
  )();
  if (!accessToken || !deviceToken) {
    return failure({
      status: 401,
      code: "CENTRAL_BUSINESS_BATCH_SESSION_REQUIRED",
      message:
        "Inicia sesion y registra este dispositivo antes de guardar el lote central.",
    });
  }

  let response: Response;
  try {
    response = await (dependencies.fetchImpl ?? fetch)(
      "/api/central-business-authority/mutate-batch",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          [CLOUD_DEVICE_TOKEN_HEADER]: deviceToken,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ operations }),
        cache: "no-store",
      },
    );
  } catch {
    return failure({
      status: 0,
      code: "CENTRAL_BUSINESS_BATCH_NETWORK_ERROR",
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
          : "CENTRAL_BUSINESS_BATCH_REJECTED",
      message:
        typeof error.message === "string"
          ? error.message
          : "El servidor central rechazo el lote.",
      causeCode:
        typeof error.causeCode === "string" ? error.causeCode : undefined,
    });
  }

  return (
    parseSuccess(payload, operations.length) ??
    failure({
      status: 502,
      code: "CENTRAL_BUSINESS_BATCH_INVALID_RESPONSE",
      message: "El servidor central devolvio una confirmacion incompleta.",
    })
  );
}
