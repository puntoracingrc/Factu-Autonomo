import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

interface FiscalWatchSourceCatalog {
  schemaVersion: string;
  reviewedAt: string;
  timeZone: string;
  sources: Array<{
    id: string;
    format: string;
    url?: string;
    urlTemplate?: string;
    officialPageUrl: string;
  }>;
}

const catalog = JSON.parse(
  readFileSync(
    new URL("../../../config/fiscal-watch/sources.v1.json", import.meta.url),
    "utf8",
  ),
) as FiscalWatchSourceCatalog;
const calendarCatalogSource = readFileSync(
  new URL("../fiscal-calendar/catalog.ts", import.meta.url),
  "utf8",
);
const operationsGuide = readFileSync(
  new URL("../../../docs/operacion/vigilante-fiscal.md", import.meta.url),
  "utf8",
);

describe("contrato versionado de fuentes del vigilante fiscal", () => {
  it("mantiene exactamente los cinco calendarios públicos ya aprobados", () => {
    const watchUrls = catalog.sources
      .filter((source) => source.format === "ICS")
      .map((source) => source.url)
      .filter((url): url is string => typeof url === "string");

    expect(watchUrls).toHaveLength(5);
    expect(new Set(watchUrls).size).toBe(5);
    for (const url of watchUrls) {
      expect(calendarCatalogSource).toContain(JSON.stringify(url));
    }
  });

  it("declara revisión y zona de fecha sin variables o hosts arbitrarios", () => {
    expect(catalog.schemaVersion).toBe("fiscal-watch-sources.v1");
    expect(catalog.reviewedAt).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(catalog.timeZone).toBe("Europe/Madrid");

    for (const source of catalog.sources) {
      const templates = [source.url, source.urlTemplate, source.officialPageUrl]
        .filter((value): value is string => typeof value === "string")
        .map((value) => value.replace("{date}", "20260713").replace("{year}", "2026"));
      for (const value of templates) {
        const url = new URL(value);
        expect(url.protocol).toBe("https:");
        expect([
          "www.boe.es",
          "sede.agenciatributaria.gob.es",
          "calendar.google.com",
        ]).toContain(url.hostname);
      }
    }
  });

  it("documenta INFORMA como revisión manual sin invertir una API interna", () => {
    expect(operationsGuide).toContain(
      "https://www2.agenciatributaria.gob.es/ES13/S/IAFRIAFRIINF",
    );
    expect(operationsGuide).toMatch(/No se\s+invierten/);
  });
});
