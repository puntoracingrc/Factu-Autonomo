import { describe, expect, it, vi } from "vitest";
import { createFiscalCalendarDateRange } from "./dates";
import { FiscalCalendarProviderError } from "./errors";
import { getAeatCalendarSource } from "./catalog";
import { AeatPublicIcalendarProvider } from "./aeat-public-icalendar-provider";

const RANGE = createFiscalCalendarDateRange("2026-07-13", "2026-12-10");

function feed(options: {
  uid?: string;
  start?: string;
  end?: string;
  summary?: string;
  description?: string;
  status?: string;
} = {}): string {
  return [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "BEGIN:VEVENT",
    `UID:${options.uid ?? "synthetic-event@example.invalid"}`,
    `DTSTART;VALUE=DATE:${options.start ?? "20260720"}`,
    `DTEND;VALUE=DATE:${options.end ?? "20260721"}`,
    `SUMMARY:${options.summary ?? "IVA"}`,
    `DESCRIPTION:${options.description ?? "<ul><li>Segundo trimestre: 303</li></ul>"}`,
    `STATUS:${options.status ?? "CONFIRMED"}`,
    "LAST-MODIFIED:20260712T080000Z",
    "END:VEVENT",
    "END:VCALENDAR",
  ].join("\r\n");
}

function calendarResponse(value = feed(), init: ResponseInit = {}): Response {
  return new Response(value, {
    status: 200,
    headers: { "Content-Type": "text/calendar; charset=utf-8" },
    ...init,
  });
}

function syntheticFeedForDates(category: string, dates: readonly string[]): string {
  const events = dates.flatMap((date, index) => {
    const parsed = new Date(
      Date.UTC(
        Number(date.slice(0, 4)),
        Number(date.slice(4, 6)) - 1,
        Number(date.slice(6, 8)) + 1,
      ),
    );
    const end = [
      parsed.getUTCFullYear().toString().padStart(4, "0"),
      (parsed.getUTCMonth() + 1).toString().padStart(2, "0"),
      parsed.getUTCDate().toString().padStart(2, "0"),
    ].join("");
    return [
      "BEGIN:VEVENT",
      `UID:synthetic-${category}-${index}@example.invalid`,
      `DTSTART;VALUE=DATE:${date}`,
      `DTEND;VALUE=DATE:${end}`,
      `SUMMARY:${category}`,
      "DESCRIPTION:Modelo 303",
      "STATUS:CONFIRMED",
      "END:VEVENT",
    ];
  });
  return [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    ...events,
    "END:VCALENDAR",
  ].join("\r\n");
}

