import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  APP_NAVIGATION_PREFETCH_DELAY_MS,
  APP_NAVIGATION_PREFETCH_HREFS,
  APP_NAVIGATION_WARMUP_INITIAL_DELAY_MS,
  APP_NAVIGATION_WARMUP_STEP_DELAY_MS,
  canPrefetchForNavigationConnection,
  getAppNavigationWarmupHrefs,
  shouldPrefetchAppNavigationHref,
} from "./app-navigation-prefetch";

const appShellSource = readFileSync(
  new URL("./AppShell.tsx", import.meta.url),
  "utf8",
);

describe("prefetch prudente de navegación principal", () => {
  it("solo permite rutas principales y descarta la ruta actual", () => {
    expect(APP_NAVIGATION_PREFETCH_HREFS).toContain("/facturas");
    expect(APP_NAVIGATION_PREFETCH_HREFS).toContain("/gastos");
    expect(APP_NAVIGATION_PREFETCH_HREFS).toContain("/clientes");
    expect(APP_NAVIGATION_PREFETCH_HREFS).not.toContain("/impuestos");
    expect(APP_NAVIGATION_PREFETCH_HREFS).not.toContain(
      "/consultor-fiscal/diagnostico",
    );
    expect(shouldPrefetchAppNavigationHref("/gastos", "/facturas")).toBe(true);
    expect(shouldPrefetchAppNavigationHref("/gastos", "/gastos")).toBe(false);
    expect(shouldPrefetchAppNavigationHref("/gastos/nuevo", "/gastos")).toBe(
      false,
    );
  });

  it("respeta ahorro de datos y conexiones muy lentas", () => {
    expect(canPrefetchForNavigationConnection({ saveData: true })).toBe(false);
    expect(
      canPrefetchForNavigationConnection({ effectiveType: "slow-2g" }),
    ).toBe(false);
    expect(canPrefetchForNavigationConnection({ effectiveType: "2g" })).toBe(
      false,
    );
    expect(canPrefetchForNavigationConnection({ effectiveType: "4g" })).toBe(
      true,
    );
  });

  it("se activa de inmediato por intención", () => {
    expect(APP_NAVIGATION_PREFETCH_DELAY_MS).toBeGreaterThanOrEqual(50);
    expect(appShellSource).toContain("router.prefetch(href)");
    expect(appShellSource).toContain("prefetch={false}");
    expect(appShellSource).toContain(
      "onPointerEnter={() => scheduleNavigationPrefetch(href)}",
    );
    expect(appShellSource).toContain(
      "onPointerLeave={() => cancelNavigationPrefetch(href)}",
    );
    expect(appShellSource).toContain(
      "onFocus={() => scheduleNavigationPrefetch(href)}",
    );
    expect(appShellSource).toContain(
      "onTouchStart={() => scheduleNavigationPrefetch(href)}",
    );
  });

  it("calienta las rutas operativas de una en una cuando el equipo queda libre", () => {
    expect(
      getAppNavigationWarmupHrefs("/facturas", { effectiveType: "4g" }),
    ).toEqual([
      "/",
      "/clientes",
      "/gastos",
      "/presupuestos",
      "/recibos",
      "/proveedores",
      "/productos",
    ]);
    expect(
      getAppNavigationWarmupHrefs("/facturas", { saveData: true }),
    ).toEqual([]);
    expect(APP_NAVIGATION_WARMUP_INITIAL_DELAY_MS).toBeGreaterThanOrEqual(
      1_000,
    );
    expect(APP_NAVIGATION_WARMUP_STEP_DELAY_MS).toBeGreaterThanOrEqual(250);
    expect(appShellSource).toContain("scheduleNavigationWarmup");
    expect(appShellSource).toContain("getAppNavigationWarmupHrefs");
    expect(appShellSource).toContain(
      "prefetchedNavigationHrefsRef.current.add(href)",
    );
  });
});
