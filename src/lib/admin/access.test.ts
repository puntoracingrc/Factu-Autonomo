import { describe, expect, it } from "vitest";
import { adminEmailsFromEnv, isAdminEmail } from "./access";

describe("admin access", () => {
  it("incluye la cuenta propietaria aunque no haya variable de entorno", () => {
    expect(adminEmailsFromEnv("")).toContain("puntoracingrc@gmail.com");
  });

  it("normaliza emails configurados y no acepta emails ajenos", () => {
    expect(adminEmailsFromEnv("ADMIN@EXAMPLE.COM, otro@example.com")).toEqual([
      "admin@example.com",
      "otro@example.com",
      "puntoracingrc@gmail.com",
    ]);
    expect(isAdminEmail("no-admin@example.com")).toBe(false);
  });
});

