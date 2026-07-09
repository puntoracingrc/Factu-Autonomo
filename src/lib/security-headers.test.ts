import { describe, expect, it } from "vitest";
import nextConfig from "../../next.config";

describe("security headers config", () => {
  async function configuredHeaders() {
    expect(nextConfig.headers).toBeTypeOf("function");
    return nextConfig.headers?.() ?? [];
  }

  function headerMap(
    headers: Array<{ key: string; value: string }>,
  ): Map<string, string> {
    return new Map(headers.map((header) => [header.key, header.value]));
  }

  it("applies baseline security headers globally", async () => {
    const rules = await configuredHeaders();
    const globalRule = rules.find((rule) => rule.source === "/:path*");

    expect(globalRule).toBeDefined();
    const headers = headerMap(globalRule?.headers ?? []);

    expect(headers.get("Access-Control-Allow-Origin")).toBe(
      "https://facturacion-autonomos.app",
    );
    expect(headers.get("Strict-Transport-Security")).toBe("max-age=63072000");
    expect(headers.get("X-Content-Type-Options")).toBe("nosniff");
    expect(headers.get("X-Frame-Options")).toBe("DENY");
    expect(headers.get("Referrer-Policy")).toBe(
      "strict-origin-when-cross-origin",
    );
    expect(headers.get("Permissions-Policy")).toContain("microphone=(self)");
    expect(headers.get("X-Permitted-Cross-Domain-Policies")).toBe("none");
    expect(headers.has("Content-Security-Policy")).toBe(false);
    expect(headers.get("Content-Security-Policy-Report-Only")).toContain(
      "default-src 'self'",
    );
    expect(headers.get("Content-Security-Policy-Report-Only")).toContain(
      "script-src 'self' 'unsafe-inline' https://accounts.google.com",
    );
    expect(headers.get("Content-Security-Policy-Report-Only")).toContain(
      "connect-src 'self' https://*.supabase.co wss://*.supabase.co",
    );
    expect(headers.get("Content-Security-Policy-Report-Only")).toContain(
      "object-src 'none'",
    );
  });

  it("prevents API responses from being cached by shared caches", async () => {
    const rules = await configuredHeaders();
    const apiRule = rules.find((rule) => rule.source === "/api/:path*");

    expect(apiRule).toBeDefined();
    const headers = headerMap(apiRule?.headers ?? []);

    expect(headers.get("Cache-Control")).toBe("no-store, max-age=0");
    expect(headers.get("CDN-Cache-Control")).toBe("no-store");
    expect(headers.get("Vercel-CDN-Cache-Control")).toBe("no-store");
  });
});
