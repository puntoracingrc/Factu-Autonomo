import type { FiscalModelsEngineAccess } from "../contracts";

assertServerOnlyModule();

export const FISCAL_MODELS_ENGINE_FLAG = "fiscal_models_engine" as const;

const REMOTE_RUNTIME_ENV_KEYS = Object.freeze([
  "AWS_EXECUTION_ENV",
  "CI",
  "CODESPACES",
  "DYNO",
  "FLY_APP_NAME",
  "GITHUB_ACTIONS",
  "NETLIFY",
  "RAILWAY_ENVIRONMENT",
  "RENDER",
  "VERCEL",
  "VERCEL_ENV",
] as const);

function assertServerOnlyModule(): void {
  if (typeof window !== "undefined") {
    throw new Error("Fiscal Models feature access can only run on the server.");
  }
}

export function resolveFiscalModelsEngineAccess(input: Readonly<{
  configured: string | undefined;
  mode: string | undefined;
  nodeEnv: string | undefined;
  remoteRuntime: boolean;
}>): FiscalModelsEngineAccess {
  if (input.configured !== "true") {
    return Object.freeze({ enabled: false, reason: "FEATURE_DISABLED" });
  }
  if (input.mode !== "local_preview") {
    return Object.freeze({ enabled: false, reason: "INVALID_MODE" });
  }
  if (input.remoteRuntime !== false) {
    return Object.freeze({ enabled: false, reason: "REMOTE_RUNTIME_BLOCKED" });
  }
  if (input.nodeEnv !== "development" && input.nodeEnv !== "test") {
    return Object.freeze({ enabled: false, reason: "PRODUCTION_BLOCKED" });
  }
  return Object.freeze({ enabled: true, reason: "ENABLED_LOCAL_PREVIEW" });
}

export function isFiscalModelsEngineEnabled(): boolean {
  return resolveFiscalModelsEngineAccess({
    configured: process.env.FISCAL_MODELS_ENGINE_ENABLED,
    mode: process.env.FISCAL_MODELS_ENGINE_MODE,
    nodeEnv: process.env.NODE_ENV,
    remoteRuntime: REMOTE_RUNTIME_ENV_KEYS.some(
      (key) => process.env[key] !== undefined,
    ),
  }).enabled;
}
