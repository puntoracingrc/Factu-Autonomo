"use client";

import {
  CLOUD_DEVICE_TOKEN_HEADER,
  getLocalCloudDeviceToken,
} from "@/lib/cloud/device-token";
import { getSupabaseClientAsync } from "@/lib/supabase/client";

export const CENTRAL_INVOICE_AUTHORITY_STATUS_CLIENT =
  "CENTRAL_INVOICE_AUTHORITY_STATUS_CLIENT_V1";

export type CentralInvoiceAuthorityStatusMode =
  | "off"
  | "shadow"
  | "canary"
  | "required";

export type CentralInvoiceAuthorityStatusCheckKind =
  | "configuration"
  | "table"
  | "rpc";

export type CentralInvoiceAuthorityStatusCheckStatus = "ready" | "blocked";

export interface CentralInvoiceAuthorityStatusActivation {
  requestedMode: CentralInvoiceAuthorityStatusMode;
  effectiveMode: CentralInvoiceAuthorityStatusMode;
  enabled: boolean;
  fiscalWritesEnabled: boolean;
  appliesToUser: boolean;
  production: boolean;
  reason: string;
}

export interface CentralInvoiceAuthorityStatusCheck {
  id: string;
  kind: CentralInvoiceAuthorityStatusCheckKind;
  status: CentralInvoiceAuthorityStatusCheckStatus;
  blocker?: string;
  causeCode?: string;
  message: string;
  noBusinessRows: true;
  destructive: false;
}

export interface CentralInvoiceAuthorityStatusReadiness {
  schema: "CENTRAL_INVOICE_AUTHORITY_STATUS_READINESS_V1";
  checkedAt: string;
  ready: boolean;
  checks: CentralInvoiceAuthorityStatusCheck[];
  blockers: string[];
}

export interface CentralInvoiceAuthorityStatusSummary {
  fiscalWritesPossible: boolean;
  modeAllowsWrites: boolean;
  serverSchemaReady: boolean;
  deviceVerified: true;
}

export type CentralInvoiceAuthorityStatusResult =
  | {
      ok: true;
      schema: typeof CENTRAL_INVOICE_AUTHORITY_STATUS_CLIENT;
      activation: CentralInvoiceAuthorityStatusActivation;
      readiness: CentralInvoiceAuthorityStatusReadiness;
      summary: CentralInvoiceAuthorityStatusSummary;
    }
  | {
      ok: false;
      code: string;
      message: string;
      status: number;
    };

export interface CentralInvoiceAuthorityStatusClientDependencies {
  fetchImpl?: typeof fetch;
  getAccessToken?: () => Promise<string | null>;
  getDeviceToken?: () => string | null;
}

const MODES: readonly CentralInvoiceAuthorityStatusMode[] = [
  "off",
  "shadow",
  "canary",
  "required",
];
const CHECK_KINDS: readonly CentralInvoiceAuthorityStatusCheckKind[] = [
  "configuration",
  "table",
  "rpc",
];
const CHECK_STATUSES: readonly CentralInvoiceAuthorityStatusCheckStatus[] = [
  "ready",
  "blocked",
];

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

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((entry) => typeof entry === "string");
}

function isOneOf<T extends string>(value: unknown, allowed: readonly T[]): value is T {
  return typeof value === "string" && allowed.includes(value as T);
}

function errorResult(
  status: number,
  code: string,
  message: string,
): CentralInvoiceAuthorityStatusResult {
  return { ok: false, status, code, message };
}

function parseActivation(
  value: unknown,
): CentralInvoiceAuthorityStatusActivation | null {
  if (!isObject(value)) return null;
  if (
    !isOneOf(value.requestedMode, MODES) ||
    !isOneOf(value.effectiveMode, MODES) ||
    typeof value.enabled !== "boolean" ||
    typeof value.fiscalWritesEnabled !== "boolean" ||
    typeof value.appliesToUser !== "boolean" ||
    typeof value.production !== "boolean" ||
    typeof value.reason !== "string"
  ) {
    return null;
  }
  return {
    requestedMode: value.requestedMode,
    effectiveMode: value.effectiveMode,
    enabled: value.enabled,
    fiscalWritesEnabled: value.fiscalWritesEnabled,
    appliesToUser: value.appliesToUser,
    production: value.production,
    reason: value.reason,
  };
}

