import type { FiscalCalendarProviderMode } from "./types";

export const FISCAL_CALENDAR_ENABLED_KEY =
  "FISCAL_CALENDAR_ENABLED" as const;
export const GOOGLE_CALENDAR_API_KEY =
  "GOOGLE_CALENDAR_API_KEY" as const;

export type FiscalCalendarEnv = Readonly<
  Record<string, string | undefined>
>;

export type FiscalCalendarConfigReason =
  | "MISSING_FLAG"
  | "EXPLICITLY_DISABLED"
  | "ENABLED_PUBLIC_REVIEW"
  | "ENABLED_LOCAL";

export interface FiscalCalendarRuntimeConfig {
  enabled: boolean;
  localOnly: boolean;
  reason: FiscalCalendarConfigReason;
  providerMode: FiscalCalendarProviderMode;
  apiKey: string | null;
}

function productionEnvironment(env: FiscalCalendarEnv): boolean {
  return (
    env.NODE_ENV === "production" ||
    env.VERCEL_ENV === "production" ||
    env.APP_ENV === "production" ||
    env.DEPLOY_ENV === "production"
  );
}

function remoteEnvironment(env: FiscalCalendarEnv): boolean {
  return (
    env.VERCEL === "1" ||
    env.VERCEL_ENV === "preview" ||
    env.VERCEL_ENV === "staging" ||
    env.APP_ENV === "staging" ||
    env.DEPLOY_ENV === "staging" ||
    env.SUPABASE_ENV === "remote"
  );
}

export function resolveFiscalCalendarConfig(
  env: FiscalCalendarEnv = process.env,
): FiscalCalendarRuntimeConfig {
  if (productionEnvironment(env) || remoteEnvironment(env)) {
    return {
      enabled: true,
      localOnly: false,
      reason: "ENABLED_PUBLIC_REVIEW",
      providerMode: "review-only",
      apiKey: null,
    };
  }

  const apiKey = env[GOOGLE_CALENDAR_API_KEY]?.trim() || null;
  const providerMode: FiscalCalendarProviderMode = apiKey
    ? "google-calendar"
    : "fixture";

  const configured = env[FISCAL_CALENDAR_ENABLED_KEY];
  if (configured === undefined || configured.trim() === "") {
    return {
      enabled: false,
      localOnly: true,
      reason: "MISSING_FLAG",
      providerMode,
      apiKey,
    };
  }
  if (configured !== "true") {
    return {
      enabled: false,
      localOnly: true,
      reason: "EXPLICITLY_DISABLED",
      providerMode,
      apiKey,
    };
  }

  return {
    enabled: true,
    localOnly: true,
    reason: "ENABLED_LOCAL",
    providerMode,
    apiKey,
  };
}

export function isFiscalCalendarEnabled(
  env: FiscalCalendarEnv = process.env,
): boolean {
  return resolveFiscalCalendarConfig(env).enabled;
}
