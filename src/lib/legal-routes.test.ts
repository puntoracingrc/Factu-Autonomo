import { describe, expect, it } from "vitest";
import sitemap from "@/app/sitemap";
import {
  privacyPageMetadata,
  termsPageMetadata,
} from "@/lib/legal-metadata";
import { config as middlewareConfig, middleware } from "@/middleware";
import { NextRequest } from "next/server";
import nextConfig from "../../next.config";

const legalAliases = [
  {
    source: "/privacidad",
    destination: "/legal/privacidad",
  },
  {
    source: "/privacy",
    destination: "/legal/privacidad",
  },
  {
    source: "/terminos",
    destination: "/legal/terminos",
  },
  {
    source: "/terms",
    destination: "/legal/terminos",
  },
] as const;

describe("legal canonical routes", () => {
  it("publishes a route-specific canonical for privacy and terms", () => {
    expect(privacyPageMetadata.alternates.canonical).toBe(
      "/legal/privacidad",
    );
    expect(termsPageMetadata.alternates.canonical).toBe("/legal/terminos");
  });

  it("keeps only canonical legal URLs in the sitemap", () => {
    const urls = sitemap().map((entry) => entry.url);

    expect(urls).toContain(
      "https://facturacion-autonomos.app/legal/privacidad",
    );
    expect(urls).toContain(
      "https://facturacion-autonomos.app/legal/terminos",
    );

    for (const { source } of legalAliases) {
      expect(urls).not.toContain(`https://facturacion-autonomos.app${source}`);
    }
  });

  it("redirects every inventoried alias once with HTTP 308", () => {
    const aliasSources = new Set<string>(
      legalAliases.map(({ source }) => source),
    );

    expect(middlewareConfig.matcher).toEqual(
      expect.arrayContaining([...aliasSources]),
    );

    for (const { source, destination } of legalAliases) {
      const response = middleware(
        new NextRequest(
          `https://facturacion-autonomos.app${source}?origen=alias`,
        ),
      );

      expect(response.status).toBe(308);
      expect(response.headers.get("location")).toBe(
        `https://facturacion-autonomos.app${destination}?origen=alias`,
      );
      expect(source).not.toBe(destination);
      expect(aliasSources.has(destination)).toBe(false);
    }
  });

  it("keeps baseline security headers on redirect responses", async () => {
    const configuredRules = (await nextConfig.headers?.()) ?? [];
    const globalRule = configuredRules.find(
      (rule) => rule.source === "/:path*",
    );
    const configuredHeaders = new Map(
      (globalRule?.headers ?? []).map(({ key, value }) => [key, value]),
    );

    for (const { source } of legalAliases) {
      const response = middleware(
        new NextRequest(`https://facturacion-autonomos.app${source}`),
      );

      for (const [key, value] of configuredHeaders) {
        expect(response.headers.get(key)).toBe(value);
      }
    }
  });
});
