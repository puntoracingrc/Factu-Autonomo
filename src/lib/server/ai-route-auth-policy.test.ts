import { afterEach, describe, expect, it, vi } from "vitest";
import {
  isAiRouteAuthenticationRequired,
  isExplicitLocalDevelopment,
} from "./ai-route-auth-policy";

describe("AI route authentication policy", () => {
  const localRequest = new Request("http://localhost:3000/api/test");

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("solo reconoce desarrollo local sin marcadores remotos", () => {
    expect(
      isExplicitLocalDevelopment({
        NODE_ENV: "development",
      }),
    ).toBe(true);
    expect(
      isExplicitLocalDevelopment({
        NODE_ENV: "test",
      }),
    ).toBe(false);
    expect(
      isExplicitLocalDevelopment({
        NODE_ENV: "production",
      }),
    ).toBe(false);
  });

  it.each([
    ["VERCEL", "1"],
    ["VERCEL_ENV", "production"],
    ["NEXT_PUBLIC_VERCEL_ENV", "production"],
    ["APP_ENV", "staging"],
    ["DEPLOY_ENV", "preview"],
    ["CI", "true"],
  ] as const)(
    "no permite el bypass local con %s=%s",
    (key, value) => {
      expect(
        isExplicitLocalDevelopment({
          NODE_ENV: "development",
          [key]: value,
        }),
      ).toBe(false);
    },
  );

  it("exige autenticacion en remoto aunque billing este desactivado", () => {
    expect(
      isAiRouteAuthenticationRequired(localRequest, {
        NODE_ENV: "development",
        NEXT_PUBLIC_BILLING_ENABLED: "false",
        VERCEL_ENV: "production",
        NEXT_PUBLIC_VERCEL_ENV: "production",
      }),
    ).toBe(true);
  });

  it("conserva el modo sin sesion solo en desarrollo local sin billing", () => {
    expect(
      isAiRouteAuthenticationRequired(localRequest, {
        NODE_ENV: "development",
        NEXT_PUBLIC_BILLING_ENABLED: "false",
      }),
    ).toBe(false);
  });

  it("billing activo exige autenticacion tambien en desarrollo local", () => {
    expect(
      isAiRouteAuthenticationRequired(localRequest, {
        NODE_ENV: "development",
        NEXT_PUBLIC_BILLING_ENABLED: "true",
      }),
    ).toBe(true);
  });

  it("un hostname publico nunca se considera desarrollo local", () => {
    expect(
      isAiRouteAuthenticationRequired(
        new Request("https://preview.example.com/api/test"),
        {
          NODE_ENV: "development",
          NEXT_PUBLIC_BILLING_ENABLED: "false",
        },
      ),
    ).toBe(true);
  });
});
