import { describe, expect, it } from "vitest";
import robots from "@/app/robots";

describe("robots metadata", () => {
  it("keeps private app surfaces out of crawler-friendly routes", () => {
    const metadata = robots();
    const rule = Array.isArray(metadata.rules)
      ? metadata.rules[0]
      : metadata.rules;

    expect(rule.disallow).toEqual(
      expect.arrayContaining([
        "/admin",
        "/api",
        "/auth",
        "/google-auth",
        "/drive",
        "/cuenta",
        "/facturas",
        "/gastos",
        "/rentabilidad-real",
      ]),
    );
    expect(metadata.sitemap).toBe(
      "https://facturacion-autonomos.app/sitemap.xml",
    );
  });
});
