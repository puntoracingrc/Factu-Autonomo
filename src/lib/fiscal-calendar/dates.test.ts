import { describe, expect, it } from "vitest";
import {
  addCivilDays,
  createFiscalCalendarDateRange,
  eventOverlapsRange,
  formatFiscalCalendarEventDate,
  todayInMadrid,
} from "./dates";
import type { FiscalCalendarEvent } from "./types";

function event(
  overrides: Partial<FiscalCalendarEvent> = {},
): FiscalCalendarEvent {
  return {
    id: "aeat_fixture",
    source: "AEAT",
    sourceProvider: "google-calendar",
    sourceCalendarKey: "iva",
    sourceCalendarId: "calendar",
    externalEventId: "event",
    iCalUID: null,
    title: "Evento",
    description: "",
    category: "iva",
    deadlineKind: "unclassified",
    reviewStatus: "review-with-advisor",
    startDate: "2026-04-20",
    endDateExclusive: "2026-04-21",
    allDay: true,
    status: "confirmed",
    sourceUpdatedAt: null,
    fetchedAt: "2026-07-12T08:00:00.000Z",
    ...overrides,
  };
}

describe("fechas civiles del calendario fiscal", () => {
  it.each([
    ["2026-01-31", 1, "2026-02-01"],
    ["2026-12-31", 1, "2027-01-01"],
    ["2028-02-28", 1, "2028-02-29"],
    ["2028-02-29", 1, "2028-03-01"],
  ])("suma días sin depender de la zona horaria del proceso", (value, days, expected) => {
    expect(addCivilDays(value, days)).toBe(expected);
  });

  it("genera límites RFC3339 con el offset real de Madrid en invierno y verano", () => {
    expect(createFiscalCalendarDateRange("2026-01-15", "2026-01-15")).toEqual({
      startDate: "2026-01-15",
      endDateExclusive: "2026-01-16",
      timeMin: "2026-01-14T23:00:00.000Z",
      timeMax: "2026-01-15T23:00:00.000Z",
    });
    expect(createFiscalCalendarDateRange("2026-07-15", "2026-07-15")).toEqual({
      startDate: "2026-07-15",
      endDateExclusive: "2026-07-16",
      timeMin: "2026-07-14T22:00:00.000Z",
      timeMax: "2026-07-15T22:00:00.000Z",
    });
  });

  it("respeta el cambio de hora sin fijar +01:00 o +02:00", () => {
    const range = createFiscalCalendarDateRange("2026-03-29", "2026-03-30");
    expect(range.timeMin).toBe("2026-03-28T23:00:00.000Z");
    expect(range.timeMax).toBe("2026-03-30T22:00:00.000Z");
  });

  it("rechaza fechas imposibles, rangos invertidos y más de 366 días", () => {
    expect(() => createFiscalCalendarDateRange("2026-02-30", "2026-03-01")).toThrow(
      "no es válida",
    );
    expect(() => createFiscalCalendarDateRange("2026-03-02", "2026-03-01")).toThrow(
      "igual o posterior",
    );
    expect(() => createFiscalCalendarDateRange("2026-01-01", "2027-01-02")).toThrow(
      "366 días",
    );
  });

  it("mantiene el día completo en su fecha y muestra end.date como exclusiva", () => {
    const label = formatFiscalCalendarEventDate(
      event({ startDate: "2026-04-20", endDateExclusive: "2026-04-21" }),
    );
    expect(label).toContain("20 abr 2026");
    expect(label).not.toContain("19 abr");
    expect(label).not.toContain("21 abr");
  });

  it("muestra correctamente eventos de varios días y eventos con hora en Madrid", () => {
    expect(
      formatFiscalCalendarEventDate(
        event({ startDate: "2026-07-23", endDateExclusive: "2026-07-26" }),
      ),
    ).toContain("23 jul 2026 – 25 jul 2026");
    expect(
      formatFiscalCalendarEventDate(
        event({
          allDay: false,
          startDate: "2026-07-12T14:30:00.000Z",
          endDateExclusive: "2026-07-12T15:45:00.000Z",
        }),
      ),
    ).toMatch(/16:30.*17:45/);
  });

  it("filtra por solapamiento y no solo por la fecha de inicio", () => {
    const range = createFiscalCalendarDateRange("2026-04-20", "2026-04-20");
    expect(
      eventOverlapsRange(
        event({ startDate: "2026-04-19", endDateExclusive: "2026-04-21" }),
        range,
      ),
    ).toBe(true);
    expect(
      eventOverlapsRange(
        event({ startDate: "2026-04-21", endDateExclusive: "2026-04-22" }),
        range,
      ),
    ).toBe(false);
  });

  it("obtiene el día civil de Madrid a ambos lados de medianoche UTC", () => {
    expect(todayInMadrid(new Date("2026-07-11T22:30:00.000Z"))).toBe(
      "2026-07-12",
    );
  });
});
