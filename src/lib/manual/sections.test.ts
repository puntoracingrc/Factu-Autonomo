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

  it("documenta la recuperación pre-sello sin afirmar un envío VeriFactu", () => {
    const accountManual = JSON.stringify(getManualSection("cuenta"));

    expect(accountManual).toContain("test_registered");
    expect(accountManual).toContain("legacy_unverified");
    expect(accountManual).toContain("no fue un envío a AEAT");
    expect(accountManual).toContain("elegir un único grupo");
    expect(accountManual).toContain("copia JSON ligada a esa vista");
    expect(accountManual).toContain("cualquier cambio del workspace invalida");
    expect(accountManual).toContain("registro confirmado por servidor");
    expect(accountManual).toContain("paymentStatus");
    expect(accountManual).toContain("un caso híbrido queda fuera");
  });

  it("documenta el archivo reversible y gobernado de documentos descartados", () => {
    const accountManual = JSON.stringify(getManualSection("cuenta"));

    expect(accountManual).toContain(
      "Mantenimiento · archivar documentos descartados",
    );
    expect(accountManual).toContain("cuenta autenticada");
    expect(accountManual).toContain("nube en **Sincronizado**");
    expect(accountManual).not.toContain("nivel MFA de la sesión resuelto");
    expect(accountManual).toContain("número completo y exacto");
    expect(accountManual).toContain("copia JSON previa");
    expect(accountManual).toContain("rollback");
    expect(accountManual).toContain("rectificativa superviviente");
    expect(accountManual).toContain("no libera la identidad");
    expect(accountManual).toContain("sincronización inmediata");
  });

  it("documenta la copia automática previa a una restauración durable", () => {
    const accountManual = JSON.stringify(getManualSection("cuenta"));

    expect(accountManual).toContain("Restaurar con copia automática");
    expect(accountManual).toContain("una única confirmación explícita");
    expect(accountManual).toContain("estado exacto que va a reemplazar");
    expect(accountManual).toContain("cambio real durante la operación");
    expect(accountManual).toContain("metadatos de sincronización");
  });

  it("documenta la guía sencilla de notificaciones y sus límites de plazo", () => {
    const fiscalManual = JSON.stringify(getManualSection("consultor-fiscal"));

    expect(fiscalManual).toContain("Guía de notificaciones y expedientes");
    expect(fiscalManual).toContain("Lo importante en 30 segundos");
    expect(fiscalManual).toContain("cuenta bloqueada");
    expect(fiscalManual).toContain("Una carta de pago no acredita el ingreso");
    expect(fiscalManual).toContain("no se consulta la web de la AEAT");
    expect(fiscalManual).toContain("fecha real de notificación o recepción");
    expect(fiscalManual).toContain("122 familias documentales");
    expect(fiscalManual).toContain("122 fichas");
    expect(fiscalManual).toContain("118 tienen lectura automática");
    expect(fiscalManual).toContain("15 cadenas procedimentales anteriores");
    expect(fiscalManual).toContain("se añaden 11 cadenas");
    expect(fiscalManual).toContain("48 tipos de relación");
    expect(fiscalManual).toContain("hasta 16 fichas del mismo PDF");
    expect(fiscalManual).toContain("no conserva esos valores");
  });
});
