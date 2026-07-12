import { describe, expect, it } from "vitest";
import {
  buildManualSections,
  getManualSection,
  getManualSlugs,
  manualSections,
} from "./sections";

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

  it("no publica la ayuda de Consultor fiscal cuando la Beta está apagada", () => {
    expect(
      buildManualSections(false).some(
        (section) => section.slug === "consultor-fiscal",
      ),
    ).toBe(false);
    expect(
      buildManualSections(true).some(
        (section) => section.slug === "consultor-fiscal",
      ),
    ).toBe(true);
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

    expect(taxManual).toContain("resultado económico tras reservarla");
    expect(taxManual).toContain("La posición de IVA se muestra aparte");
    expect(taxManual).toContain("sus bases ya están calculadas sin IVA");
    expect(taxManual).toContain("base estimada para IRPF");
  });

  it("explica cómo cuenta el Panel una rectificativa positiva", () => {
    const homeManual = JSON.stringify(getManualSection("inicio"));

    expect(homeManual).toContain("corrección rectificativa positiva");
    expect(homeManual).toContain("cuenta el reemplazo vigente una sola vez");
    expect(homeManual).toContain(
      "una rectificativa de anulación no se presenta como nueva facturación",
    );
  });

  it("separa el coste no deducible del tratamiento fiscal", () => {
    const manualText = JSON.stringify([
      getManualSection("gastos"),
      getManualSection("impuestos"),
      getManualSection("facturas"),
    ]);

    expect(manualText).toContain("Extra no desgravable");
    expect(manualText).toContain("base y el IVA deducibles");
    expect(manualText).toContain(
      "no reduce la base ni la reserva estimada de IRPF",
    );
    expect(manualText).toContain("sí reduce el beneficio económico");
    expect(manualText).toContain("sí reduce el margen real");
    expect(manualText).toContain("no reduce la base ni el IVA");
    expect(manualText).toContain(
      "base estimada para IRPF separada del beneficio económico",
    );
  });

  it("documenta el contrato firmado de abonos sin alimentar Productos", () => {
    const manualText = JSON.stringify([
      getManualSection("gastos"),
      getManualSection("impuestos"),
      getManualSection("productos"),
      getManualSection("proveedores"),
    ]);

    expect(manualText).toContain("Abono · saldo a favor");
    expect(manualText).toContain("Abono / saldo a favor");
    expect(manualText).toContain("base -200 €");
    expect(manualText).toContain("IVA -31 €");
    expect(manualText).toContain("no lo autoguarda");
    expect(manualText).toContain("solo revierte el coste de un trabajo");
    expect(manualText).toContain("uno no deducible solo revierte el coste");
    expect(manualText).toContain("nunca crea productos ni actualiza costes");
    expect(manualText).toContain("saldo neto de compras");
  });

  it("documenta el recargo separado y no recuperable", () => {
    const manualText = JSON.stringify([
      getManualSection("gastos"),
      getManualSection("impuestos"),
    ]);

    expect(manualText).toContain("recargo de equivalencia");
    expect(manualText).toContain("100 € + 21 € de IVA + 5,20 €");
    expect(manualText).toContain("coste de 126,20 €");
    expect(manualText).toContain("base e IVA deducibles en IVA son cero");
    expect(manualText).toContain("columnas separadas");
  });
});
