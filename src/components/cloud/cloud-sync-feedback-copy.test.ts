import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const indicatorSource = readFileSync(
  new URL("./CloudSyncIndicator.tsx", import.meta.url),
  "utf8",
);

describe("cloud sync feedback copy", () => {
  it("presenta mala conexion como trabajo local guardado", () => {
    expect(indicatorSource).toContain("cloudSyncButtonTitle");
    expect(indicatorSource).toContain("cloudSyncButtonLabel");
    expect(indicatorSource).toContain("pendingChangesText");
    expect(indicatorSource).toContain("Guardado local");
    expect(indicatorSource).toContain("guardado en este dispositivo");
    expect(indicatorSource).toContain("Se subirá cuando vuelva internet");
    expect(indicatorSource).toContain("Pendiente de subir a la nube");
    expect(indicatorSource).not.toContain("sin subir a la nube (solo lo");
    expect(indicatorSource).not.toContain(" en cola — se subirán al");
  });
});
