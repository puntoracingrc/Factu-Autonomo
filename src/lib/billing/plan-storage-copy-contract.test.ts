import { readFileSync, readdirSync, statSync } from "node:fs";
import { relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const root = fileURLToPath(new URL("../../../", import.meta.url));

function source(relativePath: string): string {
  return readFileSync(resolve(root, relativePath), "utf8");
}

function sourceFiles(relativeDirectory: string): string[] {
  const directory = resolve(root, relativeDirectory);
  const files: string[] = [];

  for (const entry of readdirSync(directory)) {
    const absolute = resolve(directory, entry);
    if (statSync(absolute).isDirectory()) {
      files.push(...sourceFiles(`${relativeDirectory}/${entry}`));
      continue;
    }
    if (!/\.(?:ts|tsx)$/u.test(entry) || entry.includes(".test.")) continue;
    files.push(absolute);
  }

  return files;
}

describe("copy público de almacenamiento por plan", () => {
  it("no vuelve a prometer nube o multidispositivo solo por crear una cuenta", () => {
    const files = [
      ...sourceFiles("src/app"),
      ...sourceFiles("src/components"),
      ...sourceFiles("src/lib/manual/sections"),
      resolve(root, "src/lib/first-use-onboarding.ts"),
      resolve(root, "src/lib/recommendations.ts"),
    ];
    const obsoletePromises = [
      "La cuenta ya puede usar nube",
      "desbloquear nube y acciones reales",
      "conecta Drive si quieres sincronizar",
      "Crea una cuenta para hacer copia de seguridad y acceder desde otros dispositivos",
      "si creas cuenta, una copia se sincroniza",
      "Inicia sesión para activar la nube entre móvil y PC",
      "La nube de Factu mantiene tus datos entre móvil y ordenador cuando tu cuenta está activa",
      "sincroniza todos tus dispositivos",
      "Hasta que inicies sesión, todo queda en este navegador",
      "correo de Supabase",
      "Busca el mensaje de <strong>Supabase</strong>",
      "La nube no está configurada en este servidor",
    ];

    for (const file of files) {
      const copy = readFileSync(file, "utf8");
      for (const promise of obsoletePromises) {
        if (copy.includes(promise)) {
          throw new Error(
            `${relative(root, file)}: texto obsoleto: ${promise}`,
          );
        }
      }
    }
  });

  it("explica de forma coherente Gratis local, Pro 2 y Pro+ 5", () => {
    const landing = source("src/components/marketing/PublicLanding.tsx");
    const ownership = source("src/components/settings/DataOwnershipCard.tsx");
    const privacy = source("src/app/legal/privacidad/page.tsx");
    const terms = source("src/app/legal/terminos/page.tsx");
    const dataProcessing = source(
      "src/app/legal/encargo-tratamiento/page.tsx",
    );
    const cookies = source("src/app/legal/cookies/page.tsx");
    const combined = [landing, ownership, privacy, terms, dataProcessing, cookies]
      .join(" ")
      .replace(/\s+/gu, " ");

    expect(combined).toContain(
      "Gratis guarda los datos de trabajo solo en el navegador de un dispositivo",
    );
    expect(combined).toContain("Pro añade nube y hasta 2 dispositivos");
    expect(combined).toContain("Pro+ permite hasta 5");
    expect(combined).toContain(
      "Crear o confirmar una cuenta Gratis no sube las facturas ni los datos de trabajo",
    );
    expect(combined).toContain(
      "La copia manual y la copia automática opcional en Google Drive son mecanismos distintos",
    );
  });

  it("mantiene el mismo contrato en precios, alta y manual", () => {
    const pricing = source("src/app/precios/page.tsx");
    const upgrade = source("src/components/billing/UpgradeModal.tsx");
    const account = source("src/components/cloud/CloudAccountCard.tsx");
    const signup = source("src/components/cloud/SignupSuccessPanel.tsx");
    const accountManual = source("src/lib/manual/sections/cuenta.ts");
    const firstStepsManual = source(
      "src/lib/manual/sections/primeros-pasos.ts",
    );
    const combined = [
      pricing,
      upgrade,
      account,
      signup,
      accountManual,
      firstStepsManual,
    ]
      .join(" ")
      .replace(/\s+/gu, " ");

    expect(pricing).toContain("Un dispositivo local, sin nube de Factu");
    expect(pricing).toContain(
      "Nube de Factu para hasta 2 dispositivos sincronizados",
    );
    expect(pricing).toContain(
      "Nube de Factu para hasta 5 dispositivos sincronizados",
    );
    expect(upgrade).toContain("hasta 2 dispositivos");
    expect(account.replace(/\s+/gu, " ")).toContain(
      "En Gratis, los datos siguen solo en este dispositivo; Pro sincroniza hasta 2 dispositivos y Pro+ hasta 5",
    );
    expect(account).toContain("Confirma tu cuenta de Factu");
    expect(account).not.toContain("mensaje de <strong>Supabase</strong>");
    expect(signup.replace(/\s+/gu, " ")).toContain(
      "Pro sincroniza hasta 2 dispositivos y Pro+ hasta 5",
    );
    expect(combined).toContain(
      "Crear o confirmar la cuenta no los sube a la nube de Factu",
    );
    expect(combined).not.toContain("correo de Supabase");
  });
});
