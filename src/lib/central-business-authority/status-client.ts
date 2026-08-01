"use client";

import {
  CLOUD_DEVICE_TOKEN_HEADER,
  getOrCreateLocalCloudDeviceToken,
} from "@/lib/cloud/device-token";
import { getSupabaseClientAsync } from "@/lib/supabase/client";

export const CENTRAL_BUSINESS_AUTHORITY_STATUS_CLIENT =
  "CENTRAL_BUSINESS_AUTHORITY_STATUS_CLIENT_V1";

type Mode = "off" | "shadow" | "canary" | "required";

export interface CentralBusinessAuthorityBrowserStatus {
  ok: true;
  schema: typeof CENTRAL_BUSINESS_AUTHORITY_STATUS_CLIENT;
  activation: {
    requestedMode: Mode;
    effectiveMode: Mode;
    enabled: boolean;
    writesEnabled: boolean;
    appliesToUser: boolean;
    production: boolean;
    reason: string;
  };
  readiness: {
    schema: "CENTRAL_BUSINESS_AUTHORITY_STATUS_READINESS_V1";
    checkedAt: string;
    ready: boolean;
    checks: Array<{
      id: string;
      kind: "configuration" | "table" | "rpc";
      status: "ready" | "blocked";
      blocker?: string;
      causeCode?: string;
      message: string;
      noBusinessRows: true;
      destructive: false;
    }>;
    blockers: string[];
  };
  summary: {
    writesPossible: boolean;
    modeAllowsWrites: boolean;
    serverSchemaReady: boolean;
    deviceVerified: true;
  };
}

export type CentralBusinessAuthorityStatusResult =
  | CentralBusinessAuthorityBrowserStatus
  | {
      ok: false;
      status: number;
      code: string;
      message: string;
    };

export interface CentralBusinessAuthorityStatusClientDependencies {
  fetchImpl?: typeof fetch;
  getAccessToken?: () => Promise<string | null>;
  getDeviceToken?: () => string | null;
}

const MODES: readonly Mode[] = ["off", "shadow", "canary", "required"];
const KINDS = ["configuration", "table", "rpc"] as const;
const CHECK_STATUSES = ["ready", "blocked"] as const;

