import { describe, expect, it } from "vitest";

import { simulateCentralSyncLoad } from "./load-model";

const COHORTS = [100, 500, 1_000, 5_000] as const;

describe("central sync synthetic load", () => {
  it.each(COHORTS)(
    "modela %i dispositivos abiertos con Realtime como camino normal",
    (devices) => {
      const healthy = simulateCentralSyncLoad({
        devices,
        realtimeHealthy: true,
      });
      const degraded = simulateCentralSyncLoad({
        devices,
        realtimeHealthy: false,
      });

      expect(healthy.accounts).toBe(Math.ceil(devices / 5));
      expect(healthy.totalPulls).toBeLessThan(degraded.totalPulls);
      expect(healthy.maxRequestsPerAccount).toBeLessThan(120);
      expect(degraded.maxRequestsPerAccount).toBeLessThan(120);
      expect(healthy.realtimeWakeDeliveries).toBeGreaterThan(0);
      expect(degraded.realtimeWakeDeliveries).toBe(0);
    },
  );

  it("expone las metricas de los cuatro escalones sin llamar a produccion", () => {
    const rows = COHORTS.flatMap((devices) =>
      [true, false].map((realtimeHealthy) => {
        const result = simulateCentralSyncLoad({ devices, realtimeHealthy });
        return {
          devices,
          mode: realtimeHealthy ? "realtime" : "fallback",
          averageRps: Number(result.averagePullsPerSecond.toFixed(2)),
          p95Rps: result.p95PullsPerSecond,
          peakRps: result.peakPullsPerSecond,
          maxAccountRequests10m: result.maxRequestsPerAccount,
        };
      }),
    );

    console.table(rows);
    expect(rows).toHaveLength(8);
  });
});
