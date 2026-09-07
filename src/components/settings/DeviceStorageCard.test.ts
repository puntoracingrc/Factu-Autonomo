import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const accountSource = readFileSync(
  new URL("../../app/cuenta/page.tsx", import.meta.url),
  "utf8",
);
const cardSource = readFileSync(
  new URL("./DeviceStorageCard.tsx", import.meta.url),
  "utf8",
);

describe("device storage card", () => {
  it("mide solo la clave del espacio activo y se monta junto a las copias", () => {
    expect(cardSource).toContain("useWorkspaceStorage");
    expect(cardSource).toContain("readDeviceStorageDiagnostics(storageKey)");
    expect(cardSource).toContain(
      "measurement?.storageKey === storageKey",
    );
    expect(accountSource).toContain("<DeviceStorageCard />");
  });

  it("distingue la empresa activa del total del navegador", () => {
    expect(cardSource).toContain("Copia de esta empresa");
    expect(cardSource).toContain("Factu en este navegador");
    expect(cardSource).toContain("No analiza el contenido ni");
    expect(cardSource).toContain("no el límite individual de esa copia");
  });
});
