import { NextRequest } from "next/server";
import { afterEach, describe, expect, it, vi } from "vitest";
import { PUBLIC_AEAT_MODEL_REVIEW_PATHS_V1 } from "@/lib/fiscal-models/model-pages/public-review-route-manifest.v1";
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
        new NextRequest("https://facturacion-autonomos.app" + pathname),
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
      new NextRequest("https://facturacion-autonomos.app/consultor-fiscal"),
    );

    expect(response.status).toBe(200);
    expect(response.headers.get("x-middleware-next")).toBe("1");
  });

  it("publica únicamente el índice y las 229 rutas literales informativas", () => {
    expect(PUBLIC_AEAT_MODEL_REVIEW_PATHS_V1).toHaveLength(229);

    for (const enabled of ["false", "true"]) {
      vi.stubEnv("NEXT_PUBLIC_CONSULTOR_FISCAL_ENABLED", enabled);

      for (const pathname of [
        "/consultor-fiscal/modelos",
        ...PUBLIC_AEAT_MODEL_REVIEW_PATHS_V1,
      ]) {
        const response = middleware(
          new NextRequest("https://facturacion-autonomos.app" + pathname),
        );
        const caseLabel = enabled + " " + pathname;

        expect(response.status, caseLabel).toBe(200);
        expect(response.headers.get("x-middleware-next"), caseLabel).toBe("1");
        expect(response.headers.get("Cache-Control"), caseLabel).toBe(
          "no-store, max-age=0",
        );
        expect(response.headers.get("X-Robots-Tag"), caseLabel).toBe(
          "noindex, nofollow, noarchive",
        );
      }
    }
  });

  it("publica el calendario literal sin abrir el resto del Consultor", () => {
    vi.stubEnv("NEXT_PUBLIC_CONSULTOR_FISCAL_ENABLED", "false");

    const calendar = middleware(
      new NextRequest(
        "https://facturacion-autonomos.app/consultor-fiscal/calendario",
      ),
    );
    expect(calendar.status).toBe(200);
    expect(calendar.headers.get("x-middleware-next")).toBe("1");
    expect(calendar.headers.get("Cache-Control")).toBe(
      "no-store, max-age=0",
    );
    expect(calendar.headers.get("X-Robots-Tag")).toBe(
      "noindex, nofollow, noarchive",
    );

    for (const pathname of [
      "/consultor-fiscal/Calendario",
      "/consultor-fiscal/calendario/extra",
      "/consultor-fiscal/calendario%2Fextra",
    ]) {
      expect(
        middleware(
          new NextRequest("https://facturacion-autonomos.app" + pathname),
        ).status,
        pathname,
      ).toBe(404);
    }
  });

  it("rechaza variantes y códigos no catalogados incluso con la Beta activa", () => {
    vi.stubEnv("NEXT_PUBLIC_CONSULTOR_FISCAL_ENABLED", "true");

    for (const pathname of [
      "/consultor-fiscal/modelos/000",
      "/consultor-fiscal/modelos/601",
      "/consultor-fiscal/modelos/999",
      "/consultor-fiscal/modelos/A25",
      "/consultor-fiscal/modelos/036/extra",
      "/consultor-fiscal/modelos/%30%33%36",
      "/consultor-fiscal/modelos/%41%32%32",
      "/consultor-fiscal/modelos/A%32%32",
      "/consultor-fiscal/modelos/%2F036",
      "/consultor-fiscal/modelos%2F036",
      "/consultor-fiscal/modelosx/036",
      "/consultor-fiscal/modelos/01c",
      "/consultor-fiscal/modelos/a22",
      "/consultor-fiscal/modelos/303.json",
    ]) {
      const response = middleware(
        new NextRequest("https://facturacion-autonomos.app" + pathname),
      );

      expect(response.status, pathname).toBe(404);
      expect(response.headers.get("Cache-Control"), pathname).toBe(
        "no-store, max-age=0",
      );
      expect(response.headers.get("X-Robots-Tag"), pathname).toBe(
        "noindex, nofollow, noarchive",
      );
    }
  });

  // Next 15 responde 308 antes del middleware para una barra final o doble y
  // dirige únicamente a la ruta literal canónica. Esa excepción se comprueba
  // en la matriz HTTP; aquí no se atribuye al middleware un 404 que no emite.

  it("bloquea case variants y traversal con ambos estados de la Beta", () => {
    for (const enabled of ["false", "true"]) {
      vi.stubEnv("NEXT_PUBLIC_CONSULTOR_FISCAL_ENABLED", enabled);

      for (const pathname of [
        "/consultor-fiscal/Modelos/036",
        "/consultor-fiscal/modelos/%2e%2e/036",
        "/consultor-fiscal/modelos/%2E%2E%2F036",
        "/consultor-fiscal/modelos/%2e%2e/303",
        "/consultor-fiscal/modelos/%2E%2E%2F303",
      ]) {
        const response = middleware(
          new NextRequest("https://facturacion-autonomos.app" + pathname),
        );
        const caseLabel = enabled + " " + pathname;

        expect(response.status, caseLabel).toBe(404);
        expect(response.headers.get("X-Robots-Tag"), caseLabel).toBe(
          "noindex, nofollow, noarchive",
        );
      }
    }
  });
});
