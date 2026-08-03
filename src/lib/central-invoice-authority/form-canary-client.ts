"use client";

import {
  CLOUD_DEVICE_TOKEN_HEADER,
  getLocalCloudDeviceToken,
} from "@/lib/cloud/device-token";
import { isCentralAuthorityPublicRolloutUser } from "@/lib/central-authority/rollout";
import { getSupabaseClientAsync } from "@/lib/supabase/client";
import type { DocumentKind } from "@/lib/types";

import {
  fetchCentralInvoiceAuthorityStatusFromBrowser,
  type CentralInvoiceAuthorityStatusResult,
  type CentralInvoiceAuthorityStatusClientDependencies,
} from "./status-client";

export const CENTRAL_INVOICE_AUTHORITY_FORM_CANARY_CLIENT =
  "CENTRAL_INVOICE_AUTHORITY_FORM_CANARY_CLIENT_V1";
export const CENTRAL_INVOICE_AUTHORITY_FORM_RUNTIME_POLICY =
  "CENTRAL_INVOICE_AUTHORITY_FORM_RUNTIME_POLICY_V1";
export const CENTRAL_INVOICE_AUTHORITY_FORM_LAST_KNOWN_GUARD =
  "CENTRAL_INVOICE_AUTHORITY_FORM_LAST_KNOWN_GUARD_V1";
export const CENTRAL_INVOICE_AUTHORITY_FORM_LAST_KNOWN_GUARD_KEY =
  "factu:central-invoice-authority:form-last-known-guard:v1";
export const CENTRAL_INVOICE_AUTHORITY_FORM_CANARY_USERS_PUBLIC_FLAG =
  "NEXT_PUBLIC_CENTRAL_INVOICE_AUTHORITY_FORM_CANARY_USERS";

const UUID_V4_LIKE_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

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

export type CentralInvoiceAuthorityFormIssuePolicyReason =
  | "public_form_canary"
  | "public_form_required"
  | "server_required"
  | "server_fiscal_writes_possible"
  | "last_known_central_authority"
  | "central_not_requested"
  | "public_canary_not_ready"
  | "server_canary_not_ready"
  | "status_unavailable";

type CentralInvoiceAuthorityFormLocalPolicyReason =
  | "central_not_requested"
  | "public_canary_not_ready"
  | "server_canary_not_ready"
  | "status_unavailable";

export type CentralInvoiceAuthorityFormLastKnownGuardReason =
  | "public_form_required"
  | "server_required"
  | "server_fiscal_writes_possible";

export interface CentralInvoiceAuthorityFormLastKnownGuard {
  schema: typeof CENTRAL_INVOICE_AUTHORITY_FORM_LAST_KNOWN_GUARD;
  rememberedAt: string;
  reason: CentralInvoiceAuthorityFormLastKnownGuardReason;
}

export type CentralInvoiceAuthorityFormIssuePolicyDecision =
  | {
      schema: typeof CENTRAL_INVOICE_AUTHORITY_FORM_RUNTIME_POLICY;
      shouldUseCentralAuthority: true;
      failClosed: true;
      reason: Exclude<
        CentralInvoiceAuthorityFormIssuePolicyReason,
        CentralInvoiceAuthorityFormLocalPolicyReason
      >;
      status?: Extract<CentralInvoiceAuthorityStatusResult, { ok: true }>;
    }
  | {
      schema: typeof CENTRAL_INVOICE_AUTHORITY_FORM_RUNTIME_POLICY;
      shouldUseCentralAuthority: false;
      failClosed: false;
      reason: Extract<
        CentralInvoiceAuthorityFormIssuePolicyReason,
        CentralInvoiceAuthorityFormLocalPolicyReason
      >;
      status?: Extract<CentralInvoiceAuthorityStatusResult, { ok: true }>;
      statusError?: Extract<CentralInvoiceAuthorityStatusResult, { ok: false }>;
    };

export interface CentralInvoiceAuthorityFormIssuePolicyDependencies
  extends CentralInvoiceAuthorityStatusClientDependencies {
  env?: Record<string, string | undefined>;
  publicFormCanaryEnabled?: boolean;
  publicFormCanaryUserId?: string | null;
  publicFormRequiredEnabled?: boolean;
  storage?: Pick<Storage, "getItem" | "setItem">;
  now?: () => Date;
}

export function isCentralInvoiceAuthorityFormCanaryEnabled(
  env?: Record<string, string | undefined>,
): boolean {
  const value =
    env?.NEXT_PUBLIC_CENTRAL_INVOICE_AUTHORITY_FORM_CANARY ??
    process.env.NEXT_PUBLIC_CENTRAL_INVOICE_AUTHORITY_FORM_CANARY;
  return value === "true";
}

