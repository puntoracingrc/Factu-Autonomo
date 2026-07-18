import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const appShellSource = readFileSync(
  new URL("./AppShell.tsx", import.meta.url),
  "utf8",
);
const layoutSource = readFileSync(
  new URL("../../app/layout.tsx", import.meta.url),
  "utf8",
);
const documentFormSource = readFileSync(
  new URL("../forms/DocumentForm.tsx", import.meta.url),
  "utf8",
);
const quickToolsLauncherSource = readFileSync(
  new URL("../documents/QuickToolsLauncher.tsx", import.meta.url),
  "utf8",
);
const helpButtonSource = readFileSync(
  new URL("../manual/FactuHelpButton.tsx", import.meta.url),
  "utf8",
);
const cloudIndicatorSource = readFileSync(
  new URL("../cloud/CloudSyncIndicator.tsx", import.meta.url),
  "utf8",
);
const gettingStartedManualSource = readFileSync(
  new URL("../../lib/manual/sections/primeros-pasos.ts", import.meta.url),
  "utf8",
);

describe("AppShell accessibility contracts", () => {
  it("leaves browser zoom available", () => {
    expect(layoutSource).toContain("userScalable: true");
    expect(layoutSource).not.toContain("maximumScale");
    expect(layoutSource).not.toContain("minimumScale");
  });

  it("keeps every mobile destination in one horizontally scrollable bar", () => {
    expect(appShellSource).toContain("appNavItems.map");
    expect(appShellSource).toContain("overflow-x-auto");
    expect(appShellSource).toContain("overscroll-x-contain");
    expect(appShellSource).toContain("w-[4.75rem] shrink-0");
    expect(appShellSource).toContain("mobileNavRef");
    expect(appShellSource).toContain("nav.scrollTo");
    expect(appShellSource).not.toContain("mobileMoreOpen");
    expect(gettingStartedManualSource).toContain("desplaza la barra");
    expect(gettingStartedManualSource).not.toContain(
      "/ayuda/capturas/navegacion-inferior.png",
    );
  });

  it("exposes current-page state without resizing or overlapping links", () => {
    expect(appShellSource).toContain(
      'aria-current={active ? "page" : undefined}',
    );
    expect(appShellSource).toContain("<Check");
    expect(appShellSource).toContain("w-full truncate text-center");
    expect(appShellSource).toContain(
      "isAppNavItemActive(pathname, href, activeBase)",
    );
  });

  it("keeps mobile targets and keyboard focus visible", () => {
    expect(appShellSource).toContain("h-16 w-[4.75rem]");
    expect(appShellSource).toContain("min-h-11 min-w-11");
    expect(appShellSource).toContain("focus-visible:outline");
    expect(helpButtonSource).toContain("h-11 w-11");
    expect(helpButtonSource).toContain("focus-visible:outline");
    expect(cloudIndicatorSource).toContain("min-h-11 min-w-11");
    expect(cloudIndicatorSource).toContain("focus-visible:outline");
  });

  it("keeps the quick calculator and post-it available globally", () => {
    expect(layoutSource).toContain("<QuickToolsProvider>");
    expect(appShellSource).toContain("<QuickToolsLauncher />");
    expect(appShellSource).toContain("<QuickToolsLauncher compact />");
    expect(quickToolsLauncherSource).toContain(
      'aria-label="Herramientas rápidas"',
    );
    expect(quickToolsLauncherSource).toContain(
      'aria-label="Abrir calculadora rápida"',
    );
    expect(quickToolsLauncherSource).toContain(
      'aria-label="Abrir post-it de notas rápidas"',
    );
    expect(documentFormSource).not.toContain("<QuickCalculator");
    expect(documentFormSource).not.toContain("<QuickPostIt");
  });
});
