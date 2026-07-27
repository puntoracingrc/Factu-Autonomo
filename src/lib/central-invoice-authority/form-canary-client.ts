"use client";

import {
  CLOUD_DEVICE_TOKEN_HEADER,
  getLocalCloudDeviceToken,
} from "@/lib/cloud/device-token";
import { getSupabaseClientAsync } from "@/lib/supabase/client";
import type { DocumentKind } from "@/lib/types";

export const CENTRAL_INVOICE_AUTHORITY_FORM_CANARY_CLIENT =
  "CENTRAL_INVOICE_AUTHORITY_FORM_CANARY_CLIENT_V1";

export type CentralInvoiceAuthorityFormJson =
  | null
  | boolean
  | number
  | string
  | CentralInvoiceAuthorityFormJson[]
  | { [key: string]: CentralInvoiceAuthorityFormJson };

export type CentralInvoiceAuthorityFormIssueKind = "invoice" | "rectification";

export interface CentralInvoiceAuthorityFormIssueDraft {
  localDocumentId: string;
  expectedVersion: number;
  draftHash: string;
  draftCreatedAt?: string;
  draftUpdatedAt?: string;
}

export interface CentralInvoiceAuthorityFormIssueSeries {
  environment: "test" | "production";
  issuerNif: string;
  seriesCode: string;
  fiscalYear: number;
}

export interface CentralInvoiceAuthorityFormIssueRequest {
  kind: CentralInvoiceAuthorityFormIssueKind;
  idempotencyKey: string;
  draft: CentralInvoiceAuthorityFormIssueDraft;
  series: CentralInvoiceAuthorityFormIssueSeries;
  issuedAt: string;
  rectifiesIdentityId?: string;
  documentPayload: CentralInvoiceAuthorityFormJson;
  emittedSnapshot: CentralInvoiceAuthorityFormJson;
  emittedHash: string;
}

export interface CentralInvoiceAuthorityFormIssueIdentity {
  kind: Extract<DocumentKind, "factura" | "factura_rectificativa">;
  fiscalYear: number;
  sequence: number;
  fullNumber: string;
  documentVersion: number;
  identityId: string;
  outboxEventId: string;
  serverDocumentId: string;
}

export type CentralInvoiceAuthorityFormIssueResult =
  | {
      ok: true;
      schema: typeof CENTRAL_INVOICE_AUTHORITY_FORM_CANARY_CLIENT;
      identity: CentralInvoiceAuthorityFormIssueIdentity;
    }
  | {
      ok: false;
      code: string;
      message: string;
      status: number;
    };

export interface CentralInvoiceAuthorityFormIssueDependencies {
  fetchImpl?: typeof fetch;
  getAccessToken?: () => Promise<string | null>;
  getDeviceToken?: () => string | null;
}

export function isCentralInvoiceAuthorityFormCanaryEnabled(
  env: Record<string, string | undefined> = process.env,
): boolean {
  return env.NEXT_PUBLIC_CENTRAL_INVOICE_AUTHORITY_FORM_CANARY === "true";
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
): CentralInvoiceAuthorityFormIssueResult {
  return { ok: false, status, code, message };
}

function identityFromPayload(
  payload: unknown,
  input: CentralInvoiceAuthorityFormIssueRequest,
): CentralInvoiceAuthorityFormIssueIdentity | null {
  if (!isObject(payload) || payload.ok !== true || !isObject(payload.rpcResult)) {
    return null;
  }

  const rpc = payload.rpcResult;
  const sequence = rpc.sequence;
  const documentVersion = rpc.documentVersion;
  if (
    typeof rpc.fullNumber !== "string" ||
    typeof sequence !== "number" ||
    !Number.isInteger(sequence) ||
    sequence <= 0 ||
    typeof documentVersion !== "number" ||
    !Number.isInteger(documentVersion) ||
    documentVersion <= 0 ||
    typeof rpc.identityId !== "string" ||
    typeof rpc.outboxEventId !== "string" ||
    typeof rpc.documentId !== "string"
  ) {
    return null;
  }

  return {
    kind: input.kind === "rectification" ? "factura_rectificativa" : "factura",
    fiscalYear: input.series.fiscalYear,
    sequence,
    fullNumber: rpc.fullNumber,
    documentVersion,
    identityId: rpc.identityId,
    outboxEventId: rpc.outboxEventId,
    serverDocumentId: rpc.documentId,
  };
}

export async function issueCentralInvoiceAuthorityFromBrowser(
  input: CentralInvoiceAuthorityFormIssueRequest,
  dependencies: CentralInvoiceAuthorityFormIssueDependencies = {},
): Promise<CentralInvoiceAuthorityFormIssueResult> {
  const getAccessToken = dependencies.getAccessToken ?? defaultAccessToken;
  const getDeviceToken = dependencies.getDeviceToken ?? defaultDeviceToken;
  const fetchImpl = dependencies.fetchImpl ?? fetch;
  const accessToken = await getAccessToken();
  const deviceToken = getDeviceToken();

  if (!accessToken || !deviceToken) {
    return errorResult(
      401,
      "CENTRAL_AUTHORITY_SESSION_REQUIRED",
      "Inicia sesion y registra este dispositivo antes de emitir con autoridad central.",
    );
  }

  let response: Response;
  try {
    response = await fetchImpl("/api/central-invoice-authority/issue", {
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
      "CENTRAL_AUTHORITY_NETWORK_ERROR",
      "No se pudo contactar con la autoridad central de facturas.",
    );
  }

  const payload = (await response.json().catch(() => null)) as unknown;
  if (!response.ok) {
    const error =
      isObject(payload) && isObject(payload.error) ? payload.error : {};
    return errorResult(
      response.status,
      typeof error.code === "string" ? error.code : "CENTRAL_AUTHORITY_REJECTED",
      typeof error.message === "string"
        ? error.message
        : "La autoridad central no acepto la emision.",
    );
  }

  const identity = identityFromPayload(payload, input);
  if (!identity) {
    return errorResult(
      502,
      "CENTRAL_AUTHORITY_INVALID_RESPONSE",
      "La autoridad central no devolvio una identidad fiscal valida.",
    );
  }

  return {
    ok: true,
    schema: CENTRAL_INVOICE_AUTHORITY_FORM_CANARY_CLIENT,
    identity,
  };
}
