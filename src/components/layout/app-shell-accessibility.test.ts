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

  it("uses a reflowing mobile disclosure instead of eleven scrolling links", () => {
    expect(appShellSource).toContain("MOBILE_PRIMARY_NAV_ITEMS");
    expect(appShellSource).toContain("MOBILE_MORE_NAV_ITEMS");
    expect(appShellSource).toContain("grid-cols-5");
    expect(appShellSource).toContain("grid-cols-1");
    expect(appShellSource).toContain("min-[260px]:grid-cols-2");
    expect(appShellSource).toContain('aria-expanded={mobileMoreOpen}');
    expect(appShellSource).toContain(
      'aria-controls="app-mobile-more-sections"',
    );
    expect(appShellSource).toContain('role="region"');
    expect(appShellSource).toContain("hidden={!mobileMoreOpen}");
    expect(appShellSource).not.toContain("overflow-x-auto");
    expect(appShellSource).not.toContain("canScrollLeft");
    expect(appShellSource).not.toContain("canScrollRight");
    expect(gettingStartedManualSource).toContain("Pulsa **Más**");
    expect(gettingStartedManualSource).not.toContain("deslizar la barra");
    expect(gettingStartedManualSource).not.toContain("flechas laterales");
    expect(gettingStartedManualSource).not.toContain(
      "/ayuda/capturas/navegacion-inferior.png",
    );
  });

  it("exposes current-page state through ARIA, text, and an icon", () => {
    expect(appShellSource).toContain(
      'aria-current={active ? "page" : undefined}',
    );
    expect(appShellSource).toContain(
      'activeMobileMoreItem && !mobileMoreOpen ? "page" : undefined',
    );
    expect(appShellSource).toContain("Más · Actual");
    expect(appShellSource).toContain("Sección actual:");
    expect(appShellSource).toContain("<Check");
    expect(appShellSource).toContain("Actual");
  });

  it("keeps mobile targets and keyboard focus visible", () => {
    expect(appShellSource).toContain("min-h-16 min-w-0");
    expect(appShellSource).toContain("min-h-14 w-full");
    expect(appShellSource).toContain("min-h-11 min-w-11");
    expect(appShellSource).toContain("focus-visible:outline");
    expect(appShellSource).toContain('event.key !== "Escape"');
    expect(appShellSource).toContain("mobileMoreButtonRef.current?.focus()");
    expect(appShellSource).toContain("focusWasInside");
    expect(appShellSource).toContain("activeElement === document.body");
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
