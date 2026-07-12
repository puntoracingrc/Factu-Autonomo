import { describe, expect, it } from "vitest";
import { resolveFiscalCalendarConfig } from "./config";

describe("configuración local del calendario fiscal", () => {
  it("permanece desactivado por defecto y usa fixtures sin clave", () => {
    expect(resolveFiscalCalendarConfig({ NODE_ENV: "development" })).toEqual({
      enabled: false,
      localOnly: true,
      reason: "MISSING_FLAG",
      providerMode: "fixture",
      apiKey: null,
    });
  });

  it("solo acepta la activación literal true", () => {
    expect(
      resolveFiscalCalendarConfig({
        NODE_ENV: "development",
        FISCAL_CALENDAR_ENABLED: "TRUE",
      }),
    ).toMatchObject({ enabled: false, reason: "EXPLICITLY_DISABLED" });
    expect(
      resolveFiscalCalendarConfig({
        NODE_ENV: "development",
        FISCAL_CALENDAR_ENABLED: "true",
      }),
    ).toMatchObject({ enabled: true, reason: "ENABLED_LOCAL" });
  });

  it("selecciona Google solo cuando existe una clave servidor", () => {
    const config = resolveFiscalCalendarConfig({
      NODE_ENV: "development",
      FISCAL_CALENDAR_ENABLED: "true",
      GOOGLE_CALENDAR_API_KEY: "  test-only-key  ",
    });
    expect(config).toMatchObject({
      enabled: true,
      providerMode: "google-calendar",
      apiKey: "test-only-key",
    });
  });

  it.each([
    { NODE_ENV: "production" },
    { VERCEL_ENV: "production" },
    { VERCEL: "1" },
    { VERCEL_ENV: "preview" },
    { APP_ENV: "staging" },
  ] as const)("consulta el iCalendar público sin clave en remoto", (env) => {
    expect(
      resolveFiscalCalendarConfig({
        ...env,
        FISCAL_CALENDAR_ENABLED: "true",
        GOOGLE_CALENDAR_API_KEY: "secret-that-must-stay-server-side",
      }),
    ).toEqual({
      enabled: true,
      localOnly: false,
      reason: "ENABLED_PUBLIC_ICALENDAR",
      providerMode: "aeat-icalendar",
      apiKey: null,
    });
  });
});
