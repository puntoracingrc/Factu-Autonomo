"use client";

import {
  CLOUD_DEVICE_TOKEN_HEADER,
  getLocalCloudDeviceToken,
} from "@/lib/cloud/device-token";
import { getSupabaseClientAsync } from "@/lib/supabase/client";
import type { DocumentPaymentStatus, DocumentStatus } from "@/lib/types";

import type { CentralInvoiceAuthorityFormJson } from "./form-canary-client";

export const CENTRAL_INVOICE_AUTHORITY_COLLECTION_CLIENT =
  "CENTRAL_INVOICE_AUTHORITY_COLLECTION_CLIENT_V1";

export type CentralInvoiceAuthorityCollectionDocumentStatus = Extract<
  DocumentStatus,
  "enviado" | "pagado" | "vencido"
>;

export type CentralInvoiceAuthorityCollectionPaymentStatus = Extract<
  DocumentPaymentStatus,
  "pending" | "paid" | "overdue"
>;

export interface CentralInvoiceAuthorityCollectionUpdateRequest {
  idempotencyKey: string;
  documentRef: {
    serverDocumentId: string;
    identityId: string;
    expectedVersion: number;
  };
  status: CentralInvoiceAuthorityCollectionDocumentStatus;
  paymentStatus: CentralInvoiceAuthorityCollectionPaymentStatus;
  paidAt: string | null;
  documentPayload: CentralInvoiceAuthorityFormJson;
}

export interface CentralInvoiceAuthorityCollectionUpdateIdentity {
  serverDocumentId: string;
  identityId: string;
  outboxEventId: string;
  fullNumber: string;
  sequence: number;
  documentVersion: number;
}

export type CentralInvoiceAuthorityCollectionUpdateResult =
  | {
      ok: true;
      schema: typeof CENTRAL_INVOICE_AUTHORITY_COLLECTION_CLIENT;
      identity: CentralInvoiceAuthorityCollectionUpdateIdentity;
    }
  | {
      ok: false;
      code: string;
      message: string;
      status: number;
    };

export interface CentralInvoiceAuthorityCollectionDependencies {
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

function errorResult(
  status: number,
  code: string,
  message: string,
): CentralInvoiceAuthorityCollectionUpdateResult {
  return { ok: false, status, code, message };
}

function identityFromPayload(
  payload: unknown,
): CentralInvoiceAuthorityCollectionUpdateIdentity | null {
  if (!isObject(payload) || payload.ok !== true || !isObject(payload.rpcResult)) {
    return null;
  }

  const rpc = payload.rpcResult;
  const sequence = rpc.sequence;
  const documentVersion = rpc.documentVersion;
  if (
    typeof rpc.documentId !== "string" ||
    typeof rpc.identityId !== "string" ||
    typeof rpc.outboxEventId !== "string" ||
    typeof rpc.fullNumber !== "string" ||
    typeof sequence !== "number" ||
    !Number.isInteger(sequence) ||
    sequence <= 0 ||
    typeof documentVersion !== "number" ||
    !Number.isInteger(documentVersion) ||
    documentVersion <= 0
  ) {
    return null;
  }

  return {
    serverDocumentId: rpc.documentId,
    identityId: rpc.identityId,
    outboxEventId: rpc.outboxEventId,
    fullNumber: rpc.fullNumber,
    sequence,
    documentVersion,
  };
}

export async function updateCentralInvoiceCollectionFromBrowser(
  input: CentralInvoiceAuthorityCollectionUpdateRequest,
  dependencies: CentralInvoiceAuthorityCollectionDependencies = {},
): Promise<CentralInvoiceAuthorityCollectionUpdateResult> {
  const getAccessToken = dependencies.getAccessToken ?? defaultAccessToken;
  const getDeviceToken = dependencies.getDeviceToken ?? defaultDeviceToken;
  const fetchImpl = dependencies.fetchImpl ?? fetch;
  const accessToken = await getAccessToken();
  const deviceToken = getDeviceToken();

  if (!accessToken || !deviceToken) {
    return errorResult(
      401,
      "CENTRAL_AUTHORITY_COLLECTION_SESSION_REQUIRED",
      "Inicia sesion y registra este dispositivo antes de sincronizar cobros centrales.",
    );
  }

  let response: Response;
  try {
    response = await fetchImpl("/api/central-invoice-authority/collection", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
        [CLOUD_DEVICE_TOKEN_HEADER]: deviceToken,
      },
      body: JSON.stringify(input),
      cache: "no-store",
    });
  } catch {
    return errorResult(
      0,
      "CENTRAL_AUTHORITY_COLLECTION_NETWORK_ERROR",
      "No se pudo contactar con la autoridad central de cobros.",
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
        : "CENTRAL_AUTHORITY_COLLECTION_REJECTED",
      typeof error.message === "string"
        ? error.message
        : "La autoridad central no acepto el cambio de cobro.",
    );
  }

  const identity = identityFromPayload(payload);
  if (!identity) {
    return errorResult(
      502,
      "CENTRAL_AUTHORITY_COLLECTION_INVALID_RESPONSE",
      "La autoridad central no devolvio una version de cobro valida.",
    );
  }

  return {
    ok: true,
    schema: CENTRAL_INVOICE_AUTHORITY_COLLECTION_CLIENT,
    identity,
  };
}
