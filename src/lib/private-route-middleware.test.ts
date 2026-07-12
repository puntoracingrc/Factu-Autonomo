import { NextRequest } from "next/server";
import { afterEach, describe, expect, it, vi } from "vitest";
import { middleware } from "@/middleware";

describe("private route middleware", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("adds no-store and noindex headers to matched private app pages", () => {
    const response = middleware();

    expect(response.headers.get("Cache-Control")).toBe("no-store, max-age=0");
    expect(response.headers.get("CDN-Cache-Control")).toBe("no-store");
    expect(response.headers.get("Vercel-CDN-Cache-Control")).toBe("no-store");
    expect(response.headers.get("X-Robots-Tag")).toBe(
      "noindex, nofollow, noarchive",
    );
  });

  it("cierra página y ayuda del Consultor fiscal con un 404 real", () => {
    vi.stubEnv("NEXT_PUBLIC_CONSULTOR_FISCAL_ENABLED", "false");

    for (const pathname of [
      "/consultor-fiscal",
      "/consultor-fiscal/analisis",
      "/ayuda/consultor-fiscal",
    ]) {
      const response = middleware(
        new NextRequest(`https://facturacion-autonomos.app${pathname}`),
      );

      expect(response.status).toBe(404);
      expect(response.headers.get("Cache-Control")).toBe(
        "no-store, max-age=0",
      );
      expect(response.headers.get("X-Robots-Tag")).toBe(
        "noindex, nofollow, noarchive",
      );
    }
  });

  it("deja continuar la Beta solo tras activación explícita", () => {
    vi.stubEnv("NEXT_PUBLIC_CONSULTOR_FISCAL_ENABLED", "true");

    const response = middleware(
      new NextRequest(
        "https://facturacion-autonomos.app/consultor-fiscal",
      ),
    );

    expect(response.status).toBe(200);
    expect(response.headers.get("x-middleware-next")).toBe("1");
  });
});