export function isCentralInvoiceAuthorityFormRequiredEnabled(
  env?: Record<string, string | undefined>,
): boolean {
  const value =
    env?.NEXT_PUBLIC_CENTRAL_INVOICE_AUTHORITY_FORM_REQUIRED ??
    process.env.NEXT_PUBLIC_CENTRAL_INVOICE_AUTHORITY_FORM_REQUIRED;
  return value === "true";
}

export function isCentralInvoiceAuthorityFormCanaryUserAllowed(
  userId: string | null | undefined,
  value: string | undefined =
    process.env.NEXT_PUBLIC_CENTRAL_INVOICE_AUTHORITY_FORM_CANARY_USERS,
): boolean {
  const raw = value?.trim();
  if (!raw) return true;
  if (!userId || !UUID_V4_LIKE_PATTERN.test(userId)) return false;

  const allowed = new Set(
    raw
      .split(",")
      .map((entry) => entry.trim().toLowerCase())
      .filter((entry) => UUID_V4_LIKE_PATTERN.test(entry)),
  );

  return allowed.has(userId.toLowerCase());
}

export function isCentralInvoiceAuthorityFormCanaryEnabledForUser(
  input: {
    userId?: string | null;
    env?: Record<string, string | undefined>;
    publicFormCanaryEnabled?: boolean;
  } = {},
): boolean {
  if (
    isCentralAuthorityPublicRolloutUser(input.userId, {
      rolloutPercent:
        input.env?.NEXT_PUBLIC_CENTRAL_AUTHORITY_ROLLOUT_PERCENT ??
        process.env.NEXT_PUBLIC_CENTRAL_AUTHORITY_ROLLOUT_PERCENT,
      killSwitch:
        input.env?.NEXT_PUBLIC_CENTRAL_AUTHORITY_KILL_SWITCH ??
        process.env.NEXT_PUBLIC_CENTRAL_AUTHORITY_KILL_SWITCH,
      eligibleUserIds:
        input.env?.NEXT_PUBLIC_CENTRAL_AUTHORITY_ROLLOUT_ELIGIBLE_USER_IDS ??
        process.env.NEXT_PUBLIC_CENTRAL_AUTHORITY_ROLLOUT_ELIGIBLE_USER_IDS,
    })
  ) {
    return true;
  }
  const enabled =
    input.publicFormCanaryEnabled ??
    isCentralInvoiceAuthorityFormCanaryEnabled(input.env);
  if (!enabled) return false;
  return isCentralInvoiceAuthorityFormCanaryUserAllowed(
    input.userId,
    input.env?.[CENTRAL_INVOICE_AUTHORITY_FORM_CANARY_USERS_PUBLIC_FLAG],
  );
}

function enabledPolicy(
  reason: Exclude<
    CentralInvoiceAuthorityFormIssuePolicyReason,
    CentralInvoiceAuthorityFormLocalPolicyReason
  >,
  status?: Extract<CentralInvoiceAuthorityStatusResult, { ok: true }>,
): CentralInvoiceAuthorityFormIssuePolicyDecision {
  return {
    schema: CENTRAL_INVOICE_AUTHORITY_FORM_RUNTIME_POLICY,
    shouldUseCentralAuthority: true,
    failClosed: true,
    reason,
    status,
  };
}

function localPolicy(
  reason: Extract<
    CentralInvoiceAuthorityFormIssuePolicyReason,
    CentralInvoiceAuthorityFormLocalPolicyReason
  >,
  details: {
    status?: Extract<CentralInvoiceAuthorityStatusResult, { ok: true }>;
    statusError?: Extract<CentralInvoiceAuthorityStatusResult, { ok: false }>;
  } = {},
): CentralInvoiceAuthorityFormIssuePolicyDecision {
  return {
    schema: CENTRAL_INVOICE_AUTHORITY_FORM_RUNTIME_POLICY,
    shouldUseCentralAuthority: false,
    failClosed: false,
    reason,
    ...details,
  };
}

function getBrowserStorage(): Pick<Storage, "getItem" | "setItem"> | undefined {
  if (typeof window === "undefined") return undefined;
  return window.localStorage;
}

