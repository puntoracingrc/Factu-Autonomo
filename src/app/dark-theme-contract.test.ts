import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const globalCss = readFileSync(new URL("./globals.css", import.meta.url), "utf8");
const layoutSource = readFileSync(new URL("./layout.tsx", import.meta.url), "utf8");
const appShellSource = readFileSync(
  new URL("../components/layout/AppShell.tsx", import.meta.url),
  "utf8",
);

function hexToLuminance(hex: string) {
  const channels = hex
    .slice(1)
    .match(/.{2}/g)!
    .map((channel) => Number.parseInt(channel, 16) / 255)
    .map((channel) =>
      channel <= 0.04045
        ? channel / 12.92
        : ((channel + 0.055) / 1.055) ** 2.4,
    );
  return channels[0] * 0.2126 + channels[1] * 0.7152 + channels[2] * 0.0722;
}

function contrast(first: string, second: string) {
  const [lighter, darker] = [
    hexToLuminance(first),
    hexToLuminance(second),
  ].sort((left, right) => right - left);
  return (lighter + 0.05) / (darker + 0.05);
}

function darkVariable(name: string) {
  const match = globalCss.match(
    new RegExp(`--app-dark-${name}:\\s*(#[0-9a-f]{6})`, "i"),
  );
  expect(match, `missing --app-dark-${name}`).not.toBeNull();
  return match![1];
}

describe("dark theme contracts", () => {
  it("keeps readable text hierarchy on the main surface", () => {
    const surface = darkVariable("surface");

    for (const token of ["text-strong", "text", "text-muted", "text-subtle"]) {
      expect(contrast(darkVariable(token), surface), token).toBeGreaterThanOrEqual(
        4.5,
      );
    }
    expect(
      contrast(darkVariable("border-strong"), darkVariable("control")),
    ).toBeGreaterThanOrEqual(3);
  });

  it("uses distinct neutral layers instead of one blue canvas", () => {
    const layers = [
      darkVariable("canvas"),
      darkVariable("shell"),
      darkVariable("surface"),
      darkVariable("surface-subtle"),
      darkVariable("surface-raised"),
      darkVariable("control"),
    ];

    expect(new Set(layers).size).toBe(layers.length);
    expect(globalCss).toContain(
      '.app-side-nav a[data-navigation-selected="true"]',
    );
    expect(globalCss).toContain("box-shadow: inset 3px 0 0 #4d8ee8");
  });

  it("preserves visible content through interactive states", () => {
    const darkCss = globalCss.slice(
      globalCss.indexOf('html[data-app-theme="dark"]'),
      globalCss.indexOf('html[data-app-density="compact"]'),
    );

    expect(darkCss).not.toMatch(/display:\s*none/i);
    expect(darkCss).not.toMatch(/visibility:\s*hidden/i);
    expect(darkCss).not.toMatch(/opacity:\s*0(?:\D|$)/i);
    expect(darkCss).not.toMatch(/color:\s*transparent/i);
    expect(darkCss).toContain(".hover\\:bg-slate-50:hover");
    expect(darkCss).toContain(".hover\\:bg-blue-50:hover");
    expect(darkCss).toContain(".focus\\:ring-blue-100:focus");
    expect(darkCss).toContain("input:disabled");
    expect(globalCss).toContain(
      'html[data-reduce-motion="true"] .scan-progress-thinking',
    );
    expect(globalCss).toContain("color: #1d4ed8");
    expect(globalCss).toContain(
      'html[data-app-theme="dark"][data-reduce-motion="true"]',
    );
  });

  it("bootstraps before hydration without replacing app persistence", () => {
    expect(layoutSource).toContain("<head>");
    expect(layoutSource).toContain('id="app-theme-bootstrap"');
    expect(layoutSource.indexOf('id="app-theme-bootstrap"')).toBeLessThan(
      layoutSource.indexOf("<body"),
    );
    expect(layoutSource).toContain("APP_THEME_BOOTSTRAP_SCRIPT");
    expect(layoutSource).toContain("suppressHydrationWarning");
    expect(appShellSource).toContain("if (!ready) return");
    expect(appShellSource).toContain("cacheAppThemePreference");
    expect(appShellSource).toContain("applyResolvedAppTheme");
    expect(appShellSource).toContain("normalizeAppPreferences");
  });
});
