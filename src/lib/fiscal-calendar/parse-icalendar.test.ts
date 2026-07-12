import { describe, expect, it } from "vitest";
import { parseAeatIcalendar } from "./parse-icalendar";

function calendar(...events: string[]): string {
  return ["BEGIN:VCALENDAR", "VERSION:2.0", ...events, "END:VCALENDAR"].join(
    "\r\n",
  );
}

function event(...properties: string[]): string {
  return ["BEGIN:VEVENT", ...properties, "END:VEVENT"].join("\r\n");
}

describe("parseAeatIcalendar", () => {
  it("preserva fechas all-day y el final exclusivo", () => {
    const result = parseAeatIcalendar(
      calendar(
        event(
          "UID:synthetic-iva-303@example.invalid",
          "DTSTART;VALUE=DATE:20260720",
          "DTEND;VALUE=DATE:20260721",
          "SUMMARY:IVA",
          "DESCRIPTION:<ul><li>Segundo trimestre: 303</li></ul>",
          "STATUS:CONFIRMED",
          "LAST-MODIFIED:20260712T080000Z",
        ),
      ),
    );

    expect(result).toEqual({
      truncated: false,
      events: [
        {
          id: "synthetic-iva-303@example.invalid",
          iCalUID: "synthetic-iva-303@example.invalid",
          status: "confirmed",
          summary: "IVA",
          description: "<ul><li>Segundo trimestre: 303</li></ul>",
          start: { date: "2026-07-20" },
          end: { date: "2026-07-21" },
          updated: "2026-07-12T08:00:00.000Z",
        },
      ],
    });
  });

  it("despliega líneas y decodifica escapes ICS sin interpretar HTML", () => {
    const result = parseAeatIcalendar(
      calendar(
        event(
          "UID:synthetic-folded@example.invalid",
          "DTSTART;VALUE=DATE:20260930",
          "DTEND;VALUE=DATE:20261001",
          "SUMMARY:DECLARACIONES\\, INFORMATIVAS",
          "DESCRIPTION:<ul><li>Texto\\, con coma\\; punto",
          " y seguido</li></ul>\\nSegunda línea",
        ),
      ),
    );

    expect(result?.events[0]).toMatchObject({
      summary: "DECLARACIONES, INFORMATIVAS",
      description: "<ul><li>Texto, con coma; puntoy seguido</li></ul>\nSegunda línea",
    });
  });

  it("aplica un día de duración cuando DTSTART de día completo no trae DTEND", () => {
    const result = parseAeatIcalendar(
      calendar(
        event(
          "UID:synthetic-leap@example.invalid",
          "DTSTART;VALUE=DATE:20280229",
          "SUMMARY:Renta",
        ),
      ),
    );

    expect(result?.events[0]).toMatchObject({
      start: { date: "2028-02-29" },
      end: { date: "2028-03-01" },
    });
  });

  it("acepta timestamps UTC completos", () => {
    const result = parseAeatIcalendar(
      calendar(
        event(
          "UID:synthetic-utc@example.invalid",
          "DTSTART:20260720T080000Z",
          "DTEND:20260720T090000Z",
          "SUMMARY:UTC",
        ),
      ),
    );

    expect(result?.truncated).toBe(false);
    expect(result?.events).toHaveLength(1);
    expect(result?.events[0]).toMatchObject({
      start: {
        dateTime: "2026-07-20T08:00:00.000Z",
        timeZone: "Europe/Madrid",
      },
      end: {
        dateTime: "2026-07-20T09:00:00.000Z",
        timeZone: "Europe/Madrid",
      },
    });
  });

  it.each([
    event(
          "UID:synthetic-floating@example.invalid",
          "DTSTART:20260720T080000",
          "DTEND:20260720T090000",
          "SUMMARY:Flotante",
    ),
    event(
          "UID:synthetic-tzid@example.invalid",
          "DTSTART;TZID=Europe/Madrid:20260720T080000",
          "DTEND;TZID=Europe/Madrid:20260720T090000",
          "SUMMARY:TZID",
    ),
  ])("falla cerrado ante fechas flotantes o TZID", (unsupportedEvent) => {
    expect(parseAeatIcalendar(calendar(unsupportedEvent))).toBeNull();
  });

  it("omite de forma visible recurrencias no expandidas", () => {
    const result = parseAeatIcalendar(
      calendar(
        event(
          "UID:synthetic-recurring@example.invalid",
          "DTSTART;VALUE=DATE:20260720",
          "DTEND;VALUE=DATE:20260721",
          "RRULE:FREQ=MONTHLY",
          "SUMMARY:Recurrente",
        ),
      ),
    );

    expect(result).toBeNull();
  });

  it.each([
    "",
    "BEGIN:VCALENDAR\r\nBEGIN:VEVENT\r\nUID:open",
    calendar(
      event(
        "UID:invalid-date@example.invalid",
        "DTSTART;VALUE=DATE:20260230",
        "SUMMARY:Inválido",
      ),
    ),
  ])("falla cerrado ante contenido inválido", (value) => {
    expect(parseAeatIcalendar(value)).toBeNull();
  });

  it.each(["UID", "DTSTART", "DTEND", "SUMMARY", "DESCRIPTION", "STATUS"])(
    "rechaza la propiedad cardinal duplicada %s",
    (name) => {
      const properties = [
        "UID:synthetic-duplicate@example.invalid",
        "DTSTART;VALUE=DATE:20260720",
        "DTEND;VALUE=DATE:20260721",
        "SUMMARY:IVA",
        "DESCRIPTION:Modelo 303",
        "STATUS:CONFIRMED",
      ];
      const original = properties.find((line) => line.startsWith(`${name}:`) || line.startsWith(`${name};`));
      expect(original).toBeTruthy();
      expect(
        parseAeatIcalendar(calendar(event(...properties, original!))),
      ).toBeNull();
    },
  );

  it("rechaza entradas que exceden el límite de memoria del parser", () => {
    expect(parseAeatIcalendar(`BEGIN:VCALENDAR\n${"x".repeat(4_194_305)}`)).toBeNull();
  });
});
