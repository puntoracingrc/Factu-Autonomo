import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  NAVIGATION_SLOW_DELAY_MS,
  NAVIGATION_STALLED_DELAY_MS,
  navigationFeedbackMessage,
} from "./app-navigation-feedback";

const appShellSource = readFileSync(
  new URL("./AppShell.tsx", import.meta.url),
  "utf8",
);
const feedbackSource = readFileSync(
  new URL("./AppNavigationFeedback.tsx", import.meta.url),
  "utf8",
);

describe("app navigation feedback", () => {
  it("acknowledges the destination without claiming it already opened", () => {
    expect(navigationFeedbackMessage("Facturas", "pending")).toBe(
      "Abriendo Facturas…",
    );
  });

  it("explains prolonged transitions and keeps retry as a separate phase", () => {
    expect(navigationFeedbackMessage("Gastos", "slow")).toBe(
      "La carga está tardando más de lo habitual. Seguimos abriendo Gastos…",
    );
    expect(navigationFeedbackMessage("Gastos", "stalled")).toBe(
      "No hemos podido abrir Gastos todavía.",
    );
    expect(NAVIGATION_SLOW_DELAY_MS).toBeLessThan(
      NAVIGATION_STALLED_DELAY_MS,
    );
  });

  it("wires immediate pending state into desktop and mobile navigation", () => {
    expect(appShellSource.match(/onNavigate=/g)).toHaveLength(2);
    expect(appShellSource.match(/aria-busy=\{pending \|\| undefined\}/g)).toHaveLength(
      2,
    );
    expect(appShellSource).toContain(
      'data-navigation-selected={selected ? "true" : undefined}',
    );
    expect(appShellSource).toContain(
      '<AppNavigationFeedback\n        navigation={pendingNavigation}',
    );
  });

  it("keeps progress, delayed status and retry accessible", () => {
    expect(feedbackSource).toContain('role="progressbar"');
    expect(feedbackSource).toContain('aria-live="polite"');
    expect(feedbackSource).toContain("NAVIGATION_SLOW_DELAY_MS");
    expect(feedbackSource).toContain("NAVIGATION_STALLED_DELAY_MS");
    expect(feedbackSource).toContain("onClick={onRetry}");
  });
});