function parseCheck(value: unknown): CentralInvoiceAuthorityStatusCheck | null {
  if (!isObject(value)) return null;
  if (
    typeof value.id !== "string" ||
    !isOneOf(value.kind, CHECK_KINDS) ||
    !isOneOf(value.status, CHECK_STATUSES) ||
    typeof value.message !== "string" ||
    value.noBusinessRows !== true ||
    value.destructive !== false
  ) {
    return null;
  }
  if (value.blocker !== undefined && typeof value.blocker !== "string") {
    return null;
  }
  if (value.causeCode !== undefined && typeof value.causeCode !== "string") {
    return null;
  }
  return {
    id: value.id,
    kind: value.kind,
    status: value.status,
    blocker: value.blocker,
    causeCode: value.causeCode,
    message: value.message,
    noBusinessRows: true,
    destructive: false,
  };
}

function parseReadiness(
  value: unknown,
): CentralInvoiceAuthorityStatusReadiness | null {
  if (
    !isObject(value) ||
    value.schema !== "CENTRAL_INVOICE_AUTHORITY_STATUS_READINESS_V1" ||
    typeof value.checkedAt !== "string" ||
    typeof value.ready !== "boolean" ||
    !Array.isArray(value.checks) ||
    !isStringArray(value.blockers)
  ) {
    return null;
  }
  const checks = value.checks.map(parseCheck);
  if (checks.some((check) => check === null)) return null;
  return {
    schema: value.schema,
    checkedAt: value.checkedAt,
    ready: value.ready,
    checks: checks as CentralInvoiceAuthorityStatusCheck[],
    blockers: value.blockers,
  };
}

function parseSummary(
  value: unknown,
): CentralInvoiceAuthorityStatusSummary | null {
  if (
    !isObject(value) ||
    typeof value.fiscalWritesPossible !== "boolean" ||
    typeof value.modeAllowsWrites !== "boolean" ||
    typeof value.serverSchemaReady !== "boolean" ||
    value.deviceVerified !== true
  ) {
    return null;
  }
  return {
    fiscalWritesPossible: value.fiscalWritesPossible,
    modeAllowsWrites: value.modeAllowsWrites,
    serverSchemaReady: value.serverSchemaReady,
    deviceVerified: true,
  };
}

function parseStatusPayload(
  payload: unknown,
): Extract<CentralInvoiceAuthorityStatusResult, { ok: true }> | null {
  if (
    !isObject(payload) ||
    payload.ok !== true ||
    payload.schema !== "CENTRAL_INVOICE_AUTHORITY_STATUS_ROUTE_V1"
  ) {
    return null;
  }

  const activation = parseActivation(payload.activation);
  const readiness = parseReadiness(payload.readiness);
  const summary = parseSummary(payload.summary);
  if (!activation || !readiness || !summary) return null;

  return {
    ok: true,
    schema: CENTRAL_INVOICE_AUTHORITY_STATUS_CLIENT,
    activation,
    readiness,
    summary,
  };
}

export async function fetchCentralInvoiceAuthorityStatusFromBrowser(
  dependencies: CentralInvoiceAuthorityStatusClientDependencies = {},
): Promise<CentralInvoiceAuthorityStatusResult> {
  const getAccessToken = dependencies.getAccessToken ?? defaultAccessToken;
  const getDeviceToken = dependencies.getDeviceToken ?? defaultDeviceToken;
  const fetchImpl = dependencies.fetchImpl ?? fetch;
  const accessToken = await getAccessToken();
  const deviceToken = getDeviceToken();

  if (!accessToken || !deviceToken) {
    return errorResult(
      401,
      "CENTRAL_AUTHORITY_STATUS_SESSION_REQUIRED",
      "Inicia sesion y registra este dispositivo antes de comprobar la autoridad central.",
    );
  }

  let response: Response;
  try {
    response = await fetchImpl("/api/central-invoice-authority/status", {
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
      "CENTRAL_AUTHORITY_STATUS_NETWORK_ERROR",
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
        : "CENTRAL_AUTHORITY_STATUS_REJECTED",
      typeof error.message === "string"
        ? error.message
        : "La autoridad central no acepto la comprobacion.",
    );
  }

  const parsed = parseStatusPayload(payload);
  if (!parsed) {
    return errorResult(
      502,
      "CENTRAL_AUTHORITY_STATUS_INVALID_RESPONSE",
      "La autoridad central no devolvio un estado valido.",
    );
  }

  return parsed;
}
