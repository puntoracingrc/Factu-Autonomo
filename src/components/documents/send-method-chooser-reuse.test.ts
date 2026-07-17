import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const listSource = readFileSync(
  new URL("./DocumentList.tsx", import.meta.url),
  "utf8",
);
const documentShareSource = readFileSync(
  new URL("./DocumentShareActions.tsx", import.meta.url),
  "utf8",
);
const modalSource = readFileSync(
  new URL("./SendMethodChooserModal.tsx", import.meta.url),
  "utf8",
);

describe("shared send method chooser", () => {
  it("reutiliza el mismo selector en documentos y envíos al gestor o cliente", () => {
    expect(listSource).toContain("SendMethodChooserModal");
    expect(listSource).toContain("Enviar facturas al cliente");
    expect(documentShareSource).toContain("SendMethodChooserModal");
    expect(modalSource).toContain("Usar siempre este método");
    expect(modalSource).toContain("Podrás cambiarlo en Ajustes, Preferencias.");
  });
});
