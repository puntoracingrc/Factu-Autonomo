import {
  CENTRAL_AUTHORITY_KILL_SWITCH_KEY,
  CENTRAL_AUTHORITY_ROLLOUT_ELIGIBLE_USERS_KEY,
  CENTRAL_AUTHORITY_ROLLOUT_PERCENT_KEY,
  centralAuthorityRolloutPercent,
  isCentralAuthorityEmergencyStopped,
  isCentralAuthorityRolloutSelected,
} from "@/lib/central-authority/rollout";

assertServerOnlyModule();

export const CENTRAL_BUSINESS_AUTHORITY_MODE_KEY =
  "CENTRAL_BUSINESS_AUTHORITY_MODE";
export const CENTRAL_BUSINESS_AUTHORITY_CANARY_USERS_KEY =
  "CENTRAL_BUSINESS_AUTHORITY_CANARY_USERS";
export const CENTRAL_BUSINESS_AUTHORITY_CANARY_USER_EMAILS_KEY =
  "CENTRAL_BUSINESS_AUTHORITY_CANARY_USER_EMAILS";
export const CENTRAL_BUSINESS_AUTHORITY_SCHEMA_VERSION_KEY =
  "CENTRAL_BUSINESS_AUTHORITY_SCHEMA_VERSION";
export const CENTRAL_BUSINESS_AUTHORITY_MUTATIONS_READY_KEY =
  "CENTRAL_BUSINESS_AUTHORITY_MUTATIONS_READY";
export const CENTRAL_BUSINESS_AUTHORITY_PRODUCTION_APPROVED_KEY =
  "CENTRAL_BUSINESS_AUTHORITY_PRODUCTION_APPROVED";
export const CENTRAL_BUSINESS_AUTHORITY_SCHEMA_VERSION =
  "central-business-authority-v1";

export type CentralBusinessAuthorityMode =
  | "off"
  | "shadow"
  | "canary"
  | "required";

export type CentralBusinessAuthorityActivationReason =
  | "disabled"
  | "invalid_mode"
  | "shadow_only"
  | "user_not_allowlisted"
  | "user_not_in_rollout"
  | "schema_not_ready"
  | "mutations_not_ready"
  | "production_approval_missing"
  | "emergency_stopped"
  | "canary_enabled"
  | "required_enabled";

export interface CentralBusinessAuthorityActivation {
  requestedMode: CentralBusinessAuthorityMode;
  effectiveMode: CentralBusinessAuthorityMode;
  enabled: boolean;
  writesEnabled: boolean;
  appliesToUser: boolean;
  production: boolean;
  reason: CentralBusinessAuthorityActivationReason;
}

type EnvLike = Record<string, string | undefined>;

function assertServerOnlyModule() {
  if (typeof window !== "undefined") {
    throw new Error(
      "La autoridad central de datos de negocio solo puede evaluarse en servidor.",
    );
  }
}

function isProduction(env: EnvLike): boolean {
  return (
    env.NODE_ENV === "production" ||
    env.VERCEL_ENV === "production" ||
    env.APP_ENV === "production" ||
    env.DEPLOY_ENV === "production"
  );
}

function parseMode(value: string | undefined): CentralBusinessAuthorityMode | null {
  const normalized = value?.trim().toLowerCase() || "off";
  if (
    normalized === "off" ||
    normalized === "shadow" ||
    normalized === "canary" ||
    normalized === "required"
  ) {
    return normalized;
  }
  return null;
}

function values(value: string | undefined): Set<string> {
  return new Set(
    (value ?? "")
      .split(",")
      .map((entry) => entry.trim().toLowerCase())
      .filter(Boolean),
  );
}

function disabled(
  requestedMode: CentralBusinessAuthorityMode,
  production: boolean,
  reason: CentralBusinessAuthorityActivationReason,
  appliesToUser = false,
): CentralBusinessAuthorityActivation {
  return {
    requestedMode,
    effectiveMode: "off",
    enabled: false,
    writesEnabled: false,
    appliesToUser,
    production,
    reason,
  };
}

export function evaluateCentralBusinessAuthorityActivation(
  input: {
    env?: EnvLike;
    userId?: string | null;
    userEmail?: string | null;
  } = {},
): CentralBusinessAuthorityActivation {
  const env = input.env ?? process.env;
  const production = isProduction(env);
  const mode = parseMode(env[CENTRAL_BUSINESS_AUTHORITY_MODE_KEY]);

  if (!mode) return disabled("off", production, "invalid_mode");
  if (mode === "off") return disabled(mode, production, "disabled");
  if (mode === "shadow") {
    return {
      requestedMode: mode,
      effectiveMode: mode,
      enabled: true,
      writesEnabled: false,
      appliesToUser: true,
      production,
      reason: "shadow_only",
    };
  }

  const normalizedUserId = input.userId?.trim().toLowerCase() ?? "";
  const normalizedEmail = input.userEmail?.trim().toLowerCase() ?? "";
  const rolloutPercent = centralAuthorityRolloutPercent(
    env[CENTRAL_AUTHORITY_ROLLOUT_PERCENT_KEY],
  );
  const explicitlyAllowed =
    values(env[CENTRAL_BUSINESS_AUTHORITY_CANARY_USERS_KEY]).has(
      normalizedUserId,
    ) ||
    values(env[CENTRAL_BUSINESS_AUTHORITY_CANARY_USER_EMAILS_KEY]).has(
      normalizedEmail,
    );
  const appliesToUser =
    mode === "required" ||
    explicitlyAllowed ||
    isCentralAuthorityRolloutSelected(
      normalizedUserId,
      env[CENTRAL_AUTHORITY_ROLLOUT_PERCENT_KEY],
      env[CENTRAL_AUTHORITY_ROLLOUT_ELIGIBLE_USERS_KEY],
    );

  if (!appliesToUser) {
    return disabled(
      mode,
      production,
      rolloutPercent > 0 ? "user_not_in_rollout" : "user_not_allowlisted",
    );
  }
  if (
    env[CENTRAL_BUSINESS_AUTHORITY_SCHEMA_VERSION_KEY] !==
    CENTRAL_BUSINESS_AUTHORITY_SCHEMA_VERSION
  ) {
    return disabled(mode, production, "schema_not_ready", true);
  }
  if (env[CENTRAL_BUSINESS_AUTHORITY_MUTATIONS_READY_KEY] !== "true") {
    return disabled(mode, production, "mutations_not_ready", true);
  }
  if (
    production &&
    env[CENTRAL_BUSINESS_AUTHORITY_PRODUCTION_APPROVED_KEY] !== "true"
  ) {
    return disabled(mode, production, "production_approval_missing", true);
  }

  if (isCentralAuthorityEmergencyStopped(env[CENTRAL_AUTHORITY_KILL_SWITCH_KEY])) {
    return {
      requestedMode: mode,
      effectiveMode: mode,
      enabled: true,
      writesEnabled: false,
      appliesToUser: true,
      production,
      reason: "emergency_stopped",
    };
  }

  return {
    requestedMode: mode,
    effectiveMode: mode,
    enabled: true,
    writesEnabled: true,
    appliesToUser: true,
    production,
    reason: mode === "canary" ? "canary_enabled" : "required_enabled",
  };
}
