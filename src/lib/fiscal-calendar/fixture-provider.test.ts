import { describe, expect, it } from "vitest";
import { createFiscalCalendarDateRange } from "./dates";
import { FixtureFiscalCalendarProvider } from "./fixture-provider";

const NOW = new Date("2026-07-12T08:00:00.000Z");

describe("FixtureFiscalCalendarProvider", () => {
  it("devuelve datos sintéticos deterministas sin red ni credenciales", async () => {
    const provider = new FixtureFiscalCalendarProvider(() => NOW);
    const range = createFiscalCalendarDateRange("2026-07-01", "2026-12-31");
    const first = await provider.listEvents(range, [
      "renta",
      "renta_sociedades",
      "sociedades",
      "iva",
      "declaraciones_informativas",
    ]);
    const second = await provider.listEvents(range, [
      "renta",
      "renta_sociedades",
      "sociedades",
      "iva",
      "declaraciones_informativas",
    ]);

    expect(first).toEqual(second);
    expect(first).toMatchObject({
      fetchedAt: NOW.toISOString(),
      providerMode: "fixture",
      truncated: false,
    });
    expect(first.events.length).toBeGreaterThanOrEqual(6);
    expect(first.events.every((event) => event.title.includes("SIMULADO"))).toBe(
      true,
    );
  });

  it("filtra por categoría y excluye eventos cancelados", async () => {
    const result = await new FixtureFiscalCalendarProvider(() => NOW).listEvents(
      createFiscalCalendarDateRange("2026-07-01", "2026-12-31"),
      ["iva"],
    );

    expect(result.events.length).toBeGreaterThan(0);
    expect(result.events.every((event) => event.category === "iva")).toBe(true);
    expect(result.events.every((event) => event.status !== "cancelled")).toBe(
      true,
    );
  });

  it("devuelve un estado vacío fuera del rango del fixture", async () => {
    const result = await new FixtureFiscalCalendarProvider(() => NOW).listEvents(
      createFiscalCalendarDateRange("2028-01-01", "2028-01-31"),
      ["iva"],
    );
    expect(result.events).toEqual([]);
  });

  it("mantiene la fecha all-day y end.date exclusiva", async () => {
    const result = await new FixtureFiscalCalendarProvider(() => NOW).listEvents(
      createFiscalCalendarDateRange("2026-07-20", "2026-07-20"),
      ["iva"],
    );
    expect(result.events[0]).toMatchObject({
      startDate: "2026-07-20",
      endDateExclusive: "2026-07-21",
      allDay: true,
    });
  });
});
