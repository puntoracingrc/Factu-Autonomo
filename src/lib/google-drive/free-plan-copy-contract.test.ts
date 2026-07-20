import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const root = fileURLToPath(new URL("../../../", import.meta.url));

function source(relativePath: string): string {
  return readFileSync(resolve(root, relativePath), "utf8");
}

describe("copy de seguridad para el plan Gratuito", () => {
  it("explica que los datos solo viven en el dispositivo y ofrece copias externas", () => {
    const onboarding = source(
      "src/components/onboarding/FirstUseDriveBackupPanel.tsx",
    );
    const driveCard = source(
      "src/components/cloud/GoogleDriveBackupCard.tsx",
    );
    const normalizedOnboarding = onboarding.replace(/\s+/gu, " ");
    const normalizedDriveCard = driveCard.replace(/\s+/gu, " ");

    expect(normalizedOnboarding).toContain("limits.cloudSync");
    expect(normalizedOnboarding).toContain(
      "Con el plan Gratuito, Factu no guarda tus facturas ni datos de trabajo en su nube",
    );
    expect(normalizedOnboarding).toContain(
      "Descarga copias manuales y guárdalas fuera del dispositivo",
    );
    expect(normalizedOnboarding).toContain(
      "activa copias automáticas cifradas",
    );

    expect(normalizedDriveCard).toContain("limits.cloudSync");
    expect(normalizedDriveCard).toContain(
      "En el plan Gratuito, Factu no guarda tus facturas ni datos de trabajo en su nube",
    );
    expect(normalizedDriveCard).toContain(
      "Si lo pierdes o se avería sin tener una copia externa",
    );
    expect(normalizedDriveCard).toContain(
      "mantén activadas estas copias automáticas en Drive",
    );
  });

  it("mantiene el mensaje de nube para planes que sí incluyen sincronización", () => {
    const onboarding = source(
      "src/components/onboarding/FirstUseDriveBackupPanel.tsx",
    );
    const driveCard = source(
      "src/components/cloud/GoogleDriveBackupCard.tsx",
    );

    expect(onboarding).toContain(
      "Tu plan sincroniza los datos en la nube de Factu",
    );
    expect(driveCard).toContain(
      "además de la nube de",
    );
    expect(driveCard).toContain("cloudSyncEnabled");
  });
});
