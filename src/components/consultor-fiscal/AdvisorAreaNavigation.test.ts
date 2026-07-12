import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const source = readFileSync(
  new URL("./AdvisorAreaNavigation.tsx", import.meta.url),
  "utf8",
);

describe("AdvisorAreaNavigation", () => {
  it("expone solo las superficies públicas por defecto", () => {
    expect(source).toContain('href: "/consultor-fiscal/modelos"');
    expect(source).toContain('href: "/consultor-fiscal/calendario"');
    expect(source).toContain("expenseAnalysisEnabled = false");
    expect(source).toContain("notificationsEnabled = false");
  });

  it("mantiene foco visible, targets táctiles y estado de página", () => {
    expect(source).toContain('aria-label="Herramientas de Asesoría fiscal"');
    expect(source).toContain('aria-current={active ? "page" : undefined}');
    expect(source).toContain("min-h-11");
    expect(source).toContain("focus-visible:outline");
    expect(source).toContain("dark:bg-slate-900");
  });
});
