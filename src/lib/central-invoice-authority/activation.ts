assertServerOnlyModule();

export const CENTRAL_INVOICE_AUTHORITY_MODE_KEY =
  "CENTRAL_INVOICE_AUTHORITY_MODE";
export const CENTRAL_INVOICE_AUTHORITY_CANARY_USERS_KEY =
  "CENTRAL_INVOICE_AUTHORITY_CANARY_USERS";
export const CENTRAL_INVOICE_AUTHORITY_SCHEMA_VERSION_KEY =
  "CENTRAL_INVOICE_AUTHORITY_SCHEMA_VERSION";
export const CENTRAL_INVOICE_AUTHORITY_PRODUCTION_APPROVED_KEY =
  "CENTRAL_INVOICE_AUTHORITY_PRODUCTION_APPROVED";
export const CENTRAL_INVOICE_AUTHORITY_OPERATIONAL_SYNC_READY_KEY =
  "CENTRAL_INVOICE_AUTHORITY_OPERATIONAL_SYNC_READY";
export const CENTRAL_INVOICE_AUTHORITY_BASELINE_RECONCILED_KEY =
  "CENTRAL_INVOICE_AUTHORITY_BASELINE_RECONCILED";
export const CENTRAL_INVOICE_AUTHORITY_RESTORABLE_BACKUP_VERIFIED_KEY =
  "CENTRAL_INVOICE_AUTHORITY_RESTORABLE_BACKUP_VERIFIED";
export const CENTRAL_INVOICE_AUTHORITY_ISOLATED_RESTORE_DRILL_PASSED_KEY =
  "CENTRAL_INVOICE_AUTHORITY_ISOLATED_RESTORE_DRILL_PASSED";
export const CENTRAL_INVOICE_AUTHORITY_SCHEMA_VERSION =
  "central-invoice-authority-v1";

export type CentralInvoiceAuthorityMode =
  "off" | "shadow" | "canary" | "required";

export type CentralInvoiceAuthorityActivationReason =
  | "disabled"
  | "invalid_mode"
  | "shadow_only"
  | "user_not_allowlisted"
  | "schema_not_ready"
  | "operational_sync_not_ready"
  | "baseline_not_reconciled"
  | "restorable_backup_missing"
  | "isolated_restore_drill_missing"
  | "production_approval_missing"
  | "canary_enabled"
  | "required_enabled";

export interface CentralInvoiceAuthorityActivation {
  requestedMode: CentralInvoiceAuthorityMode;
  effectiveMode: CentralInvoiceAuthorityMode;
  enabled: boolean;
  fiscalWritesEnabled: boolean;
  appliesToUser: boolean;
  production: boolean;
  reason: CentralInvoiceAuthorityActivationReason;
}

type EnvLike = Record<string, string | undefined>;

function assertServerOnlyModule() {
  if (typeof window !== "undefined") {
    throw new Error(
      "La autoridad central de facturas solo puede evaluarse en servidor.",
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

function parseMode(
  value: string | undefined,
): CentralInvoiceAuthorityMode | null {
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

function disabled(
  requestedMode: CentralInvoiceAuthorityMode,
  production: boolean,
  reason: CentralInvoiceAuthorityActivationReason,
  appliesToUser = false,
): CentralInvoiceAuthorityActivation {
  return {
    requestedMode,
    effectiveMode: "off",
    enabled: false,
    fiscalWritesEnabled: false,
    appliesToUser,
    production,
    reason,
  };
}

function canaryUsers(env: EnvLike): Set<string> {
  return new Set(
    (env[CENTRAL_INVOICE_AUTHORITY_CANARY_USERS_KEY] ?? "")
      .split(",")
      .map((value) => value.trim())
      .filter(Boolean),
  );
}

function envFlagEnabled(env: EnvLike, key: string): boolean {
  return env[key] === "true";
}

function operationalGateReason(
  env: EnvLike,
): CentralInvoiceAuthorityActivationReason | null {
  if (
    !envFlagEnabled(env, CENTRAL_INVOICE_AUTHORITY_OPERATIONAL_SYNC_READY_KEY)
  ) {
    return "operational_sync_not_ready";
  }
  if (!envFlagEnabled(env, CENTRAL_INVOICE_AUTHORITY_BASELINE_RECONCILED_KEY)) {
    return "baseline_not_reconciled";
  }
  if (
    !envFlagEnabled(
      env,
      CENTRAL_INVOICE_AUTHORITY_RESTORABLE_BACKUP_VERIFIED_KEY,
    )
  ) {
    return "restorable_backup_missing";
  }
  if (
    !envFlagEnabled(
      env,
      CENTRAL_INVOICE_AUTHORITY_ISOLATED_RESTORE_DRILL_PASSED_KEY,
    )
  ) {
    return "isolated_restore_drill_missing";
  }
  return null;
}

export function evaluateCentralInvoiceAuthorityActivation(
  input: {
    env?: EnvLike;
    userId?: string | null;
  } = {},
): CentralInvoiceAuthorityActivation {
  const env = input.env ?? process.env;
  const production = isProduction(env);
  const parsedMode = parseMode(env[CENTRAL_INVOICE_AUTHORITY_MODE_KEY]);

  if (!parsedMode) {
    return disabled("off", production, "invalid_mode");
  }
  if (parsedMode === "off") {
    return disabled(parsedMode, production, "disabled");
  }
  if (parsedMode === "shadow") {
    return {
      requestedMode: parsedMode,
      effectiveMode: parsedMode,
      enabled: true,
      fiscalWritesEnabled: false,
      appliesToUser: true,
      production,
      reason: "shadow_only",
    };
  }

  const appliesToUser =
    parsedMode === "required" ||
    Boolean(input.userId && canaryUsers(env).has(input.userId));
  if (!appliesToUser) {
    return disabled(parsedMode, production, "user_not_allowlisted", false);
  }

  if (
    env[CENTRAL_INVOICE_AUTHORITY_SCHEMA_VERSION_KEY] !==
    CENTRAL_INVOICE_AUTHORITY_SCHEMA_VERSION
  ) {
    return disabled(parsedMode, production, "schema_not_ready", true);
  }

  const gateReason = operationalGateReason(env);
  if (gateReason) {
    return disabled(parsedMode, production, gateReason, true);
  }

  if (
    production &&
    env[CENTRAL_INVOICE_AUTHORITY_PRODUCTION_APPROVED_KEY] !== "true"
  ) {
    return disabled(
      parsedMode,
      production,
      "production_approval_missing",
      true,
    );
  }

  return {
    requestedMode: parsedMode,
    effectiveMode: parsedMode,
    enabled: true,
    fiscalWritesEnabled: true,
    appliesToUser: true,
    production,
    reason: parsedMode === "canary" ? "canary_enabled" : "required_enabled",
  };
}
