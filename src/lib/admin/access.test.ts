import { afterEach, describe, expect, it, vi } from "vitest";
import { adminEmailsFromEnv, isAdminEmail } from "./access";

describe("admin access", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("incluye la cuenta propietaria fuera de produccion aunque no haya variable de entorno", () => {
    expect(adminEmailsFromEnv("", { nodeEnv: "development" })).toContain(
      "puntoracingrc@gmail.com",
    );
  });

  it("exige admins explicitos en produccion", () => {
    expect(adminEmailsFromEnv("", { nodeEnv: "production" })).toEqual([]);
    expect(
      adminEmailsFromEnv("ADMIN@EXAMPLE.COM, otro@example.com", {
        nodeEnv: "production",
      }),
    ).toEqual(["admin@example.com", "otro@example.com"]);
  });

  it("normaliza emails configurados y no acepta emails ajenos", () => {
    expect(
      adminEmailsFromEnv("ADMIN@EXAMPLE.COM, otro@example.com", {
        nodeEnv: "development",
      }),
    ).toEqual(["admin@example.com", "otro@example.com", "puntoracingrc@gmail.com"]);
    expect(isAdminEmail("no-admin@example.com")).toBe(false);
  });

  it("aplica la politica de produccion en la comprobacion real", () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("ADMIN_EMAILS", "owner@example.com");

    expect(isAdminEmail("owner@example.com")).toBe(true);
    expect(isAdminEmail("puntoracingrc@gmail.com")).toBe(false);
  });
});
