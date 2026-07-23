import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

function source(path: string): string {
  return readFileSync(new URL(path, import.meta.url), "utf8");
}

const appShellSource = source("./AppShell.tsx");
const conditionalShellSource = source("./ConditionalAppShell.tsx");

describe("app startup progressive loading", () => {
  it("keeps the app shell and navigation available while startup data resolves", () => {
    expect(appShellSource).toContain("const workspaceLoading = !ready || !authReady");
    expect(appShellSource).toContain("Preparando tus datos. Puedes seguir navegando.");
    expect(appShellSource).toContain("<AppStartupMainContent pathname={pathname} />");
    expect(appShellSource).toContain("children");
    expect(appShellSource).not.toContain("!ready ? (");
    expect(appShellSource).not.toContain("Cargando tus datos");
  });

  it("keeps startup placeholders route-aware without rendering empty-state data as final", () => {
    expect(appShellSource).toContain("Resumen del negocio");
    expect(appShellSource).toContain("Últimos documentos");
    expect(appShellSource).toContain("Pendiente de cobro");
    expect(appShellSource).toContain("Datos principales");
    expect(appShellSource).toContain("isAppNavItemActive(pathname, href, activeBase)");
  });

  it("does not classify the root route as public until auth and local data are known", () => {
    expect(conditionalShellSource).toContain("ready &&");
    expect(conditionalShellSource).toContain("authReady &&");
    expect(conditionalShellSource).toContain("!user &&");
    expect(conditionalShellSource).toContain("!hasWorkspaceContent(data)");
  });

  it("renders dashboard placeholders from the shell instead of blocking the app content area", () => {
    expect(appShellSource).toContain("Panel principal");
    expect(appShellSource).toContain("<HomeStartupSummaryPlaceholder />");
    expect(appShellSource).toContain("Resumen del negocio");
    expect(appShellSource).toContain("Últimos documentos");
  });
});
