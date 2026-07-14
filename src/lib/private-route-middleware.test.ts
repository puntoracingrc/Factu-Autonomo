import { NextRequest } from "next/server";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  PUBLIC_AEAT_OFFICIAL_INDEXABLE_PATHS_V1,
  isPublicAeatOfficialIndexablePathV1,
} from "@/lib/fiscal-models/model-pages/official-content/indexable-paths.v1";
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
      expect(response.headers.get("Cache-Control")).toBe("no-store, max-age=0");
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
    expect(response.headers.get("Cache-Control")).toBe("no-store, max-age=0");
    expect(response.headers.get("X-Robots-Tag")).toBe(
      "noindex, nofollow, noarchive",
    );
  });

  it("abre el diagnóstico en preview de Vercel y lo mantiene cerrado en producción", () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("NEXT_PUBLIC_VERCEL_ENV", "preview");

    const preview = middleware(
      new NextRequest(
        "https://preview.vercel.app/consultor-fiscal/diagnostico",
      ),
    );
    expect(preview.status).toBe(200);
    expect(preview.headers.get("x-middleware-next")).toBe("1");

    vi.stubEnv("NEXT_PUBLIC_VERCEL_ENV", "production");
    const production = middleware(
      new NextRequest(
        "https://facturacion-autonomos.app/consultor-fiscal/diagnostico",
      ),
    );
    expect(production.status).toBe(404);
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
          isPublicAeatOfficialIndexablePathV1(pathname)
            ? null
            : "noindex, nofollow, noarchive",
        );
      }
    }
  });

  it("retira noindex únicamente del índice y las ciento ochenta y una fichas contrastadas", () => {
    expect(PUBLIC_AEAT_OFFICIAL_INDEXABLE_PATHS_V1).toHaveLength(182);
    for (const pathname of PUBLIC_AEAT_OFFICIAL_INDEXABLE_PATHS_V1) {
      const response = middleware(
        new NextRequest("https://facturacion-autonomos.app" + pathname),
      );
      expect(response.status, pathname).toBe(200);
      expect(response.headers.get("Cache-Control"), pathname).toBe(
        "no-store, max-age=0",
      );
      expect(response.headers.get("X-Robots-Tag"), pathname).toBeNull();
    }
    for (const pathname of [
      "/consultor-fiscal/modelos/630",
      "/consultor-fiscal/modelos/299",
      "/consultor-fiscal/modelos/399",
    ]) {
      expect(
        middleware(
          new NextRequest("https://facturacion-autonomos.app" + pathname),
        ).headers.get("X-Robots-Tag"),
        pathname,
      ).toBe("noindex, nofollow, noarchive");
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
    expect(calendar.headers.get("Cache-Control")).toBe("no-store, max-age=0");
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

  it("publica únicamente Notificaciones literal sin abrir el analizador", () => {
    for (const enabled of ["false", "true"]) {
      vi.stubEnv("NEXT_PUBLIC_CONSULTOR_FISCAL_ENABLED", enabled);

      const notifications = middleware(
        new NextRequest(
          "https://facturacion-autonomos.app/consultor-fiscal/notificaciones",
        ),
      );
      expect(notifications.status, enabled).toBe(200);
      expect(notifications.headers.get("x-middleware-next"), enabled).toBe("1");
      expect(notifications.headers.get("Cache-Control"), enabled).toBe(
        "no-store, max-age=0",
      );
      expect(notifications.headers.get("X-Robots-Tag"), enabled).toBe(
        "noindex, nofollow, noarchive",
      );
    }

    vi.stubEnv("NEXT_PUBLIC_CONSULTOR_FISCAL_ENABLED", "false");
    for (const pathname of [
      "/consultor-fiscal/Notificaciones",
      "/consultor-fiscal/notificaciones/extra",
      "/consultor-fiscal/notificaciones%2Fextra",
      "/consultor-fiscal/analisis",
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

  it("rechaza aliases percent-encoded del Consultor con ambos estados de la Beta", () => {
    for (const enabled of ["false", "true"]) {
      vi.stubEnv("NEXT_PUBLIC_CONSULTOR_FISCAL_ENABLED", enabled);

      for (const pathname of [
        "/%63onsultor-fiscal/notificaciones",
        "/consultor%2Dfiscal/notificaciones",
        "/consultor-fisca%6C/notificaciones",
        "/consultor-fiscal%2Fnotificaciones",
        "/%2563onsultor-fiscal/notificaciones",
        "/consultor-fiscal%252Fnotificaciones",
      ]) {
        const response = middleware(
          new NextRequest("https://facturacion-autonomos.app" + pathname),
        );

        expect(response.status, `${enabled} ${pathname}`).toBe(404);
        expect(
          response.headers.get("Cache-Control"),
          `${enabled} ${pathname}`,
        ).toBe("no-store, max-age=0");
        expect(
          response.headers.get("X-Robots-Tag"),
          `${enabled} ${pathname}`,
        ).toBe("noindex, nofollow, noarchive");
      }
    }
  });

  it("rechaza variantes y códigos no catalogados incluso con la Beta activa", () => {
    vi.stubEnv("NEXT_PUBLIC_CONSULTOR_FISCAL_ENABLED", "true");

    for (const pathname of [
      "/consultor-fiscal/modelos/000",
      "/consultor-fiscal/modelos/191",
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