function readLastKnownCentralAuthorityFormGuard(
  storage: Pick<Storage, "getItem" | "setItem"> | undefined,
): CentralInvoiceAuthorityFormLastKnownGuard | null {
  if (!storage) return null;
  try {
    const raw = storage.getItem(CENTRAL_INVOICE_AUTHORITY_FORM_LAST_KNOWN_GUARD_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<CentralInvoiceAuthorityFormLastKnownGuard>;
    if (
      parsed.schema !== CENTRAL_INVOICE_AUTHORITY_FORM_LAST_KNOWN_GUARD ||
      typeof parsed.rememberedAt !== "string" ||
      (parsed.reason !== "public_form_required" &&
        parsed.reason !== "server_required" &&
        parsed.reason !== "server_fiscal_writes_possible")
    ) {
      return null;
    }
    return {
      schema: CENTRAL_INVOICE_AUTHORITY_FORM_LAST_KNOWN_GUARD,
      rememberedAt: parsed.rememberedAt,
      reason: parsed.reason,
    };
  } catch {
    return null;
  }
}

function rememberCentralAuthorityFormGuard(
  storage: Pick<Storage, "getItem" | "setItem"> | undefined,
  reason: CentralInvoiceAuthorityFormLastKnownGuardReason,
  now: () => Date,
): void {
  if (!storage) return;
  try {
    const payload: CentralInvoiceAuthorityFormLastKnownGuard = {
      schema: CENTRAL_INVOICE_AUTHORITY_FORM_LAST_KNOWN_GUARD,
      rememberedAt: now().toISOString(),
      reason,
    };
    storage.setItem(
      CENTRAL_INVOICE_AUTHORITY_FORM_LAST_KNOWN_GUARD_KEY,
      JSON.stringify(payload),
    );
  } catch {
    // Un almacenamiento privado o lleno no debe impedir que el preflight central decida.
  }
}

export async function resolveCentralInvoiceAuthorityFormIssuePolicyFromBrowser(
  dependencies: CentralInvoiceAuthorityFormIssuePolicyDependencies = {},
): Promise<CentralInvoiceAuthorityFormIssuePolicyDecision> {
  const env = dependencies.env;
  const storage = dependencies.storage ?? getBrowserStorage();
  const now = dependencies.now ?? (() => new Date());
  const lastKnownGuard = readLastKnownCentralAuthorityFormGuard(storage);
  const publicCanaryEnabled =
    isCentralInvoiceAuthorityFormCanaryEnabledForUser({
      env,
      publicFormCanaryEnabled: dependencies.publicFormCanaryEnabled,
      userId: dependencies.publicFormCanaryUserId,
    });
  const publicRequiredEnabled =
    dependencies.publicFormRequiredEnabled ??
    isCentralInvoiceAuthorityFormRequiredEnabled(env);

  if (publicRequiredEnabled) {
    rememberCentralAuthorityFormGuard(storage, "public_form_required", now);
    return enabledPolicy("public_form_required");
  }

  const status = await fetchCentralInvoiceAuthorityStatusFromBrowser({
    fetchImpl: dependencies.fetchImpl,
    getAccessToken: dependencies.getAccessToken,
    getDeviceToken: dependencies.getDeviceToken,
  });
  if (!status.ok) {
    if (lastKnownGuard) return enabledPolicy("last_known_central_authority");
    return localPolicy("status_unavailable", { statusError: status });
  }
  if (lastKnownGuard) return enabledPolicy("last_known_central_authority", status);
  if (status.activation.requestedMode === "required") {
    rememberCentralAuthorityFormGuard(storage, "server_required", now);
    return enabledPolicy("server_required", status);
  }
  if (publicCanaryEnabled) {
    if (status.summary.fiscalWritesPossible) {
      rememberCentralAuthorityFormGuard(storage, "server_fiscal_writes_possible", now);
      return enabledPolicy("public_form_canary", status);
    }
    return localPolicy("public_canary_not_ready", { status });
  }
  if (status.summary.fiscalWritesPossible) {
    rememberCentralAuthorityFormGuard(storage, "server_fiscal_writes_possible", now);
    return enabledPolicy("server_fiscal_writes_possible", status);
  }
  if (
    status.activation.requestedMode === "canary" &&
    status.activation.appliesToUser
  ) {
    return localPolicy("server_canary_not_ready", { status });
  }
  return localPolicy("central_not_requested", { status });
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

function blockedPreflightMessage(
  status: Extract<CentralInvoiceAuthorityStatusResult, { ok: true }>,
): string {
  const blocker =
    status.readiness.blockers[0] ??
    status.readiness.checks.find((check) => check.status === "blocked")
      ?.message ??
    status.activation.reason;
  const reason = blocker.trim();
  if (!reason) {
    return "El servidor central no esta listo para emitir facturas.";
  }
  return `El servidor central no esta listo para emitir facturas: ${reason}`;
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

  const status = await fetchCentralInvoiceAuthorityStatusFromBrowser({
    fetchImpl,
    getAccessToken: async () => accessToken,
    getDeviceToken: () => deviceToken,
  });
  if (!status.ok) {
    return errorResult(status.status, status.code, status.message);
  }
  if (!status.summary.fiscalWritesPossible) {
    return errorResult(
      409,
      "CENTRAL_AUTHORITY_PREFLIGHT_BLOCKED",
      blockedPreflightMessage(status),
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
