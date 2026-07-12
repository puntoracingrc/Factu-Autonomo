import { describe, expect, it } from "vitest";
import {
  AEAT_CALENDAR_CATALOG_CONTENT_SHA256,
  AEAT_CALENDAR_SOURCES,
  calculateAeatCalendarCatalogHash,
  fiscalCalendarCategoryOptions,
  getAeatCalendarSource,
  parseFiscalCalendarCategories,
} from "./catalog";

describe("catálogo allowlistado de calendarios AEAT", () => {
  it("mantiene los cinco identificadores y feeds oficiales en una sola configuración", () => {
    expect(AEAT_CALENDAR_SOURCES).toEqual({
      renta: expect.objectContaining({
        calendarId: "invitado2aeat@gmail.com",
      }),
      renta_sociedades: expect.objectContaining({
        calendarId:
          "aio2b0s64q65r7v87j5ma8fvog@group.calendar.google.com",
      }),
      sociedades: expect.objectContaining({
        calendarId:
          "b7g1j3bod3gdjbka03uo6kr988@group.calendar.google.com",
      }),
      iva: expect.objectContaining({
        calendarId:
          "517mcuhcis0lldnp9b7c0nk2q8@group.calendar.google.com",
      }),
      declaraciones_informativas: expect.objectContaining({
        calendarId:
          "hqp9h5ft4snag42aea96791g28@group.calendar.google.com",
      }),
    });
    expect(
      new Set(
        Object.values(AEAT_CALENDAR_SOURCES).map(
          (source) => source.calendarId,
        ),
      ),
    ).toHaveLength(5);
    for (const source of Object.values(AEAT_CALENDAR_SOURCES)) {
      const url = new URL(source.icalUrl);
      expect(url.protocol).toBe("https:");
      expect(url.hostname).toBe("calendar.google.com");
      expect(url.pathname).toMatch(/^\/calendar\/ical\/.+\/public\/basic\.ics$/);
      expect(url.search).toBe("");
      expect(url.hash).toBe("");
    }
  });

  it("protege la revisión versionada con un hash reproducible", () => {
    expect(calculateAeatCalendarCatalogHash()).toBe(
      AEAT_CALENDAR_CATALOG_CONTENT_SHA256,
    );
  });

  it("expone opciones ordenadas sin duplicar etiquetas en la interfaz", () => {
    expect(fiscalCalendarCategoryOptions().map((option) => option.key)).toEqual([
      "renta",
      "renta_sociedades",
      "sociedades",
      "iva",
      "declaraciones_informativas",
    ]);
  });

  it("rechaza categorías y calendarId arbitrarios", () => {
    expect(() =>
      parseFiscalCalendarCategories(["iva", "calendar@attacker.example"]),
    ).toThrow("no está permitida");
    expect(() =>
      getAeatCalendarSource("calendar@attacker.example" as never),
    ).toThrow("no está permitida");
  });

  it("deduplica y ordena el filtro según el catálogo", () => {
    expect(
      parseFiscalCalendarCategories(["iva", "renta", "iva"]),
    ).toEqual(["renta", "iva"]);
    expect(parseFiscalCalendarCategories([])).toHaveLength(5);
  });
});
