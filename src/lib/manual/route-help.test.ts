import { describe, expect, it } from "vitest";
import { manualHelpHref, resolveManualSlug } from "./route-help";

describe("manual route help", () => {
  it("mapea rutas principales a secciones del manual", () => {
    expect(resolveManualSlug("/")).toBe("inicio");
    expect(resolveManualSlug("/demo")).toBe("demo");
    expect(resolveManualSlug("/facturas")).toBe("facturas");
    expect(resolveManualSlug("/facturas/nuevo")).toBe("facturas");
    expect(resolveManualSlug("/facturas/abc-123")).toBe("facturas");
    expect(resolveManualSlug("/gastos/fijos")).toBe("gastos");
    expect(resolveManualSlug("/configuracion")).toBe("configuracion");
    expect(resolveManualSlug("/cuenta")).toBe("cuenta");
    expect(resolveManualSlug("/importar")).toBe("importacion");
  });

  it("oculta ayuda en rutas sin manual", () => {
    expect(resolveManualSlug("/ayuda")).toBeNull();
    expect(resolveManualSlug("/ayuda/facturas")).toBeNull();
    expect(resolveManualSlug("/precios")).toBeNull();
    expect(resolveManualSlug("/legal/privacidad")).toBeNull();
  });

  it("genera el enlace a la sección con retorno", () => {
    expect(manualHelpHref("/impuestos")).toBe(
      "/ayuda/impuestos?from=%2Fimpuestos",
    );
  });

  it("usa el indice del manual como ayuda global si no hay seccion concreta", () => {
    expect(resolveManualSlug("/sin-seccion")).toBeNull();
    expect(manualHelpHref("/sin-seccion")).toBe("/ayuda?from=%2Fsin-seccion");
  });

  it("envía las fichas de modelos al índice público sin abrir la ayuda fiscal protegida", () => {
    for (const pathname of [
      "/consultor-fiscal/modelos",
      "/consultor-fiscal/modelos/036",
      "/consultor-fiscal/modelos/037",
      "/consultor-fiscal/modelos/303",
      "/consultor-fiscal/modelos/130",
    ]) {
      expect(resolveManualSlug(pathname), pathname).toBeNull();
    }

    expect(manualHelpHref("/consultor-fiscal/modelos")).toBe(
      "/ayuda?from=%2Fconsultor-fiscal%2Fmodelos",
    );
    expect(manualHelpHref("/consultor-fiscal/modelos/037")).toBe(
      "/ayuda?from=%2Fconsultor-fiscal%2Fmodelos%2F037",
    );
  });

  it("envía el calendario a su sección pública propia", () => {
    expect(resolveManualSlug("/consultor-fiscal/calendario")).toBe(
      "calendario-fiscal",
    );
    expect(manualHelpHref("/consultor-fiscal/calendario")).toBe(
      "/ayuda/calendario-fiscal?from=%2Fconsultor-fiscal%2Fcalendario",
    );
  });

  it("envía el test de autónomos a su sección pública propia", () => {
    expect(resolveManualSlug("/consultor-fiscal/diagnostico")).toBe(
      "test-autonomos",
    );
    expect(manualHelpHref("/consultor-fiscal/diagnostico")).toBe(
      "/ayuda/test-autonomos?from=%2Fconsultor-fiscal%2Fdiagnostico",
    );
  });

  it("envía Notificaciones al índice público sin abrir la ayuda fiscal protegida", () => {
    expect(resolveManualSlug("/consultor-fiscal/notificaciones")).toBeNull();
    expect(manualHelpHref("/consultor-fiscal/notificaciones")).toBe(
      "/ayuda?from=%2Fconsultor-fiscal%2Fnotificaciones",
    );
    expect(resolveManualSlug("/consultor-fiscal/notificaciones/guia")).toBeNull();
    expect(manualHelpHref("/consultor-fiscal/notificaciones/guia")).toBe(
      "/ayuda?from=%2Fconsultor-fiscal%2Fnotificaciones%2Fguia",
    );
  });
});
