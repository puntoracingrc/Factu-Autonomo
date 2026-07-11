import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

function source(relativePath: string): string {
  return readFileSync(new URL(relativePath, import.meta.url), "utf8");
}

describe("VeriFactu post-save form containment", () => {
  it("devuelve resultado explícito en factura y rectificativa sin pedir repetir el guardado", () => {
    const documentForm = source("../../components/forms/DocumentForm.tsx");
    const rectificationForm = source(
      "../../components/forms/RectificativaForm.tsx",
    );

    for (const form of [documentForm, rectificationForm]) {
      expect(form).toContain("finalizeSavedVerifactuDocument");
      expect(form).toContain('outcome === "saved_without_registration"');
      expect(form).toContain('outcome === "saved_with_safety_block"');
      expect(form).toContain("download && !verifactuSafetyBlocked");
      expect(form).toContain("notice: verifactuNotice");
      expect(form).not.toContain("finalizeVerifactuDocument({");
    }

    expect(rectificationForm).not.toContain(
      "No se pudo completar el registro tributario",
    );
    expect(rectificationForm).not.toContain(
      "El documento está guardado; prueba desde el listado",
    );
  });
});
