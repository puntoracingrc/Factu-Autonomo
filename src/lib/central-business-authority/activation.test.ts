import { describe, expect, it } from "vitest";

import {
  CENTRAL_BUSINESS_AUTHORITY_CANARY_USER_EMAILS_KEY,
  CENTRAL_BUSINESS_AUTHORITY_MODE_KEY,
  CENTRAL_BUSINESS_AUTHORITY_MUTATIONS_READY_KEY,
  CENTRAL_BUSINESS_AUTHORITY_PRODUCTION_APPROVED_KEY,
  CENTRAL_BUSINESS_AUTHORITY_SCHEMA_VERSION,
  CENTRAL_BUSINESS_AUTHORITY_SCHEMA_VERSION_KEY,
  evaluateCentralBusinessAuthorityActivation,
} from "./activation";
import {
  CENTRAL_AUTHORITY_KILL_SWITCH_KEY,
  CENTRAL_AUTHORITY_ROLLOUT_ELIGIBLE_USERS_KEY,
  CENTRAL_AUTHORITY_ROLLOUT_PERCENT_KEY,
} from "@/lib/central-authority/rollout";

const userEmail = "puntoracingrc@gmail.com";

function readyEnv(extra: Record<string, string> = {}) {
  return {
    [CENTRAL_BUSINESS_AUTHORITY_MODE_KEY]: "canary",
    [CENTRAL_BUSINESS_AUTHORITY_CANARY_USER_EMAILS_KEY]: userEmail,
    [CENTRAL_BUSINESS_AUTHORITY_SCHEMA_VERSION_KEY]:
      CENTRAL_BUSINESS_AUTHORITY_SCHEMA_VERSION,
    [CENTRAL_BUSINESS_AUTHORITY_MUTATIONS_READY_KEY]: "true",
    ...extra,
  };
}

describe("central business authority activation", () => {
  it("permanece apagada por defecto y falla cerrado ante un modo desconocido", () => {
    expect(evaluateCentralBusinessAuthorityActivation({ env: {} })).toMatchObject({
      effectiveMode: "off",
      writesEnabled: false,
      reason: "disabled",
    });
    expect(
      evaluateCentralBusinessAuthorityActivation({
        env: { [CENTRAL_BUSINESS_AUTHORITY_MODE_KEY]: "automatic" },
      }),
    ).toMatchObject({
      effectiveMode: "off",
      writesEnabled: false,
      reason: "invalid_mode",
    });
  });

  it("shadow permite observar sin escribir", () => {
    expect(
      evaluateCentralBusinessAuthorityActivation({
        env: { [CENTRAL_BUSINESS_AUTHORITY_MODE_KEY]: "shadow" },
        userEmail,
      }),
    ).toMatchObject({
      effectiveMode: "shadow",
      enabled: true,
      writesEnabled: false,
      reason: "shadow_only",
    });
  });

  it("canary solo escribe para la allowlist con esquema y gate listos", () => {
    expect(
      evaluateCentralBusinessAuthorityActivation({
        env: readyEnv(),
        userEmail: "otro@example.com",
      }),
    ).toMatchObject({
      writesEnabled: false,
      reason: "user_not_allowlisted",
    });
    expect(
      evaluateCentralBusinessAuthorityActivation({
        env: readyEnv({
          [CENTRAL_BUSINESS_AUTHORITY_MUTATIONS_READY_KEY]: "false",
        }),
        userEmail,
      }),
    ).toMatchObject({
      writesEnabled: false,
      reason: "mutations_not_ready",
    });
    expect(
      evaluateCentralBusinessAuthorityActivation({
        env: readyEnv(),
        userEmail: userEmail.toUpperCase(),
      }),
    ).toMatchObject({
      effectiveMode: "canary",
      writesEnabled: true,
      reason: "canary_enabled",
    });
  });

  it("en produccion exige aprobacion privada incluso para el canario", () => {
    expect(
      evaluateCentralBusinessAuthorityActivation({
        env: readyEnv({ NODE_ENV: "production" }),
        userEmail,
      }),
    ).toMatchObject({
      production: true,
      writesEnabled: false,
      reason: "production_approval_missing",
    });
    expect(
      evaluateCentralBusinessAuthorityActivation({
        env: readyEnv({
          NODE_ENV: "production",
          [CENTRAL_BUSINESS_AUTHORITY_PRODUCTION_APPROVED_KEY]: "true",
        }),
        userEmail,
      }),
    ).toMatchObject({
      production: true,
      writesEnabled: true,
      reason: "canary_enabled",
    });
  });

  it("permite cohortes porcentuales estables sin retirar la allowlist explicita", () => {
    expect(
      evaluateCentralBusinessAuthorityActivation({
        env: readyEnv({
          [CENTRAL_BUSINESS_AUTHORITY_CANARY_USER_EMAILS_KEY]: "",
          [CENTRAL_AUTHORITY_ROLLOUT_PERCENT_KEY]: "100",
          [CENTRAL_AUTHORITY_ROLLOUT_ELIGIBLE_USERS_KEY]: "*",
        }),
        userId: "00000000-0000-4000-8000-000000000001",
        userEmail: "otro@example.test",
      }),
    ).toMatchObject({
      appliesToUser: true,
      writesEnabled: true,
      reason: "canary_enabled",
    });
  });

  it("el interruptor de emergencia conserva lectura y pausa escrituras", () => {
    expect(
      evaluateCentralBusinessAuthorityActivation({
        env: readyEnv({ [CENTRAL_AUTHORITY_KILL_SWITCH_KEY]: "true" }),
        userEmail,
      }),
    ).toMatchObject({
      enabled: true,
      appliesToUser: true,
      writesEnabled: false,
      reason: "emergency_stopped",
    });
  });
});
