import { describe, expect, it } from "vitest";
import type { AeatPublicIcalendarSourceInspection } from "./aeat-public-icalendar-provider";
import { probeAeatFiscalCalendarAdminHealth } from "./admin-health";
import {
  FISCAL_CALENDAR_CATEGORIES,
  type FiscalCalendarCategory,
} from "./types";

const NOW = new Date("2026-07-13T10:00:00.000Z");

function healthyInspection(
  category: FiscalCalendarCategory,
  overrides: Partial<
    Extract<AeatPublicIcalendarSourceInspection, { ok: true }>
  > = {},
): Extract<AeatPublicIcalendarSourceInspection, { ok: true }> {
  return {
    category,
    ok: true,
    fetchedAt: NOW.toISOString(),
    eventCount: 20,
    upcomingEventCount: 5,
    truncated: false,
    earliestEventDate: "2025-01-20",
    latestEventDate: "2026-12-20",
    latestSourceUpdatedAt: "2026-07-12T08:00:00.000Z",
    ...overrides,
  };
}

function inspector(inspections: readonly AeatPublicIcalendarSourceInspection[]) {
  return {
    inspectSources: async () => inspections,
  };
}

describe("salud administrativa del calendario fiscal", () => {
  it("declara operativo solo cuando las cinco fuentes completas son válidas", async () => {
    const health = await probeAeatFiscalCalendarAdminHealth({
      inspector: inspector(
        FISCAL_CALENDAR_CATEGORIES.map((category, index) =>
          healthyInspection(category, { eventCount: index + 1 }),
        ),
      ),
      now: () => NOW,
    });

    expect(health).toMatchObject({
      generatedAt: NOW.toISOString(),
      level: "ok",
      label: "Operativo",
      expectedFeeds: 5,
      checkedFeeds: 5,
      healthyFeeds: 5,
      watchFeeds: 0,
      actionFeeds: 0,
      totalEvents: 15,
    });
    expect(health.feeds.map((feed) => feed.category)).toEqual(
      FISCAL_CALENDAR_CATEGORIES,
    );
  });

  it("marca en rojo una fuente rota y conserva el diagnóstico de las demás", async () => {
    const inspections: AeatPublicIcalendarSourceInspection[] =
      FISCAL_CALENDAR_CATEGORIES.map((category) =>
        category === "sociedades"
          ? {
              category,
              ok: false,
              code: "SOURCE_UNAVAILABLE",
              status: 404,
              attempts: 2,
              retryable: false,
            }
          : healthyInspection(category),
      );

    const health = await probeAeatFiscalCalendarAdminHealth({
      inspector: inspector(inspections),
      now: () => NOW,
    });

    expect(health.level).toBe("action");
    expect(health.actionFeeds).toBe(1);
    expect(health.healthyFeeds).toBe(4);
    expect(
      health.feeds.find((feed) => feed.category === "sociedades"),
    ).toMatchObject({
      level: "action",
      code: "SOURCE_UNAVAILABLE",
      httpStatus: 404,
      attempts: 2,
      eventCount: null,
    });
  });

  it("trata un feed completo vacío o truncado como acción necesaria", async () => {
    const health = await probeAeatFiscalCalendarAdminHealth({
      inspector: inspector(
        FISCAL_CALENDAR_CATEGORIES.map((category) =>
          category === "renta"
            ? healthyInspection(category, {
                eventCount: 0,
                upcomingEventCount: 0,
                earliestEventDate: null,
                latestEventDate: null,
              })
            : category === "iva"
              ? healthyInspection(category, { truncated: true })
              : healthyInspection(category),
        ),
      ),
      now: () => NOW,
    });

    expect(health.level).toBe("action");
    expect(health.actionFeeds).toBe(2);
    expect(health.feeds.find((feed) => feed.category === "renta")?.code).toBe(
      "EMPTY_FEED",
    );
    expect(health.feeds.find((feed) => feed.category === "iva")?.code).toBe(
      "TRUNCATED_FEED",
    );
  });

  it("usa ámbar si el feed es válido pero no contiene eventos futuros", async () => {
    const health = await probeAeatFiscalCalendarAdminHealth({
      inspector: inspector(
        FISCAL_CALENDAR_CATEGORIES.map((category) =>
          category === "renta"
            ? healthyInspection(category, { upcomingEventCount: 0 })
            : healthyInspection(category),
        ),
      ),
      now: () => NOW,
    });

    expect(health.level).toBe("watch");
    expect(health.watchFeeds).toBe(1);
    expect(health.feeds.find((feed) => feed.category === "renta")?.code).toBe(
      "NO_UPCOMING_EVENTS",
    );
  });

  it("falla cerrado si la inspección omite una categoría", async () => {
    const health = await probeAeatFiscalCalendarAdminHealth({
      inspector: inspector(
        FISCAL_CALENDAR_CATEGORIES.slice(0, 4).map((category) =>
          healthyInspection(category),
        ),
      ),
      now: () => NOW,
    });

    expect(health.level).toBe("action");
    expect(health.checkedFeeds).toBe(4);
    expect(health.feeds).toHaveLength(5);
    expect(health.feeds.at(-1)).toMatchObject({
      category: "declaraciones_informativas",
      code: "PROBE_INCOMPLETE",
      level: "action",
    });
    expect(JSON.stringify(health)).not.toMatch(/calendar\.google|basic\.ics|@/);
  });
});
