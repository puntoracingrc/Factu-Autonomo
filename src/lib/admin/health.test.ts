import { describe, expect, it } from "vitest";
import { buildAdminHealthSnapshot, isMissingAdminHealthRpc } from "./health";

describe("admin health helpers", () => {
  it("marca el sistema como holgado con uso bajo", () => {
    const snapshot = buildAdminHealthSnapshot({
      generatedAt: "2026-07-09T08:00:00.000Z",
      database: { bytes: 280_000_000, limitBytes: 8_589_934_592 },
      users: { total: 6, active7d: 3, active30d: 4, new7d: 1 },
      sync: {
        rows: 5_342,
        deletedRows: 109,
        cloudUsers: 2,
        updated24h: 38,
        updated7d: 420,
        activeUsers24h: 1,
        activeUsers7d: 2,
        latestSyncAt: "2026-07-09T06:03:00.000Z",
      },
      usage: {
        monthKey: "2026-07",
        documentsCreated: 10,
        expenseScans: 2,
        customerAiAutofills: 0,
      },
      errors: { last24h: 0, last7d: 1, latestAt: null },
      entityTypes: [{ type: "documents", rows: 2000, deletedRows: 12 }],
      topUsers: [{ email: "cliente@example.com", rowCount: 2903 }],
      hourly: [{ hour: "2026-07-09T06:00:00.000Z", syncUpdates: 12, errors: 0 }],
    });

    expect(snapshot.level).toBe("ok");
    expect(snapshot.summary.syncRows).toBe(5342);
    expect(snapshot.summary.databaseUsedPercent).toBeCloseTo(3.3, 1);
    expect(snapshot.recommendations[0]).toContain("Vais cómodos");
  });

  it("sube el semaforo si hay muchos errores recientes", () => {
    const snapshot = buildAdminHealthSnapshot({
      database: { bytes: 100, limitBytes: 1000 },
      users: { active30d: 20 },
      sync: { cloudUsers: 1, latestSyncAt: "2026-07-09T06:03:00.000Z" },
      errors: { last24h: 25 },
    });

    expect(snapshot.level).toBe("action");
    expect(snapshot.checks.find((check) => check.id === "errors")?.level).toBe(
      "action",
    );
  });

  it("detecta RPC no desplegada", () => {
    expect(
      isMissingAdminHealthRpc({
        code: "PGRST202",
        message: "Could not find the function admin_health_snapshot",
      }),
    ).toBe(true);
  });
});
