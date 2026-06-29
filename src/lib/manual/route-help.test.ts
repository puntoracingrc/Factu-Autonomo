import { describe, expect, it } from "vitest";
import { manualHelpHref, resolveManualSlug } from "./route-help";

describe("manual route help", () => {
  it("mapea rutas principales a secciones del manual", () => {
    expect(resolveManualSlug("/")).toBe("inicio");
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
});
