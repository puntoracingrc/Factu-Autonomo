"use client";

import {
  CLOUD_DEVICE_TOKEN_HEADER,
  getLocalCloudDeviceToken,
} from "@/lib/cloud/device-token";
import { getSupabaseClientAsync } from "@/lib/supabase/client";

export const CENTRAL_INVOICE_AUTHORITY_RELATIONSHIP_CLIENT =
  "CENTRAL_INVOICE_AUTHORITY_RELATIONSHIP_CLIENT_V1";

export interface CentralInvoiceAuthorityRelationshipRequest {
  idempotencyKey: string;
  documentRef: {
    serverDocumentId: string;
    identityId: string;
    expectedVersion: number;
  };
}

export interface CentralInvoiceAuthorityRelationshipIdentity {
  serverDocumentId: string;
  identityId: string;
  outboxEventId: string;
  fullNumber: string;
  sequence: number;
  documentVersion: number;
}

export type CentralInvoiceAuthorityRelationshipResult =
  | {
      ok: true;
      schema: typeof CENTRAL_INVOICE_AUTHORITY_RELATIONSHIP_CLIENT;
      identity: CentralInvoiceAuthorityRelationshipIdentity;
    }
  | {
      ok: false;
      code: string;
      message: string;
      status: number;
      causeCode?: string;
      causeMessage?: string;
    };

export interface CentralInvoiceAuthorityRelationshipDependencies {
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

function isObject(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function errorResult(
  status: number,
  code: string,
  message: string,
  cause: { causeCode?: string; causeMessage?: string } = {},
): Extract<CentralInvoiceAuthorityRelationshipResult, { ok: false }> {
  return { ok: false, status, code, message, ...cause };
}

function identityFromPayload(
  payload: unknown,
): CentralInvoiceAuthorityRelationshipIdentity | null {
  if (!isObject(payload) || !isObject(payload.rpcResult)) return null;
  const rpc = payload.rpcResult;
  if (
    typeof rpc.documentId !== "string" ||
    typeof rpc.identityId !== "string" ||
    typeof rpc.outboxEventId !== "string" ||
    typeof rpc.fullNumber !== "string" ||
    typeof rpc.sequence !== "number" ||
    !Number.isInteger(rpc.sequence) ||
    rpc.sequence <= 0 ||
    typeof rpc.documentVersion !== "number" ||
    !Number.isInteger(rpc.documentVersion) ||
    rpc.documentVersion <= 0
  ) {
    return null;
  }
  return {
    serverDocumentId: rpc.documentId,
    identityId: rpc.identityId,
    outboxEventId: rpc.outboxEventId,
    fullNumber: rpc.fullNumber,
    sequence: rpc.sequence,
    documentVersion: rpc.documentVersion,
  };
}

export async function unlinkCentralInvoiceQuoteFromBrowser(
  input: CentralInvoiceAuthorityRelationshipRequest,
  dependencies: CentralInvoiceAuthorityRelationshipDependencies = {},
): Promise<CentralInvoiceAuthorityRelationshipResult> {
  const accessToken = await (
    dependencies.getAccessToken ?? defaultAccessToken
  )();
  const deviceToken = (
    dependencies.getDeviceToken ?? getLocalCloudDeviceToken
  )();
  if (!accessToken || !deviceToken) {
    return errorResult(
      401,
      "CENTRAL_AUTHORITY_RELATIONSHIP_SESSION_REQUIRED",
      "Inicia sesion y registra este dispositivo antes de cambiar relaciones centrales.",
    );
  }

  let response: Response;
  try {
    response = await (dependencies.fetchImpl ?? fetch)(
      "/api/central-invoice-authority/relationship",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
          [CLOUD_DEVICE_TOKEN_HEADER]: deviceToken,
        },
        body: JSON.stringify(input),
        cache: "no-store",
      },
    );
  } catch {
    return errorResult(
      0,
      "CENTRAL_AUTHORITY_RELATIONSHIP_NETWORK_ERROR",
      "No se pudo contactar con la autoridad central de relaciones.",
    );
  }

  const payload = (await response.json().catch(() => null)) as unknown;
  if (!response.ok) {
    const error = isObject(payload) && isObject(payload.error) ? payload.error : {};
    return errorResult(
      response.status,
      typeof error.code === "string"
        ? error.code
        : "CENTRAL_AUTHORITY_RELATIONSHIP_REJECTED",
      typeof error.message === "string"
        ? error.message
        : "La autoridad central no acepto la desvinculacion.",
      {
        causeCode:
          typeof error.causeCode === "string" ? error.causeCode : undefined,
        causeMessage:
          typeof error.causeMessage === "string" ? error.causeMessage : undefined,
      },
    );
  }

  const identity = identityFromPayload(payload);
  if (!identity) {
    return errorResult(
      502,
      "CENTRAL_AUTHORITY_RELATIONSHIP_INVALID_RESPONSE",
      "La autoridad central no devolvio una version valida.",
    );
  }

  return {
    ok: true,
    schema: CENTRAL_INVOICE_AUTHORITY_RELATIONSHIP_CLIENT,
    identity,
  };
}
