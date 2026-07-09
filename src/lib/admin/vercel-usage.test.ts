import { describe, expect, it } from "vitest";
import {
  buildVercelUsageSnapshot,
  currentVercelBillingPeriod,
  parseVercelBillingChargesJsonl,
} from "./vercel-usage";

describe("admin vercel usage helpers", () => {
  it("parsea JSONL FOCUS y construye semaforo de consumo", () => {
    const jsonl = [
      {
        ServiceName: "Fluid Active CPU",
        ResourceName: "vercel-functions-fluid-cpu-duration",
        BilledCost: 15.32,
        ConsumedQuantity: 119.4,
        ConsumedUnit: "h",
        Tags: { ProjectName: "regionatlas" },
      },
      {
        ServiceName: "Fast Data Transfer",
        ResourceName: "networking-fast-data-transfer",
        BilledCost: 6.18,
        ConsumedQuantity: 18.3,
        ConsumedUnit: "GB",
        Tags: { ProjectName: "factu-autonomo" },
      },
    ]
      .map((row) => JSON.stringify(row))
      .join("\n");

    const charges = parseVercelBillingChargesJsonl(jsonl);
    const snapshot = buildVercelUsageSnapshot({
      charges,
      from: "2026-06-15T09:00:00.000Z",
      to: "2026-07-15T09:00:00.000Z",
      now: new Date("2026-07-10T09:00:00.000Z"),
      primaryProjectSlug: "factu-autonomo",
    });

    expect(charges).toHaveLength(2);
    expect(snapshot.level).toBe("action");
    expect(snapshot.summary.totalCostUsd).toBe(21.5);
    expect(snapshot.summary.onDemandUsd).toBe(1.5);
    expect(snapshot.topProjects[0]).toMatchObject({
      project: "regionatlas",
    });
  });

  it("usa ciclo mensual personalizado cuando esta configurado", () => {
    const period = currentVercelBillingPeriod(
      new Date("2026-07-10T12:00:00.000Z"),
      {
        VERCEL_BILLING_CYCLE_START_DAY: "15",
        VERCEL_BILLING_CYCLE_START_HOUR: "9",
      },
    );

    expect(period.from).toBe("2026-06-15T09:00:00.000Z");
    expect(period.to).toBe("2026-07-15T09:00:00.000Z");
  });
});
