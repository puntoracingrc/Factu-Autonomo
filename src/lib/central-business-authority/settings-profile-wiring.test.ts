import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

function source(relativePath: string): string {
  return fs.readFileSync(path.join(process.cwd(), relativePath), "utf8");
}

describe("central settings profile wiring", () => {
  it("rebases the settings draft without silently overwriting conflicts", () => {
    const settings = source("src/app/configuracion/page.tsx");

    expect(settings).toContain("profileBaselineRef");
    expect(settings).toContain("rebaseBusinessProfileDraft");
    expect(settings).toContain("findBusinessProfileDraftConflictPaths");
    expect(settings).toContain("updateProfile((latestProfile) =>");
    expect(settings).toContain("No se ha sobrescrito nada");
    expect(settings).not.toContain("updateProfile({");
  });

  it("saves template changes centrally with explicit feedback", () => {
    const templates = source("src/app/configuracion/plantillas/page.tsx");

    expect(templates).toContain("useCentralProfileMutation");
    expect(templates).toContain("updateProfile((profile) =>");
    expect(templates).toContain("unconfirmedDraftRef");
    expect(templates).toContain("No se pudo confirmar el guardado");
    expect(templates).toContain("Reintentar");
    expect(templates).not.toContain(
      "const { data, updateProfile } = useAppStore()",
    );
  });

  it("requires functional profile updates at the central boundary", () => {
    const canary = source(
      "src/lib/central-business-authority/profile-mutation-canary.ts",
    );

    expect(canary).toContain(
      "export type CentralProfileUpdate = (",
    );
    expect(canary).toContain("profile: update(current)");
    expect(canary).not.toContain("BusinessProfile |");
  });
});
