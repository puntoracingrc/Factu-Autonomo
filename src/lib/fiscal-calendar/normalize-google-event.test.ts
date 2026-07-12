import { describe, expect, it } from "vitest";
import {
  normalizeGoogleCalendarEvent,
  sanitizeFiscalCalendarText,
} from "./normalize-google-event";

const FETCHED_AT = "2026-07-12T08:00:00.000Z";

describe("normalización de eventos Google Calendar", () => {
  it("conserva start.date y end.date exclusiva sin pasar por UTC", () => {
    expect(
      normalizeGoogleCalendarEvent(
        {
          id: "google-event-1",
          iCalUID: "event-1@example.invalid",
          summary: "Vencimiento",
          start: { date: "2026-04-20" },
          end: { date: "2026-04-22" },
          updated: "2026-04-01T12:00:00+02:00",
        },
        "iva",
        FETCHED_AT,
      ),
    ).toMatchObject({
      source: "AEAT",
      sourceProvider: "google-calendar",
      sourceCalendarKey: "iva",
      externalEventId: "google-event-1",
      iCalUID: "event-1@example.invalid",
      startDate: "2026-04-20",
      endDateExclusive: "2026-04-22",
      allDay: true,
      status: "unknown",
      deadlineKind: "unclassified",
      reviewStatus: "review-with-advisor",
      sourceUpdatedAt: "2026-04-01T10:00:00.000Z",
      fetchedAt: FETCHED_AT,
    });
  });

  it("no infiere plazo general, domiciliación o excepción desde el texto", () => {
    for (const summary of [
      "Plazo general de presentación",
      "Fin de domiciliación bancaria",
      "Excepción especial",
    ]) {
      expect(
        normalizeGoogleCalendarEvent(
          {
            id: `event-${summary}`,
            summary,
            description: `Descripción externa: ${summary}`,
            start: { date: "2026-12-31" },
            end: { date: "2027-01-02" },
          },
          "iva",
          FETCHED_AT,
        ),
      ).toMatchObject({
        startDate: "2026-12-31",
        endDateExclusive: "2027-01-02",
        deadlineKind: "unclassified",
        reviewStatus: "review-with-advisor",
      });
    }
  });

  it("no eleva a confirmado un estado de fuente ausente o desconocido", () => {
    for (const status of [undefined, "unexpected"] as const) {
      expect(
        normalizeGoogleCalendarEvent(
          {
            id: `event-${status ?? "missing"}`,
            status,
            start: { date: "2026-07-20" },
            end: { date: "2026-07-21" },
          },
          "iva",
          FETCHED_AT,
        )?.status,
      ).toBe("unknown");
    }
  });

  it("normaliza dateTime y permite una descripción ausente", () => {
    expect(
      normalizeGoogleCalendarEvent(
        {
          id: "google-event-timed",
          summary: "Revisión con hora",
          start: { dateTime: "2026-07-12T16:30:00+02:00" },
          end: { dateTime: "2026-07-12T17:45:00+02:00" },
        },
        "renta",
        FETCHED_AT,
      ),
    ).toMatchObject({
      description: "",
      startDate: "2026-07-12T14:30:00.000Z",
      endDateExclusive: "2026-07-12T15:45:00.000Z",
      allDay: false,
    });
  });

  it("elimina HTML activo, etiquetas y controles antes de exponer texto", () => {
    const normalized = normalizeGoogleCalendarEvent(
      {
        id: "google-event-untrusted",
        summary: "<b>IVA</b> &amp; Renta",
        description:
          "Antes<img src=x onerror=alert(1)><script>alert('x')</script>Después\u0000",
        start: { date: "2026-04-20" },
        end: { date: "2026-04-21" },
      },
      "iva",
      FETCHED_AT,
    );

    expect(normalized).toMatchObject({
      title: "IVA & Renta",
      description: "Antes Después",
    });
    expect(normalized?.description).not.toMatch(/script|onerror|alert/i);
  });

  it("preserva como líneas la estructura br, p, div y listas anidadas", () => {
    expect(
      sanitizeFiscalCalendarText(
        [
          "<p>Junio 2026.</p>",
          "<div>Modelo 303<br />Segundo trimestre</div>",
          "<ul><li>Modelo 349<ol><li>Operaciones UE</li></ol></li>",
          "<li>Modelo 380</li></ul>",
        ].join(""),
        { maxLength: 500, multiline: true },
      ),
    ).toBe(
      [
        "Junio 2026.",
        "Modelo 303",
        "Segundo trimestre",
        "Modelo 349",
        "Operaciones UE",
        "Modelo 380",
      ].join("\n"),
    );
  });

  it("mantiene texto simple como un único párrafo", () => {
    expect(
      sanitizeFiscalCalendarText(
        "  Texto simple   sin etiquetas.\r\nContinúa en la misma prosa.  ",
        {
          maxLength: 200,
          multiline: true,
        },
      ),
    ).toBe("Texto simple sin etiquetas. Continúa en la misma prosa.");
  });

  it("decodifica entidades antes de conservar límites estructurales", () => {
    expect(
      sanitizeFiscalCalendarText(
        "IVA&nbsp;&amp;&nbsp;Renta&lt;br&gt;Modelo&nbsp;303",
        { maxLength: 200, multiline: true },
      ),
    ).toBe("IVA & Renta\nModelo 303");
  });

  it("ordena HTML malformado sin conservar etiquetas", () => {
    expect(
      sanitizeFiscalCalendarText("<p>Uno<div>Dos<li>Tres", {
        maxLength: 200,
        multiline: true,
      }),
    ).toBe("Uno\nDos\nTres");
  });

  it("elimina script, style y noscript, incluso sin cierre", () => {
    expect(
      sanitizeFiscalCalendarText(
        "Antes<script>alert(1)</script><style>.x{}</style><noscript>oculto</noscript>Después",
        { maxLength: 200, multiline: true },
      ),
    ).toBe("Antes Después");
    expect(
      sanitizeFiscalCalendarText("Visible<script>oculto<div>también", {
        maxLength: 200,
        multiline: true,
      }),
    ).toBe("Visible");
    for (const activeTag of ["script", "style", "noscript"]) {
      expect(
        sanitizeFiscalCalendarText(
          `Visible<${activeTag}\ntype=x contenido oculto`,
          { maxLength: 200, multiline: true },
        ),
      ).toBe("Visible");
    }
  });

  it("elimina fail-closed etiquetas genéricas incompletas entre líneas", () => {
    expect(
      sanitizeFiscalCalendarText(
        "Visible<span\nclass=externa atributo-no-fiable",
        { maxLength: 200, multiline: true },
      ),
    ).toBe("Visible");
  });

  it("normaliza CRLF, espacios y líneas vacías sin unir palabras", () => {
    expect(
      sanitizeFiscalCalendarText(" Uno \r\n \r\n\r\n Dos\t tres ", {
        maxLength: 200,
        multiline: true,
      }),
    ).toBe("Uno Dos tres");
  });

  it("limita las filas estructuradas antes de exponer la descripción", () => {
    const source = Array.from(
      { length: 140 },
      (_, index) => `<p>Línea ${index + 1}</p>`,
    ).join("");
    const result = sanitizeFiscalCalendarText(source, {
      maxLength: 5_000,
      multiline: true,
    });

    expect(result.split("\n")).toHaveLength(100);
    expect(result).toContain("Línea 1");
    expect(result).toContain("Línea 100");
    expect(result).not.toContain("Línea 101");
  });

  it("recorta por caracteres Unicode sin partirlos", () => {
    const result = sanitizeFiscalCalendarText("😀😀😀áéí", {
      maxLength: 4,
      multiline: true,
    });
    expect(result).toBe("😀😀😀á");
    expect(result).not.toContain("�");
    expect(Array.from(result)).toHaveLength(4);
  });

  it("no parte un carácter Unicode en el límite bruto de entrada", () => {
    const openingTag = "<script>";
    const closingTag = "</script>";
    const hiddenContent = "x".repeat(
      19_999 - openingTag.length - closingTag.length,
    );
    const removablePrefix = `${openingTag}${hiddenContent}${closingTag}`;
    expect(removablePrefix).toHaveLength(19_999);

    const result = sanitizeFiscalCalendarText(`${removablePrefix}😀`, {
      maxLength: 10,
      multiline: true,
    });

    expect(result).toBe("😀");
    expect(Array.from(result)).toHaveLength(1);
  });

  it("trata también etiquetas codificadas como texto externo no confiable", () => {
    expect(
      sanitizeFiscalCalendarText(
        "Aviso &lt;script&gt;alert(1)&lt;/script&gt; final",
        { maxLength: 200 },
      ),
    ).toBe("Aviso final");
  });

  it("conserva cancelado en el modelo para que el proveedor pueda excluirlo", () => {
    expect(
      normalizeGoogleCalendarEvent(
        {
          id: "google-event-cancelled",
          status: "cancelled",
          start: { date: "2026-04-20" },
          end: { date: "2026-04-21" },
        },
        "iva",
        FETCHED_AT,
      )?.status,
    ).toBe("cancelled");
  });

  it("genera un id determinista sin depender del título ni de iCalUID", () => {
    const base = {
      id: "stable-google-id",
      iCalUID: "shared@example.invalid",
      summary: "Título original",
      start: { date: "2026-04-20" },
      end: { date: "2026-04-21" },
    };
    const first = normalizeGoogleCalendarEvent(base, "iva", FETCHED_AT);
    const renamed = normalizeGoogleCalendarEvent(
      { ...base, summary: "Título cambiado" },
      "iva",
      FETCHED_AT,
    );
    const otherCalendar = normalizeGoogleCalendarEvent(
      base,
      "renta",
      FETCHED_AT,
    );

    expect(first?.id).toBe(renamed?.id);
    expect(first?.id).not.toBe(otherCalendar?.id);
    expect(first?.id).toMatch(/^aeat_[a-f0-9]{32}$/);
  });

  it.each([
    { id: "missing-dates" },
    {
      id: "invalid-date",
      start: { date: "2026-02-30" },
      end: { date: "2026-03-01" },
    },
    {
      id: "zero-duration",
      start: { date: "2026-03-01" },
      end: { date: "2026-03-01" },
    },
    {
      id: "mixed-date-types",
      start: { date: "2026-03-01" },
      end: { dateTime: "2026-03-02T10:00:00+01:00" },
    },
  ])("descarta eventos sin un intervalo válido", (payload) => {
    expect(normalizeGoogleCalendarEvent(payload, "iva", FETCHED_AT)).toBeNull();
  });
});
