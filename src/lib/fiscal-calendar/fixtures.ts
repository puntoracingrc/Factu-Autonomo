import type { GoogleCalendarEventPayload } from "./normalize-google-event";
import type { FiscalCalendarCategory } from "./types";

export const FISCAL_CALENDAR_FIXTURE_VERSION =
  "synthetic-aeat-calendar-2026.v1" as const;

export interface FiscalCalendarFixture {
  category: FiscalCalendarCategory;
  event: GoogleCalendarEventPayload;
  synthetic: true;
}

/**
 * Casos inventados y deterministas. No reproducen obligaciones ni fechas AEAT.
 * Los títulos lo indican también para impedir que una captura se confunda con
 * información oficial.
 */
export const FISCAL_CALENDAR_FIXTURES: readonly FiscalCalendarFixture[] = [
  {
    category: "iva",
    synthetic: true,
    event: {
      id: "synthetic-iva-all-day",
      iCalUID: "synthetic-iva-all-day@example.invalid",
      status: "confirmed",
      summary: "[SIMULADO] Ejemplo de vencimiento de IVA",
      description:
        "<p>Modelo 303. Dato inventado para revisar la interfaz local. <strong>No es un plazo oficial.</strong></p>",
      start: { date: "2026-07-20" },
      end: { date: "2026-07-21" },
      updated: "2026-07-01T09:00:00+02:00",
    },
  },
  {
    category: "renta",
    synthetic: true,
    event: {
      id: "synthetic-renta-multiday",
      status: "tentative",
      summary: "[SIMULADO] Ejemplo de plazo de varios días",
      description:
        "Ejemplo sintético de tres días para comprobar el final exclusivo.",
      start: { date: "2026-07-27" },
      end: { date: "2026-07-30" },
      updated: "2026-07-02T12:00:00+02:00",
    },
  },
  {
    category: "sociedades",
    synthetic: true,
    event: {
      id: "synthetic-sociedades-timed",
      status: "confirmed",
      summary: "[SIMULADO] Revisión fiscal con hora",
      description: "Evento inventado para verificar la conversión a Madrid.",
      start: { dateTime: "2026-08-05T16:30:00+02:00" },
      end: { dateTime: "2026-08-05T18:00:00+02:00" },
      updated: "2026-07-03T08:30:00+02:00",
    },
  },
  {
    category: "declaraciones_informativas",
    synthetic: true,
    event: {
      id: "synthetic-informativas-no-description",
      status: "confirmed",
      summary: "[SIMULADO] Ejemplo sin descripción",
      start: { date: "2026-09-01" },
      end: { date: "2026-09-02" },
      updated: "2026-07-04T10:00:00+02:00",
    },
  },
  {
    category: "renta_sociedades",
    synthetic: true,
    event: {
      id: "synthetic-renta-sociedades",
      status: "confirmed",
      summary: "[SIMULADO] Ejemplo de Renta y Sociedades",
      description: "Información inventada; revisar siempre la fuente oficial.",
      start: { date: "2026-10-20" },
      end: { date: "2026-10-21" },
      updated: "2026-07-05T11:00:00+02:00",
    },
  },
  {
    category: "iva",
    synthetic: true,
    event: {
      id: "synthetic-cancelled",
      status: "cancelled",
      summary: "[SIMULADO] Evento cancelado",
      start: { date: "2026-07-18" },
      end: { date: "2026-07-19" },
      updated: "2026-07-06T14:00:00+02:00",
    },
  },
  {
    category: "iva",
    synthetic: true,
    event: {
      id: "synthetic-untrusted-html",
      status: "confirmed",
      summary: "<b>[SIMULADO]</b> Contenido externo",
      description:
        "Texto visible <img src=x onerror=alert(1)><script>window.evil=true</script> final.",
      start: { date: "2026-11-02" },
      end: { date: "2026-11-03" },
      updated: "2026-07-07T15:00:00+02:00",
    },
  },
];
