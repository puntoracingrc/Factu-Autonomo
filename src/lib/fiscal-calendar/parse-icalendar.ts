import { isDateOnly } from "./dates";
import type { GoogleCalendarEventPayload } from "./normalize-google-event";

const MAX_ICALENDAR_CODE_UNITS = 4 * 1024 * 1024;
const MAX_UNFOLDED_LINES = 150_000;
const MAX_LINE_CODE_UNITS = 64 * 1024;
const MAX_EVENTS_PER_FEED = 5_000;
const MAX_PROPERTIES_PER_EVENT = 128;
const SINGLE_VALUE_EVENT_PROPERTIES = new Set([
  "DESCRIPTION",
  "DTEND",
  "DTSTAMP",
  "DTSTART",
  "LAST-MODIFIED",
  "STATUS",
  "SUMMARY",
  "UID",
]);

export interface ParsedIcalendarFeed {
  events: readonly GoogleCalendarEventPayload[];
  truncated: boolean;
}

function unescapeIcalendarText(value: string): string {
  return value.replace(/\\([nN,;\\])/g, (_match, escaped: string) => {
    if (escaped === "n" || escaped === "N") return "\n";
    return escaped;
  });
}

function compactDate(value: string): string | null {
  if (!/^\d{8}$/.test(value)) return null;
  const dateOnly = `${value.slice(0, 4)}-${value.slice(4, 6)}-${value.slice(6, 8)}`;
  return isDateOnly(dateOnly) ? dateOnly : null;
}

function nextDateOnly(value: string): string | null {
  const dateOnly = compactDate(value);
  if (!dateOnly) return null;
  const [year, month, day] = dateOnly.split("-").map(Number);
  const next = new Date(Date.UTC(year, month - 1, day + 1));
  return [
    next.getUTCFullYear().toString().padStart(4, "0"),
    (next.getUTCMonth() + 1).toString().padStart(2, "0"),
    next.getUTCDate().toString().padStart(2, "0"),
  ].join("-");
}

function utcDateTime(value: string): string | null {
  const match = /^(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})Z$/.exec(
    value,
  );
  if (!match) return null;
  const [, rawYear, rawMonth, rawDay, rawHour, rawMinute, rawSecond] = match;
  const parts = [
    rawYear,
    rawMonth,
    rawDay,
    rawHour,
    rawMinute,
    rawSecond,
  ].map(Number);
  const [year, month, day, hour, minute, second] = parts;
  if (
    month < 1 ||
    month > 12 ||
    day < 1 ||
    day > 31 ||
    hour > 23 ||
    minute > 59 ||
    second > 59
  ) {
    return null;
  }
  const date = new Date(Date.UTC(year, month - 1, day, hour, minute, second));
  if (
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() + 1 !== month ||
    date.getUTCDate() !== day ||
    date.getUTCHours() !== hour ||
    date.getUTCMinutes() !== minute ||
    date.getUTCSeconds() !== second
  ) {
    return null;
  }
  return date.toISOString();
}

function unfoldLines(value: string): string[] | null {
  if (value.length > MAX_ICALENDAR_CODE_UNITS) return null;
  const physicalLines = value.replace(/\r\n/g, "\n").replace(/\r/g, "\n").split("\n");
  if (physicalLines.length > MAX_UNFOLDED_LINES) return null;

  const lines: string[] = [];
  for (const physicalLine of physicalLines) {
    if (physicalLine.length > MAX_LINE_CODE_UNITS) return null;
    if (/^[ \t]/.test(physicalLine)) {
      if (lines.length === 0) return null;
      const unfolded = `${lines[lines.length - 1]}${physicalLine.slice(1)}`;
      if (unfolded.length > MAX_LINE_CODE_UNITS) return null;
      lines[lines.length - 1] = unfolded;
    } else {
      lines.push(physicalLine);
    }
  }
  return lines;
}

interface IcalendarProperty {
  name: string;
  parameters: readonly string[];
  value: string;
}

function parseProperty(line: string): IcalendarProperty | null {
  const separator = line.indexOf(":");
  if (separator <= 0) return null;
  const head = line.slice(0, separator).split(";");
  const name = head[0]?.toUpperCase();
  if (!name || !/^[A-Z0-9-]+$/.test(name)) return null;
  return {
    name,
    parameters: head.slice(1).map((value) => value.toUpperCase()),
    value: line.slice(separator + 1),
  };
}

