import { describe, expect, it } from "vitest";
import {
  buildDashboardVisualCacheSnapshot,
  DASHBOARD_VISUAL_CACHE_KEY,
  hasDashboardVisualCacheChanges,
  readDashboardVisualCache,
  writeDashboardVisualCache,
} from "./dashboard-visual-cache";
import { createDemoWorkspaceData } from "./demo-workspace";
import { buildProductBusinessSummary } from "./product-business-summary";
import {
  buildProductPeriodSummary,
  getDefaultProductPeriod,
} from "./product-period-summary";

function memoryStorage(initial?: string): Storage {
  const values = new Map<string, string>(
    initial ? [[DASHBOARD_VISUAL_CACHE_KEY, initial]] : [],
  );

  return {
    get length() {
      return values.size;
    },
    clear: () => values.clear(),
    getItem: (key) => values.get(key) ?? null,
    key: (index) => [...values.keys()][index] ?? null,
    removeItem: (key) => values.delete(key),
    setItem: (key, value) => values.set(key, value),
  };
}

function snapshot(date = new Date("2026-07-25T10:00:00.000Z")) {
  const data = createDemoWorkspaceData(date);
  const period = { ...getDefaultProductPeriod(date), kind: "quarter" as const };
  const periodSummary = buildProductPeriodSummary(data, period);
  const recentSummary = buildProductBusinessSummary(data);

  return buildDashboardVisualCacheSnapshot(
    data,
    period,
    periodSummary,
    recentSummary,
    date,
  );
}

describe("dashboard visual cache", () => {
  it("guarda solo una foto visual pequeña del panel principal", () => {
    const cached = snapshot();

    expect(cached.periodLabel).toBe("3.º trimestre 2026");
    expect(cached.recentDocuments.length).toBeLessThanOrEqual(3);
    expect(cached.recentExpenses.length).toBeLessThanOrEqual(3);
    expect(cached.pendingInvoices.length).toBeLessThanOrEqual(3);
    expect(JSON.stringify(cached)).not.toContain("demo@factura-autonomo.test");
    expect(JSON.stringify(cached)).not.toContain("ES00 0000");
    expect(JSON.stringify(cached)).not.toContain("B00000001");
    expect(JSON.stringify(cached)).not.toContain("Sin cliente");
  });

  it("lee cache valida, descarta cache caducada o malformada y no lanza", () => {
    const cached = snapshot();
    const storage = memoryStorage();

    expect(writeDashboardVisualCache(cached, storage)).toBe(true);
    expect(
      readDashboardVisualCache(
        storage,
        new Date("2026-07-26T10:00:00.000Z").getTime(),
      ),
    ).toEqual(cached);
    expect(
      readDashboardVisualCache(
        storage,
        new Date("2026-08-20T10:00:00.000Z").getTime(),
      ),
    ).toBeNull();
    expect(readDashboardVisualCache(memoryStorage("{"), Date.now())).toBeNull();
  });

  it("detecta cambios visuales sin depender de la fecha de guardado", () => {
    const first = snapshot(new Date("2026-07-25T10:00:00.000Z"));
    const sameDataLater = snapshot(new Date("2026-07-25T11:00:00.000Z"));
    const changed = {
      ...sameDataLater,
      metrics: { ...sameDataLater.metrics, pending: "999,00 EUR" },
      signature: "changed",
    };

    expect(hasDashboardVisualCacheChanges(first, sameDataLater)).toBe(false);
    expect(hasDashboardVisualCacheChanges(first, changed)).toBe(true);
  });
});
