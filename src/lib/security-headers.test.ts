import { describe, expect, it, vi } from "vitest";
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
      "script-src 'self' 'unsafe-inline' https://accounts.google.com https://challenges.cloudflare.com",
    );
    expect(headers.get("Content-Security-Policy-Report-Only")).toContain(
      "'wasm-unsafe-eval'",
    );
    expect(headers.get("Content-Security-Policy-Report-Only")).toContain(
      "frame-src 'self' https://accounts.google.com https://challenges.cloudflare.com",
    );
    expect(headers.get("Content-Security-Policy-Report-Only")).toContain(
      "connect-src 'self' https://*.supabase.co wss://*.supabase.co",
    );
    expect(headers.get("Content-Security-Policy-Report-Only")).toContain(
      "object-src 'none'",
    );
    expect(headers.get("Content-Security-Policy-Report-Only")).toContain(
      "report-uri /api/security/csp-report",
    );
  });

  it("can enforce CSP with an explicit production switch", async () => {
    const previous = process.env.SECURITY_CSP_MODE;
    process.env.SECURITY_CSP_MODE = "enforce";

    try {
      vi.resetModules();
      const { default: enforcedConfig } = await import("../../next.config");
      const rules = (await enforcedConfig.headers?.()) ?? [];
      const globalRule = rules.find((rule) => rule.source === "/:path*");
      const headers = headerMap(globalRule?.headers ?? []);

      expect(headers.get("Content-Security-Policy")).toContain(
        "default-src 'self'",
      );
      expect(headers.has("Content-Security-Policy-Report-Only")).toBe(false);
    } finally {
      if (previous === undefined) {
        delete process.env.SECURITY_CSP_MODE;
      } else {
        process.env.SECURITY_CSP_MODE = previous;
      }
      vi.resetModules();
    }
  });

  it("prevents API responses from being cached by shared caches", async () => {
    const rules = await configuredHeaders();
    const apiRule = rules.find((rule) => rule.source === "/api/:path*");

    expect(apiRule).toBeDefined();
    const headers = headerMap(apiRule?.headers ?? []);

    expect(headers.get("Cache-Control")).toBe("no-store, max-age=0");
    expect(headers.get("CDN-Cache-Control")).toBe("no-store");
    expect(headers.get("Vercel-CDN-Cache-Control")).toBe("no-store");
    expect(headers.get("X-Robots-Tag")).toBe("noindex, nofollow, noarchive");
  });

  it("marks private app surfaces as non-indexable", async () => {
    const rules = await configuredHeaders();
    const privateRouteSources = [
      "/admin/:path*",
      "/auth/callback/:path*",
      "/cuenta/:path*",
      "/drive/callback/:path*",
      "/facturas/:path*",
      "/google-auth/callback/:path*",
      "/clientes/:path*",
      "/gastos/:path*",
    ];

    for (const source of privateRouteSources) {
      const rule = rules.find((candidate) => candidate.source === source);
      expect(rule).toBeDefined();
      const headers = headerMap(rule?.headers ?? []);
      expect(headers.get("Cache-Control")).toBe("no-store, max-age=0");
      expect(headers.get("CDN-Cache-Control")).toBe("no-store");
      expect(headers.get("Vercel-CDN-Cache-Control")).toBe("no-store");
      expect(headers.get("X-Robots-Tag")).toBe(
        "noindex, nofollow, noarchive",
      );
    }
  });

  it("leaves Consultor indexing to the exact middleware allowlist", async () => {
    const rules = await configuredHeaders();
    const rule = rules.find(
      (candidate) => candidate.source === "/consultor-fiscal/:path*",
    );
    expect(rule).toBeDefined();
    const headers = headerMap(rule?.headers ?? []);
    expect(headers.get("Cache-Control")).toBe("no-store, max-age=0");
    expect(headers.get("CDN-Cache-Control")).toBe("no-store");
    expect(headers.get("Vercel-CDN-Cache-Control")).toBe("no-store");
    expect(headers.has("X-Robots-Tag")).toBe(false);
  });
});