function firstProperty(
  properties: ReadonlyMap<string, IcalendarProperty>,
  name: string,
): IcalendarProperty | null {
  return properties.get(name) ?? null;
}

function datePayload(
  start: IcalendarProperty,
  end: IcalendarProperty | null,
): Pick<GoogleCalendarEventPayload, "start" | "end"> | null {
  const startIsDate = start.parameters.includes("VALUE=DATE");
  if (start.parameters.some((parameter) => parameter.startsWith("TZID="))) {
    return null;
  }

  if (startIsDate) {
    const startDate = compactDate(start.value);
    const endDate = end ? compactDate(end.value) : nextDateOnly(start.value);
    if (!startDate || !endDate || endDate <= startDate) return null;
    if (
      end &&
      !end.parameters.includes("VALUE=DATE")
    ) {
      return null;
    }
    return { start: { date: startDate }, end: { date: endDate } };
  }

  if (
    start.parameters.length > 0 ||
    !end ||
    end.parameters.length > 0
  ) {
    return null;
  }
  const startDateTime = utcDateTime(start.value);
  const endDateTime = utcDateTime(end.value);
  if (
    !startDateTime ||
    !endDateTime ||
    Date.parse(endDateTime) <= Date.parse(startDateTime)
  ) {
    return null;
  }
  return {
    start: { dateTime: startDateTime, timeZone: "Europe/Madrid" },
    end: { dateTime: endDateTime, timeZone: "Europe/Madrid" },
  };
}

function eventPayload(
  properties: ReadonlyMap<string, IcalendarProperty>,
): GoogleCalendarEventPayload | null {
  if (
    properties.has("RRULE") ||
    properties.has("RDATE") ||
    properties.has("EXDATE")
  ) {
    return null;
  }
  const uid = firstProperty(properties, "UID")?.value.trim();
  const start = firstProperty(properties, "DTSTART");
  const end = firstProperty(properties, "DTEND");
  if (!uid || !start) return null;
  const dates = datePayload(start, end);
  if (!dates) return null;

  const status = firstProperty(properties, "STATUS")?.value.trim().toLowerCase();
  const lastModified =
    firstProperty(properties, "LAST-MODIFIED")?.value.trim() ??
    firstProperty(properties, "DTSTAMP")?.value.trim();

  return {
    id: uid,
    iCalUID: uid,
    status,
    summary: unescapeIcalendarText(
      firstProperty(properties, "SUMMARY")?.value ?? "",
    ),
    description: unescapeIcalendarText(
      firstProperty(properties, "DESCRIPTION")?.value ?? "",
    ),
    ...dates,
    updated: lastModified ? utcDateTime(lastModified) ?? undefined : undefined,
  };
}

/** Parser acotado al subconjunto que publican los feeds iCalendar de la AEAT. */
export function parseAeatIcalendar(value: string): ParsedIcalendarFeed | null {
  const lines = unfoldLines(value);
  if (
    !lines ||
    !lines.some((line) => line === "BEGIN:VCALENDAR") ||
    !lines.some((line) => line === "END:VCALENDAR")
  ) {
    return null;
  }

  const events: GoogleCalendarEventPayload[] = [];
  let properties: Map<string, IcalendarProperty> | null = null;
  let nestedDepth = 0;
  for (const line of lines) {
    if (line === "BEGIN:VEVENT" && !properties) {
      properties = new Map();
      nestedDepth = 0;
      continue;
    }
    if (!properties) continue;

    if (line.startsWith("BEGIN:")) {
      nestedDepth += 1;
      continue;
    }
    if (line.startsWith("END:") && line !== "END:VEVENT") {
      if (nestedDepth === 0) return null;
      nestedDepth -= 1;
      continue;
    }
    if (line === "END:VEVENT") {
      if (nestedDepth !== 0) return null;
      const payload = eventPayload(properties);
      if (!payload || events.length >= MAX_EVENTS_PER_FEED) return null;
      events.push(payload);
      properties = null;
      continue;
    }
    if (nestedDepth > 0) continue;

    const property = parseProperty(line);
    if (!property || properties.size >= MAX_PROPERTIES_PER_EVENT) return null;
    if (
      SINGLE_VALUE_EVENT_PROPERTIES.has(property.name) &&
      properties.has(property.name)
    ) {
      return null;
    }
    if (!properties.has(property.name)) {
      properties.set(property.name, property);
    }
  }

  if (properties) return null;
  return { events, truncated: false };
}
