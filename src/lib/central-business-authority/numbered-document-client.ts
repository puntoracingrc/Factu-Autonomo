"use client";

import {
  CLOUD_DEVICE_TOKEN_HEADER,
  getOrCreateLocalCloudDeviceToken,
} from "@/lib/cloud/device-token";
import { getSupabaseClientAsync } from "@/lib/supabase/client";

import type { CentralBusinessJson } from "./mutation-command";
import type { CentralBusinessNumberedDocumentEntityType } from "./numbered-document-command";

export const CENTRAL_BUSINESS_NUMBERED_DOCUMENT_CLIENT =
  "CENTRAL_BUSINESS_NUMBERED_DOCUMENT_CLIENT_V1";

interface ReconcileSeriesInput {
  action: "reconcile_series";
  idempotencyKey: string;
  entityType: CentralBusinessNumberedDocumentEntityType;
  numberTemplate: string;
  fiscalYear: number;
  observedMaxSequence: number;
  sourceDocumentCount: number;
  sourceDigest: string;
}

interface CreateDocumentInput {
  action: "create";
  idempotencyKey: string;
  entityType: CentralBusinessNumberedDocumentEntityType;
  entityId: string;
  numberTemplate: string;
  padding: number;
  fiscalYear: number;
  payloadWithoutNumber: CentralBusinessJson;
}

export type CentralBusinessNumberedDocumentBrowserInput =
  | ReconcileSeriesInput
  | CreateDocumentInput;

export interface CentralBusinessDocumentSeriesReconciliationBrowserResult {
  schema: typeof CENTRAL_BUSINESS_NUMBERED_DOCUMENT_CLIENT;
  action: "reconcile_series";
  status: "committed" | "replayed";
  reconciliationId: string;
  scopeYear: number;
  previousSequence: number;
  resultingSequence: number;
}

export interface CentralBusinessNumberedDocumentCreateBrowserResult {
  schema: typeof CENTRAL_BUSINESS_NUMBERED_DOCUMENT_CLIENT;
  action: "create";
  status: "committed" | "replayed";
  eventId: string;
  eventSequence: number;
  entityVersion: number;
  fullNumber: string;
  sequence: number;
  scopeYear: number;
  contentHash: string;
  documentPayload: { [key: string]: CentralBusinessJson };
}

export type CentralBusinessNumberedDocumentBrowserResult =
  | {
      ok: true;
      result:
        | CentralBusinessDocumentSeriesReconciliationBrowserResult
        | CentralBusinessNumberedDocumentCreateBrowserResult;
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

export interface CentralBusinessNumberedDocumentClientDependencies {
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
}): CentralBusinessNumberedDocumentBrowserResult {
  return {
    ok: false,
    ...input,
    retryable:
      input.status === 0 || input.status === 429 || input.status >= 500,
    conflict:
      input.status === 409 ||
      input.code === "CENTRAL_BUSINESS_DOCUMENT_ALREADY_EXISTS" ||
      input.code === "CENTRAL_BUSINESS_IDEMPOTENCY_CONFLICT",
  };
}

function parseReconciliation(
  value: Record<string, unknown>,
): CentralBusinessDocumentSeriesReconciliationBrowserResult | null {
  if (
    value.action !== "reconcile_series" ||
    (value.status !== "committed" && value.status !== "replayed") ||
    typeof value.reconciliationId !== "string" ||
    typeof value.scopeYear !== "number" ||
    typeof value.previousSequence !== "number" ||
    typeof value.resultingSequence !== "number" ||
    !Number.isInteger(value.scopeYear) ||
    !Number.isInteger(value.previousSequence) ||
    !Number.isInteger(value.resultingSequence) ||
    value.previousSequence < 0 ||
    value.resultingSequence < value.previousSequence
  ) {
    return null;
  }
  return {
    schema: CENTRAL_BUSINESS_NUMBERED_DOCUMENT_CLIENT,
    action: value.action,
    status: value.status,
    reconciliationId: value.reconciliationId,
    scopeYear: value.scopeYear,
    previousSequence: value.previousSequence,
    resultingSequence: value.resultingSequence,
  };
}

