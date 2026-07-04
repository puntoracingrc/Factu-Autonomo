import { describe, expect, it } from "vitest";
import { isUserEmailConfirmed } from "./email-confirmation";

describe("isUserEmailConfirmed", () => {
  it("acepta usuarios confirmados por Supabase o proveedor externo", () => {
    expect(
      isUserEmailConfirmed({
        email: "ana@example.com",
        email_confirmed_at: "2026-07-04T10:00:00.000Z",
      }),
    ).toBe(true);
    expect(
      isUserEmailConfirmed({
        email: "ana@example.com",
        confirmed_at: "2026-07-04T10:00:00.000Z",
      }),
    ).toBe(true);
    expect(
      isUserEmailConfirmed({
        email: "ana@example.com",
        user_metadata: { email_verified: true },
      }),
    ).toBe(true);
    expect(
      isUserEmailConfirmed({
        email: "ana@example.com",
        app_metadata: { provider: "google" },
      }),
    ).toBe(true);
  });

  it("rechaza cuentas de email sin confirmacion", () => {
    expect(isUserEmailConfirmed(null)).toBe(false);
    expect(isUserEmailConfirmed({ email: "" })).toBe(false);
    expect(
      isUserEmailConfirmed({
        email: "ana@example.com",
        app_metadata: { provider: "email" },
      }),
    ).toBe(false);
  });
});
