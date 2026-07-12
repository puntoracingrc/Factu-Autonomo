import { readFileSync } from "node:fs";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  FISCAL_MODELS_ENGINE_FLAG,
  isFiscalModelsEngineEnabled,
  resolveFiscalModelsEngineAccess,
} from "./feature-flag";

const LOCAL_PREVIEW = Object.freeze({
  configured: "true",
  mode: "local_preview",
  nodeEnv: "test",
  remoteRuntime: false,
});

const REMOTE_ENV_KEYS = [
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
] as const;

function stubLocalRuntime(): void {
  for (const key of REMOTE_ENV_KEYS) vi.stubEnv(key, undefined);
}

describe("fiscal models private feature flag", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("uses the stable internal flag id and remains off by default", () => {
    expect(FISCAL_MODELS_ENGINE_FLAG).toBe("fiscal_models_engine");
    expect(
      resolveFiscalModelsEngineAccess({
        configured: undefined,
        mode: undefined,
        nodeEnv: "test",
        remoteRuntime: false,
      }),
    ).toEqual({ enabled: false, reason: "FEATURE_DISABLED" });
    expect(isFiscalModelsEngineEnabled()).toBe(false);
  });

  it("requires exact values and never trims or coerces configuration", () => {
    expect(
      resolveFiscalModelsEngineAccess({
        ...LOCAL_PREVIEW,
        configured: " true ",
      }),
    ).toEqual({ enabled: false, reason: "FEATURE_DISABLED" });
    expect(
      resolveFiscalModelsEngineAccess({ ...LOCAL_PREVIEW, mode: "preview" }),
    ).toEqual({ enabled: false, reason: "INVALID_MODE" });
  });

  it("blocks production and every Vercel runtime", () => {
    expect(
      resolveFiscalModelsEngineAccess({
        ...LOCAL_PREVIEW,
        nodeEnv: "production",
      }),
    ).toEqual({ enabled: false, reason: "PRODUCTION_BLOCKED" });
    expect(
      resolveFiscalModelsEngineAccess({
        ...LOCAL_PREVIEW,
        remoteRuntime: true,
      }),
    ).toEqual({ enabled: false, reason: "REMOTE_RUNTIME_BLOCKED" });
  });

  it("enables only an explicit local development or test preview", () => {
    expect(resolveFiscalModelsEngineAccess(LOCAL_PREVIEW)).toEqual({
      enabled: true,
      reason: "ENABLED_LOCAL_PREVIEW",
    });
    expect(
      resolveFiscalModelsEngineAccess({
        ...LOCAL_PREVIEW,
        nodeEnv: "development",
      }),
    ).toEqual({ enabled: true, reason: "ENABLED_LOCAL_PREVIEW" });

    stubLocalRuntime();
    vi.stubEnv("FISCAL_MODELS_ENGINE_ENABLED", "true");
    vi.stubEnv("FISCAL_MODELS_ENGINE_MODE", "local_preview");
    vi.stubEnv("NODE_ENV", "test");
    expect(isFiscalModelsEngineEnabled()).toBe(true);
  });

  it("blocks CI and other detected remote runtimes", () => {
    stubLocalRuntime();
    vi.stubEnv("FISCAL_MODELS_ENGINE_ENABLED", "true");
    vi.stubEnv("FISCAL_MODELS_ENGINE_MODE", "local_preview");
    vi.stubEnv("NODE_ENV", "test");
    vi.stubEnv("CI", "true");

    expect(isFiscalModelsEngineEnabled()).toBe(false);
  });

  it("ignores public lookalike flags and keeps server exports isolated", () => {
    stubLocalRuntime();
    vi.stubEnv("FISCAL_MODELS_ENGINE_ENABLED", undefined);
    vi.stubEnv("FISCAL_MODELS_ENGINE_MODE", undefined);
    vi.stubEnv("NEXT_PUBLIC_FISCAL_MODELS_ENGINE_ENABLED", "true");
    vi.stubEnv("NEXT_PUBLIC_FISCAL_MODELS_ENGINE_MODE", "local_preview");
    vi.stubEnv("NODE_ENV", "test");

    expect(isFiscalModelsEngineEnabled()).toBe(false);

    const source = readFileSync(new URL("./feature-flag.ts", import.meta.url),
      "utf8",
    );
    const publicIndex = readFileSync(new URL("../index.ts", import.meta.url),
      "utf8",
    );
    expect(source).not.toContain("NEXT_PUBLIC_");
    expect(publicIndex).not.toMatch(/server\/feature-flag/);
  });
});