function isObject(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function oneOf<T extends string>(
  value: unknown,
  values: readonly T[],
): value is T {
  return typeof value === "string" && values.includes(value as T);
}

async function defaultAccessToken() {
  const supabase = await getSupabaseClientAsync();
  if (!supabase) return null;
  const { data } = await supabase.auth.getSession();
  return data.session?.access_token ?? null;
}

function failure(
  status: number,
  code: string,
  message: string,
): CentralBusinessAuthorityStatusResult {
  return { ok: false, status, code, message };
}

function parse(payload: unknown): CentralBusinessAuthorityBrowserStatus | null {
  if (
    !isObject(payload) ||
    payload.ok !== true ||
    payload.schema !== "CENTRAL_BUSINESS_AUTHORITY_STATUS_ROUTE_V1" ||
    !isObject(payload.activation) ||
    !oneOf(payload.activation.requestedMode, MODES) ||
    !oneOf(payload.activation.effectiveMode, MODES) ||
    typeof payload.activation.enabled !== "boolean" ||
    typeof payload.activation.writesEnabled !== "boolean" ||
    typeof payload.activation.appliesToUser !== "boolean" ||
    typeof payload.activation.production !== "boolean" ||
    typeof payload.activation.reason !== "string" ||
    !isObject(payload.readiness) ||
    payload.readiness.schema !==
      "CENTRAL_BUSINESS_AUTHORITY_STATUS_READINESS_V1" ||
    typeof payload.readiness.checkedAt !== "string" ||
    typeof payload.readiness.ready !== "boolean" ||
    !Array.isArray(payload.readiness.checks) ||
    !Array.isArray(payload.readiness.blockers) ||
    !payload.readiness.blockers.every(
      (blocker) => typeof blocker === "string",
    ) ||
    !isObject(payload.summary) ||
    typeof payload.summary.writesPossible !== "boolean" ||
    typeof payload.summary.modeAllowsWrites !== "boolean" ||
    typeof payload.summary.serverSchemaReady !== "boolean" ||
    payload.summary.deviceVerified !== true
  ) {
    return null;
  }

  const checks = payload.readiness.checks.map((check) => {
    if (
      !isObject(check) ||
      typeof check.id !== "string" ||
      !oneOf(check.kind, KINDS) ||
      !oneOf(check.status, CHECK_STATUSES) ||
      typeof check.message !== "string" ||
      check.noBusinessRows !== true ||
      check.destructive !== false ||
      (check.blocker !== undefined && typeof check.blocker !== "string") ||
      (check.causeCode !== undefined && typeof check.causeCode !== "string")
    ) {
      return null;
    }
    return {
      id: check.id,
      kind: check.kind,
      status: check.status,
      blocker: check.blocker as string | undefined,
      causeCode: check.causeCode as string | undefined,
      message: check.message,
      noBusinessRows: true as const,
      destructive: false as const,
    };
  });
  if (checks.some((check) => check === null)) return null;

  return {
    ok: true,
    schema: CENTRAL_BUSINESS_AUTHORITY_STATUS_CLIENT,
    activation: {
      requestedMode: payload.activation.requestedMode,
      effectiveMode: payload.activation.effectiveMode,
      enabled: payload.activation.enabled,
      writesEnabled: payload.activation.writesEnabled,
      appliesToUser: payload.activation.appliesToUser,
      production: payload.activation.production,
      reason: payload.activation.reason,
    },
    readiness: {
      schema: "CENTRAL_BUSINESS_AUTHORITY_STATUS_READINESS_V1",
      checkedAt: payload.readiness.checkedAt,
      ready: payload.readiness.ready,
      checks: checks as CentralBusinessAuthorityBrowserStatus["readiness"]["checks"],
      blockers: payload.readiness.blockers as string[],
    },
    summary: {
      writesPossible: payload.summary.writesPossible,
      modeAllowsWrites: payload.summary.modeAllowsWrites,
      serverSchemaReady: payload.summary.serverSchemaReady,
      deviceVerified: true,
    },
  };
}

export async function fetchCentralBusinessAuthorityStatusFromBrowser(
  dependencies: CentralBusinessAuthorityStatusClientDependencies = {},
): Promise<CentralBusinessAuthorityStatusResult> {
  const accessToken = await (
    dependencies.getAccessToken ?? defaultAccessToken
  )();
  if (!accessToken) {
    return failure(
      401,
      "CENTRAL_BUSINESS_STATUS_SESSION_REQUIRED",
      "Inicia sesion y registra este dispositivo antes de comprobar el servidor central.",
    );
  }
  const deviceToken = (
    dependencies.getDeviceToken ?? getOrCreateLocalCloudDeviceToken
  )();
  if (!deviceToken) {
    return failure(
      401,
      "CENTRAL_BUSINESS_STATUS_SESSION_REQUIRED",
      "Inicia sesion y registra este dispositivo antes de comprobar el servidor central.",
    );
  }

  let response: Response;
  try {
    response = await (dependencies.fetchImpl ?? fetch)(
      "/api/central-business-authority/status",
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
      "CENTRAL_BUSINESS_STATUS_NETWORK_ERROR",
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
        : "CENTRAL_BUSINESS_STATUS_REJECTED",
      typeof error.message === "string"
        ? error.message
        : "El servidor central no acepto la comprobacion.",
    );
  }
  return (
    parse(payload) ??
    failure(
      502,
      "CENTRAL_BUSINESS_STATUS_INVALID_RESPONSE",
      "El servidor central devolvio un estado incompleto.",
    )
  );
}