function parseCreation(
  value: Record<string, unknown>,
): CentralBusinessNumberedDocumentCreateBrowserResult | null {
  if (
    value.action !== "create" ||
    (value.status !== "committed" && value.status !== "replayed") ||
    typeof value.eventId !== "string" ||
    typeof value.eventSequence !== "number" ||
    typeof value.entityVersion !== "number" ||
    typeof value.fullNumber !== "string" ||
    typeof value.sequence !== "number" ||
    typeof value.scopeYear !== "number" ||
    typeof value.contentHash !== "string" ||
    !isObject(value.documentPayload) ||
    !Number.isSafeInteger(value.eventSequence) ||
    !Number.isInteger(value.entityVersion) ||
    !Number.isInteger(value.sequence) ||
    !Number.isInteger(value.scopeYear) ||
    value.entityVersion < 1 ||
    value.sequence < 1
  ) {
    return null;
  }
  return {
    schema: CENTRAL_BUSINESS_NUMBERED_DOCUMENT_CLIENT,
    action: value.action,
    status: value.status,
    eventId: value.eventId,
    eventSequence: value.eventSequence,
    entityVersion: value.entityVersion,
    fullNumber: value.fullNumber,
    sequence: value.sequence,
    scopeYear: value.scopeYear,
    contentHash: value.contentHash,
    documentPayload:
      value.documentPayload as { [key: string]: CentralBusinessJson },
  };
}

export async function mutateCentralBusinessNumberedDocumentFromBrowser(
  input: CentralBusinessNumberedDocumentBrowserInput,
  dependencies: CentralBusinessNumberedDocumentClientDependencies = {},
): Promise<CentralBusinessNumberedDocumentBrowserResult> {
  const accessToken = await (
    dependencies.getAccessToken ?? defaultAccessToken
  )();
  if (!accessToken) {
    return failure({
      status: 401,
      code: "CENTRAL_BUSINESS_NUMBERED_DOCUMENT_SESSION_REQUIRED",
      message:
        "Inicia sesion y registra este dispositivo antes de usar la numeracion central.",
    });
  }
  const deviceToken = (
    dependencies.getDeviceToken ?? getOrCreateLocalCloudDeviceToken
  )();
  if (!deviceToken) {
    return failure({
      status: 401,
      code: "CENTRAL_BUSINESS_NUMBERED_DOCUMENT_SESSION_REQUIRED",
      message:
        "Inicia sesion y registra este dispositivo antes de usar la numeracion central.",
    });
  }

  let response: Response;
  try {
    response = await (dependencies.fetchImpl ?? fetch)(
      "/api/central-business-authority/numbered-document",
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
      code: "CENTRAL_BUSINESS_NUMBERED_DOCUMENT_NETWORK_ERROR",
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
          : "CENTRAL_BUSINESS_NUMBERED_DOCUMENT_REJECTED",
      message:
        typeof error.message === "string"
          ? error.message
          : "El servidor central rechazo la operacion numerada.",
      causeCode:
        typeof error.causeCode === "string" ? error.causeCode : undefined,
    });
  }

  if (
    !isObject(payload) ||
    payload.ok !== true ||
    payload.schema !== "CENTRAL_BUSINESS_NUMBERED_DOCUMENT_ROUTE_V1" ||
    !isObject(payload.result)
  ) {
    return failure({
      status: 502,
      code: "CENTRAL_BUSINESS_NUMBERED_DOCUMENT_INVALID_RESPONSE",
      message: "El servidor central devolvio una confirmacion incompleta.",
    });
  }
  const result =
    input.action === "reconcile_series"
      ? parseReconciliation(payload.result)
      : parseCreation(payload.result);
  if (!result || result.action !== input.action) {
    return failure({
      status: 502,
      code: "CENTRAL_BUSINESS_NUMBERED_DOCUMENT_INVALID_RESPONSE",
      message: "El servidor central devolvio una confirmacion incompleta.",
    });
  }
  return { ok: true, result };
}
