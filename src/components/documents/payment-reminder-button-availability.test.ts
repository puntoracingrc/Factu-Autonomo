import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const source = readFileSync(
  new URL("./PaymentReminderButton.tsx", import.meta.url),
  "utf8",
);

describe("disponibilidad del recordatorio de pago", () => {
  it("permite mostrar una campana explicativa cuando falta el contacto", () => {
    expect(source).toContain("showUnavailable = false");
    expect(source).toContain("if (!reminderAvailable && !showUnavailable)");
    expect(source).toContain(
      "Añade un email o teléfono al cliente para enviar recordatorios",
    );
    expect(source).toContain("disabled={!triggerEnabled}");
    expect(source).toContain("bg-amber-50 text-amber-300");
    expect(source).toContain("showTooltip={!hideTooltip}");
  });

  it("no representa ninguna campana para documentos importados", () => {
    expect(source).toContain("if (hasLegacyImportOrigin(doc))");
    expect(source).toContain("return null;");
    expect(source.indexOf("if (hasLegacyImportOrigin(doc))")).toBeLessThan(
      source.indexOf("if (!reminderAvailable && !showUnavailable)"),
    );
  });
});