describe("AeatPublicIcalendarProvider", () => {
  it("consulta únicamente la URL canónica allowlisted y devuelve eventos seguros", async () => {
    const fetchImpl = vi.fn(async (...args: Parameters<typeof fetch>) => {
      void args;
      return calendarResponse();
    });
    const provider = new AeatPublicIcalendarProvider({
      fetchImpl,
      now: () => new Date("2026-07-13T08:00:00.000Z"),
    });

    await expect(provider.listEvents(RANGE, ["iva"])).resolves.toMatchObject({
      providerMode: "aeat-icalendar",
      fetchedAt: "2026-07-13T08:00:00.000Z",
      truncated: false,
      events: [
        {
          source: "AEAT",
          sourceProvider: "google-calendar",
          sourceCalendarKey: "iva",
          title: "IVA",
          description: "Segundo trimestre: 303",
          reviewStatus: "review-with-advisor",
          deadlineKind: "unclassified",
          startDate: "2026-07-20",
          endDateExclusive: "2026-07-21",
          allDay: true,
          status: "confirmed",
        },
      ],
    });

    const [url, init] = fetchImpl.mock.calls[0] ?? [];
    expect(String(url)).toBe(getAeatCalendarSource("iva").icalUrl);
    expect(init).toMatchObject({
      method: "GET",
      cache: "no-store",
      redirect: "error",
      headers: { Accept: "text/calendar" },
    });
    expect(String(url)).not.toContain("key=");
  });

  it("filtra por rango después de leer la fuente y reutiliza su caché entre consultas", async () => {
    const fetchImpl = vi.fn(async () => calendarResponse());
    let now = new Date("2026-07-13T08:00:00.000Z");
    const provider = new AeatPublicIcalendarProvider({
      fetchImpl,
      now: () => now,
      sourceCacheTtlMs: 1_000,
    });

    const visible = await provider.listEvents(RANGE, ["iva"]);
    const outside = await provider.listEvents(
      createFiscalCalendarDateRange("2026-08-01", "2026-08-31"),
      ["iva"],
    );
    expect(visible.events).toHaveLength(1);
    expect(outside.events).toHaveLength(0);
    expect(fetchImpl).toHaveBeenCalledTimes(1);

    now = new Date("2026-07-13T08:00:01.001Z");
    await provider.listEvents(RANGE, ["iva"]);
    expect(fetchImpl).toHaveBeenCalledTimes(2);
  });

  it("inspecciona el feed completo sin confundir un rango vacío con una avería", async () => {
    const fetchImpl = vi.fn(async () =>
      calendarResponse(
        feed({
          uid: "historical-health-event@example.invalid",
          start: "20240115",
          end: "20240116",
        }),
      ),
    );
    const provider = new AeatPublicIcalendarProvider({
      fetchImpl,
      now: () => new Date("2026-07-13T08:00:00.000Z"),
    });

    const visible = await provider.listEvents(RANGE, ["iva"]);
    const [inspection] = await provider.inspectSources(["iva"]);

    expect(visible.events).toHaveLength(0);
    expect(inspection).toEqual({
      category: "iva",
      ok: true,
      fetchedAt: "2026-07-13T08:00:00.000Z",
      eventCount: 1,
      upcomingEventCount: 0,
      truncated: false,
      earliestEventDate: "2024-01-15",
      latestEventDate: "2024-01-15",
      latestSourceUpdatedAt: "2026-07-12T08:00:00.000Z",
    });
    expect(fetchImpl).toHaveBeenCalledTimes(1);
  });

  it("devuelve un diagnóstico por fuente aunque una de las cinco falle", async () => {
    const fetchImpl = vi.fn(async (input: Parameters<typeof fetch>[0]) => {
      if (String(input) === getAeatCalendarSource("sociedades").icalUrl) {
        return new Response("unavailable", { status: 503 });
      }
      return calendarResponse();
    });
    const provider = new AeatPublicIcalendarProvider({
      fetchImpl,
      maxAttempts: 1,
    });

    const inspections = await provider.inspectSources([
      "renta",
      "renta_sociedades",
      "sociedades",
      "iva",
      "declaraciones_informativas",
    ]);

    expect(inspections).toHaveLength(5);
    expect(
      inspections.find((item) => item.category === "sociedades"),
    ).toEqual({
      category: "sociedades",
      ok: false,
      code: "SOURCE_UNAVAILABLE",
      status: 503,
      attempts: 1,
      retryable: true,
    });
    expect(inspections.filter((item) => item.ok)).toHaveLength(4);
  });

  it("conserva como señal explícita un feed iCalendar válido pero vacío", async () => {
    const provider = new AeatPublicIcalendarProvider({
      fetchImpl: vi.fn(async () =>
        calendarResponse("BEGIN:VCALENDAR\r\nVERSION:2.0\r\nEND:VCALENDAR"),
      ),
    });

    await expect(provider.inspectSources(["renta"])).resolves.toEqual([
      expect.objectContaining({
        category: "renta",
        ok: true,
        eventCount: 0,
        upcomingEventCount: 0,
      }),
    ]);
  });

  it("reproduce el contrato de 25 eventos y cinco filtros del rango oficial", async () => {
    const datesByCategory = {
      renta: ["20261105"],
      renta_sociedades: [
        "20260720",
        "20260820",
        "20260921",
        "20261020",
        "20261120",
      ],
      sociedades: ["20260727"],
      iva: [
        "20260720",
        "20260730",
        "20260731",
        "20260820",
        "20260831",
        "20260921",
        "20260930",
        "20261020",
        "20261030",
        "20261031",
        "20261120",
        "20261130",
      ],
      declaraciones_informativas: [
        "20260727",
        "20260731",
        "20260831",
        "20260930",
        "20261102",
        "20261130",
      ],
    } as const;
    const categories = Object.keys(
      datesByCategory,
    ) as Array<keyof typeof datesByCategory>;
    const fetchImpl = vi.fn(async (input: Parameters<typeof fetch>[0]) => {
      const category = categories.find(
        (candidate) => getAeatCalendarSource(candidate).icalUrl === String(input),
      );
      if (!category) return new Response("not found", { status: 404 });
      return calendarResponse(
        syntheticFeedForDates(category, datesByCategory[category]),
      );
    });
    const provider = new AeatPublicIcalendarProvider({ fetchImpl });

    const all = await provider.listEvents(RANGE, categories);
    expect(all.events).toHaveLength(25);
    expect(new Set(all.events.map((event) => event.startDate))).toHaveLength(15);
    for (const category of categories) {
      const filtered = await provider.listEvents(RANGE, [category]);
      expect(filtered.events, category).toHaveLength(
        datesByCategory[category].length,
      );
    }
    expect(fetchImpl).toHaveBeenCalledTimes(5);
  });

  it("consulta varias categorías y falla completo si una fuente no responde", async () => {
    const fetchImpl = vi.fn(async (url: string | URL | Request) => {
      if (String(url) === getAeatCalendarSource("sociedades").icalUrl) {
        return new Response("unavailable", { status: 503 });
      }
      return calendarResponse(
        feed({ uid: `synthetic-${String(url).length}@example.invalid` }),
      );
    });
    const provider = new AeatPublicIcalendarProvider({
      fetchImpl,
      maxAttempts: 1,
    });

    await expect(
      provider.listEvents(RANGE, ["iva", "sociedades"]),
    ).rejects.toMatchObject({
      code: "SOURCE_UNAVAILABLE",
      status: 503,
    });
  });

  it.each<() => Response>([
    () =>
      new Response("json", {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
    () =>
      new Response("redirect", {
        status: 302,
        headers: {
          Location: "https://example.invalid/not-allowed.ics",
          "Content-Type": "text/calendar",
        },
      }),
    () => calendarResponse("BEGIN:VCALENDAR\r\nBROKEN"),
  ])("rechaza tipos, redirecciones o calendarios inválidos", async (response) => {
    const provider = new AeatPublicIcalendarProvider({
      fetchImpl: vi.fn(async () => response()),
      maxAttempts: 1,
    });
    await expect(provider.listEvents(RANGE, ["iva"])).rejects.toBeInstanceOf(
      FiscalCalendarProviderError,
    );
  });

  it("rechaza Content-Length anunciado por encima del límite", async () => {
    const provider = new AeatPublicIcalendarProvider({
      fetchImpl: vi.fn(async () =>
        calendarResponse("BEGIN:VCALENDAR\r\nEND:VCALENDAR", {
          headers: {
            "Content-Type": "text/calendar",
            "Content-Length": String(3 * 1024 * 1024 + 1),
          },
        }),
      ),
      maxAttempts: 1,
    });
    await expect(provider.listEvents(RANGE, ["iva"])).rejects.toMatchObject({
      code: "INVALID_RESPONSE",
    });
  });

  it("cuenta bytes reales multibyte sin Content-Length y aborta al exceder", async () => {
    const cancel = vi.fn();
    const firstChunk = new Uint8Array(3 * 1024 * 1024 - 1).fill(65);
    const secondChunk = new TextEncoder().encode("€");
    let sentSecondChunk = false;
    const stream = new ReadableStream<Uint8Array>({
      start(controller) {
        controller.enqueue(firstChunk);
      },
      pull(controller) {
        if (sentSecondChunk) return;
        sentSecondChunk = true;
        controller.enqueue(secondChunk);
      },
      cancel,
    });
    let requestSignal: AbortSignal | undefined;
    const provider = new AeatPublicIcalendarProvider({
      fetchImpl: vi.fn(async (_url, init) => {
        requestSignal = init?.signal ?? undefined;
        return new Response(stream, {
          status: 200,
          headers: { "Content-Type": "text/calendar; charset=utf-8" },
        });
      }),
      maxAttempts: 1,
    });

    await expect(provider.listEvents(RANGE, ["iva"])).rejects.toMatchObject({
      code: "INVALID_RESPONSE",
    });
    expect(requestSignal?.aborted).toBe(true);
    expect(cancel).toHaveBeenCalled();
  });

  it("clasifica timeout y acota los reintentos", async () => {
    const fetchImpl = vi.fn(
      async (_url: string | URL | Request, init?: RequestInit) =>
        new Promise<Response>((_resolve, reject) => {
          init?.signal?.addEventListener("abort", () =>
            reject(new DOMException("aborted", "AbortError")),
          );
        }),
    );
    const provider = new AeatPublicIcalendarProvider({
      fetchImpl,
      timeoutMs: 1,
      maxAttempts: 1,
    });

    await expect(provider.listEvents(RANGE, ["iva"])).rejects.toMatchObject({
      code: "TIMEOUT",
      attempts: 1,
    });
    expect(fetchImpl).toHaveBeenCalledTimes(1);
  });
});
