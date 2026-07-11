import { describe, expect, it } from "vitest";
import {
  isRetryableWelcomeStatus,
  WELCOME_MAX_CLIENT_RETRIES,
  welcomeRetryDelayMs,
} from "./welcome-client-retry";

describe("welcome client retry policy", () => {
  it("solo reintenta respuestas transitorias", () => {
    expect([401, 408, 425, 429, 500, 503].map(isRetryableWelcomeStatus)).toEqual([
      true,
      true,
      true,
      true,
      true,
      true,
    ]);
    expect([200, 202, 400, 403, 404].map(isRetryableWelcomeStatus)).toEqual([
      false,
      false,
      false,
      false,
      false,
    ]);
  });

  it("aplica backoff exponencial y un máximo acotado", () => {
    expect(WELCOME_MAX_CLIENT_RETRIES).toBe(3);
    expect(welcomeRetryDelayMs({ retryIndex: 0 })).toBe(30_000);
    expect(welcomeRetryDelayMs({ retryIndex: 1 })).toBe(60_000);
    expect(welcomeRetryDelayMs({ retryIndex: 2 })).toBe(120_000);
    expect(welcomeRetryDelayMs({ retryIndex: 20 })).toBe(300_000);
  });

  it("respeta Retry-After sin permitir esperas sin límite", () => {
    expect(
      welcomeRetryDelayMs({ retryIndex: 0, retryAfter: "180" }),
    ).toBe(180_000);
    expect(
      welcomeRetryDelayMs({ retryIndex: 0, retryAfter: "999999" }),
    ).toBe(300_000);
    expect(
      welcomeRetryDelayMs({
        retryIndex: 0,
        retryAfter: "Sat, 11 Jul 2026 01:03:00 GMT",
        now: Date.parse("2026-07-11T01:00:00.000Z"),
      }),
    ).toBe(180_000);
  });
});
