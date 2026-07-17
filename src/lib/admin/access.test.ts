import { afterEach, describe, expect, it, vi } from "vitest";
import { adminEmailsFromEnv, isAdminEmail } from "./access";

describe("admin access", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("incluye siempre las cuentas administradoras propietarias", () => {
    expect(adminEmailsFromEnv("")).toEqual([
      "puntoracingrc@gmail.com",
      "persianasalmar@gmail.com",
    ]);
  });

  it("conserva los administradores propietarios en produccion", () => {
    expect(adminEmailsFromEnv("")).toEqual([
      "puntoracingrc@gmail.com",
      "persianasalmar@gmail.com",
    ]);
    expect(adminEmailsFromEnv("ADMIN@EXAMPLE.COM, otro@example.com")).toEqual([
      "puntoracingrc@gmail.com",
      "persianasalmar@gmail.com",
      "admin@example.com",
      "otro@example.com",
    ]);
  });

  it("normaliza emails configurados y no acepta emails ajenos", () => {
    expect(adminEmailsFromEnv("ADMIN@EXAMPLE.COM, otro@example.com")).toEqual([
      "puntoracingrc@gmail.com",
      "persianasalmar@gmail.com",
      "admin@example.com",
      "otro@example.com",
    ]);
    expect(isAdminEmail("no-admin@example.com")).toBe(false);
  });

  it("aplica la politica de produccion en la comprobacion real", () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("ADMIN_EMAILS", "owner@example.com");

    expect(isAdminEmail("owner@example.com")).toBe(true);
    expect(isAdminEmail("puntoracingrc@gmail.com")).toBe(true);
    expect(isAdminEmail("persianasalmar@gmail.com")).toBe(true);
  });
});
