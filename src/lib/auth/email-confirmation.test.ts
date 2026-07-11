import { describe, expect, it } from "vitest";
import { isUserEmailConfirmed } from "./email-confirmation";

describe("isUserEmailConfirmed", () => {
  it("acepta solo la confirmación específica de email o una claim de sistema", () => {
    expect(
      isUserEmailConfirmed({
        email: "ana@example.com",
        email_confirmed_at: "2026-07-04T10:00:00.000Z",
      }),
    ).toBe(true);
    expect(
      isUserEmailConfirmed({
        email: "ana@example.com",
        app_metadata: { email_verified: true },
      }),
    ).toBe(true);
    expect(
      isUserEmailConfirmed({
        email: "ana@example.com",
        app_metadata: { email_verified: "true" },
      }),
    ).toBe(true);
  });

  it("rechaza señales de teléfono, proveedor o metadata editable", () => {
    expect(
      isUserEmailConfirmed({
        email: "ana@example.com",
        confirmed_at: "2026-07-04T10:00:00.000Z",
        phone_confirmed_at: "2026-07-04T10:00:00.000Z",
        app_metadata: { provider: "phone" },
        user_metadata: { email_verified: true },
      }),
    ).toBe(false);
    expect(
      isUserEmailConfirmed({
        email: "ana@example.com",
        app_metadata: { provider: "google" },
        user_metadata: { email_verified: true },
      }),
    ).toBe(false);
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
