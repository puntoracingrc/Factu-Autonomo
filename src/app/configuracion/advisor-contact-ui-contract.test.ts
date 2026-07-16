import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const settingsSource = readFileSync(new URL("./page.tsx", import.meta.url), "utf8");
const storeSource = readFileSync(
  new URL("../../context/AppStore.tsx", import.meta.url),
  "utf8",
);

describe("settings advisor contact UI contract", () => {
  it("muestra Mi gestor inmediatamente después de Negocio", () => {
    const businessIndex = settingsSource.indexOf('id: "ajustes-negocio"');
    const advisorIndex = settingsSource.indexOf('id: "ajustes-gestor"');
    const documentsIndex = settingsSource.indexOf('id: "ajustes-facturacion"');

    expect(businessIndex).toBeGreaterThan(-1);
    expect(advisorIndex).toBeGreaterThan(businessIndex);
    expect(documentsIndex).toBeGreaterThan(advisorIndex);
    expect(settingsSource).toContain('title="Mi gestor"');
    expect(settingsSource).toContain("Contacto opcional de tu gestoría");
  });

  it("explica la preparación del correo sin prometer adjuntos automáticos", () => {
    expect(settingsSource).toContain(
      "Rellena estos datos para preparar desde Facturas un ZIP y un",
    );
    expect(settingsSource).toContain("adjuntas el ZIP descargado");
    expect(settingsSource).toContain("Factu abre Gmail");
    expect(settingsSource).toContain("Nombre de la gestoría");
    expect(settingsSource).toContain("Nombre del gestor");
    expect(settingsSource).toContain("Email del gestor");
    expect(settingsSource).toContain("Teléfono del gestor");
    expect(settingsSource).not.toContain("mailto:");
    expect(settingsSource).not.toContain("wa.me");
  });

  it("bloquea guardados parciales y normaliza el perfil en todas las escrituras", () => {
    expect(settingsSource).toContain(
      "validateAdvisorContact(form.advisorContact)",
    );
    expect(settingsSource).toContain('setSectionOpen("advisor", true)');
    expect(settingsSource).toContain("o deja\n              vacía toda la sección");
    expect(storeSource).toContain(
      "advisorContact: normalizeAdvisorContact(profile.advisorContact)",
    );
  });
});
