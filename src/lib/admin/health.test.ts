import { describe, expect, it } from "vitest";
import {
  buildAdminAbuseSummary,
  buildAdminHealthSnapshot,
  isMissingAdminHealthRpc,
} from "./health";

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
    expect(snapshot.abuse.level).toBe("ok");
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

  it("detecta senales de abuso por rutas protegidas", () => {
    const snapshot = buildAdminHealthSnapshot({
      database: { bytes: 100, limitBytes: 1000 },
      users: { active30d: 20 },
      sync: { cloudUsers: 1, latestSyncAt: "2026-07-09T06:03:00.000Z" },
      errors: { last24h: 0 },
      abuse: {
        totalRequests: 320,
        totalBuckets: 18,
        latestAt: "2026-07-09T09:30:00.000Z",
        namespaces: [
          {
            namespace: "security_csp_report",
            buckets: 18,
            requests: 320,
            maxRequests: 140,
            latestAt: "2026-07-09T09:30:00.000Z",
          },
        ],
      },
    });

    expect(snapshot.level).toBe("action");
    expect(snapshot.abuse.label).toBe("Ataque probable");
    expect(snapshot.checks.find((check) => check.id === "abuse")?.level).toBe(
      "action",
    );
    expect(snapshot.recommendations).toContain(
      "Posible scraping/abuso: revisar logs y valorar WAF/bot protection.",
    );
  });

  it("no trata un lote razonable de escaneos admin como ataque probable", () => {
    const snapshot = buildAdminHealthSnapshot({
      database: { bytes: 100, limitBytes: 1000 },
      users: { active30d: 20 },
      sync: { cloudUsers: 1, latestSyncAt: "2026-07-09T06:03:00.000Z" },
      errors: { last24h: 0 },
      abuse: {
        totalRequests: 187,
        totalBuckets: 1,
        latestAt: "2026-07-10T13:17:01.028Z",
        namespaces: [
          {
            namespace: "admin_expenses_scan",
            buckets: 1,
            requests: 187,
            maxRequests: 187,
            latestAt: "2026-07-10T13:17:01.028Z",
          },
        ],
      },
    });

    expect(snapshot.abuse.level).toBe("ok");
    expect(snapshot.abuse.namespaces[0].label).toBe(
      "Admin: escaneo masivo gastos",
    );
    expect(snapshot.recommendations).not.toContain(
      "Posible scraping/abuso: revisar logs y valorar WAF/bot protection.",
    );
  });

  it("distingue una extracción probable de un ataque genérico", () => {
    const snapshot = buildAdminHealthSnapshot({
      database: { bytes: 100, limitBytes: 1000 },
      users: { active30d: 20 },
      sync: { cloudUsers: 1, latestSyncAt: "2026-07-09T06:03:00.000Z" },
      errors: { last24h: 0 },
      abuse: {
        namespaces: [
          {
            namespace: "data_backup_local_large",
            buckets: 5,
            requests: 5,
            maxRequests: 4,
            latestAt: "2026-07-10T13:00:00.000Z",
          },
        ],
      },
    });

    expect(snapshot.abuse.level).toBe("action");
    expect(snapshot.abuse.label).toBe("Extracción probable");
    expect(snapshot.abuse.headline).toContain("copias o descargas");
    expect(snapshot.recommendations).toContain(
      "Posible extracción de datos: revisar copias, sesiones y descargas del usuario afectado.",
    );
  });

  it("nombra los nuevos contadores protegidos de forma legible", () => {
    const abuse = buildAdminAbuseSummary({
      namespaces: [
        {
          namespace: "email_payment_reminder_daily",
          buckets: 1,
          requests: 1,
          maxRequests: 1,
          latestAt: "2026-07-10T13:00:00.000Z",
        },
      ],
    });

    expect(abuse.namespaces[0].label).toBe("Email: recordatorios diarios");
  });

  it("no presenta una sesión normal de sincronización como extracción", () => {
    const abuse = buildAdminAbuseSummary({
      totalRequests: 42,
      totalBuckets: 2,
      namespaces: [
        {
          namespace: "data_access_event",
          buckets: 1,
          requests: 21,
          maxRequests: 21,
          latestAt: "2026-07-18T09:56:14.234Z",
        },
        {
          namespace: "data_cloud_pull",
          buckets: 1,
          requests: 21,
          maxRequests: 21,
          latestAt: "2026-07-18T09:56:14.378Z",
        },
      ],
    });

    expect(abuse.level).toBe("ok");
    expect(abuse.label).toBe("Sin señales");
    expect(abuse.totalRequests).toBe(21);
    expect(abuse.totalBuckets).toBe(1);
    expect(abuse.namespaces.map((item) => item.namespace)).toEqual([
      "data_cloud_pull",
    ]);
  });

  it("no eleva a vigilancia una descarga moderada de nube desde un único origen", () => {
    const abuse = buildAdminAbuseSummary({
      totalRequests: 173,
      totalBuckets: 19,
      latestAt: "2026-07-18T11:30:03.799Z",
      namespaces: [
        {
          namespace: "data_cloud_pull",
          buckets: 1,
          requests: 64,
          maxRequests: 64,
          latestAt: "2026-07-18T10:32:35.640Z",
        },
        {
          namespace: "data_cloud_pull_auto",
          buckets: 1,
          requests: 81,
          maxRequests: 81,
          latestAt: "2026-07-18T11:30:02.924Z",
        },
        {
          namespace: "expense_scan_quota",
          buckets: 2,
          requests: 8,
          maxRequests: 4,
          latestAt: "2026-07-18T11:13:27.802Z",
        },
      ],
    });

    expect(abuse.level).toBe("ok");
    expect(abuse.label).toBe("Sin señales");
    expect(
      abuse.namespaces.find((item) => item.namespace === "data_cloud_pull")
        ?.level,
    ).toBe("ok");
    expect(abuse.headline).toBe("Sin señales claras de scraping o abuso.");
  });

  it("calibra el sondeo automático de 45 segundos sin ocultar picos anómalos", () => {
    const normal = buildAdminAbuseSummary({
      namespaces: [
        {
          namespace: "data_cloud_pull_auto",
          buckets: 8,
          requests: 640,
          maxRequests: 80,
          latestAt: "2026-07-18T16:00:00.000Z",
        },
      ],
    });
    const anomalous = buildAdminAbuseSummary({
      namespaces: [
        {
          namespace: "data_cloud_pull_auto",
          buckets: 8,
          requests: 640,
          maxRequests: 120,
          latestAt: "2026-07-18T16:00:00.000Z",
        },
      ],
    });

    expect(normal.level).toBe("ok");
    expect(normal.namespaces[0].label).toBe(
      "Datos: sincronización automática",
    );
    expect(anomalous.level).toBe("watch");
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
