import { describe, expect, it } from "vitest";
import { getManualSection, getManualSlugs, manualSections } from "./sections";

describe("manual sections", () => {
  it("expone secciones ordenadas con slugs únicos", () => {
    const slugs = getManualSlugs();
    const orders = manualSections.map((section) => section.order);
    expect(slugs.length).toBe(manualSections.length);
    expect(new Set(slugs).size).toBe(slugs.length);
    expect(new Set(orders).size).toBe(orders.length);
    expect(manualSections[0]?.slug).toBe("primeros-pasos");
    expect(manualSections[1]?.slug).toBe("demo");
  });

  it("resuelve cada slug", () => {
    for (const slug of getManualSlugs()) {
      const section = getManualSection(slug);
      expect(section?.slug).toBe(slug);
      expect(section?.steps.length).toBeGreaterThan(0);
    }
  });

  it("documenta los flujos recientes de entrada, cuenta y confianza", () => {
    const manualText = JSON.stringify(manualSections);

    expect(getManualSection("demo")?.summary).toContain("datos ficticios");
    expect(manualText).toContain("Demo sin registro");
    expect(manualText).toContain("Empezar gratis");
    expect(manualText).toContain("Volver al tour");
    expect(manualText).toContain("Crear cuenta real");
    expect(manualText).toContain("email verificado");
    expect(manualText).toContain("Email pendiente de confirmar");
    expect(manualText).toContain("Guardar estos datos en mi cuenta");
    expect(manualText).toContain("Seguir solo en este navegador");
    expect(manualText).toContain(
      "la app crea la ficha del cliente automáticamente",
    );
    expect(manualText).toContain("Factu no flota sobre el contenido");
    expect(manualText).toContain("Sistema");
    expect(manualText).toContain("Acceso");
    expect(manualText).toContain("No afirmamos homologación");
    expect(manualText).not.toContain("Probar gratis");
    expect(manualText).not.toContain("QR fiscal obligatorio");
  });

  it("explica que el resultado tras reservar IRPF no descuenta el IVA", () => {
    const taxManual = JSON.stringify(getManualSection("impuestos"));

    expect(taxManual).toContain("resultado tras reservarla");
    expect(taxManual).toContain("La posición de IVA se muestra aparte");
    expect(taxManual).toContain("las bases ya están calculadas sin IVA");
  });
});
