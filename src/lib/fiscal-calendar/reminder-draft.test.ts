import { describe, expect, it } from "vitest";
import {
  consumeFiscalCalendarReminderDraft,
  createFiscalCalendarReminderDraft,
  FISCAL_CALENDAR_REMINDER_STORAGE_KEY,
  FISCAL_CALENDAR_REMINDER_TARGET_HREF,
  storeFiscalCalendarReminderDraft,
  type FiscalCalendarReminderDraftStorage,
  type FiscalCalendarReminderDraftV1,
} from "./reminder-draft";
import type { FiscalCalendarEvent } from "./types";

class MemoryStorage implements FiscalCalendarReminderDraftStorage {
  readonly values = new Map<string, string>();
  failGet = false;
  failSet = false;
  failRemove = false;

  getItem(key: string): string | null {
    if (this.failGet) throw new Error("blocked");
    return this.values.get(key) ?? null;
  }

  setItem(key: string, value: string): void {
    if (this.failSet) throw new Error("blocked");
    this.values.set(key, value);
  }

  removeItem(key: string): void {
    if (this.failRemove) throw new Error("blocked");
    this.values.delete(key);
  }
}

function event(
  overrides: Partial<FiscalCalendarEvent> = {},
): FiscalCalendarEvent {
  return {
    id: "calendar-event",
    source: "AEAT",
    sourceProvider: "google-calendar",
    sourceCalendarKey: "iva",
    sourceCalendarId: "calendar",
    externalEventId: "external",
    iCalUID: null,
    title: "Autoliquidación: modelo 303",
    description: "",
    category: "iva",
    deadlineKind: "unclassified",
    reviewStatus: "review-with-advisor",
    startDate: "2026-07-20",
    endDateExclusive: "2026-07-21",
    allDay: true,
    status: "confirmed",
    sourceUpdatedAt: null,
    fetchedAt: "2026-07-15T08:00:00.000Z",
    ...overrides,
  };
}

function validDraft(
  overrides: Partial<FiscalCalendarReminderDraftV1> = {},
): FiscalCalendarReminderDraftV1 {
  return {
    schemaVersion: 1,
    origin: "fiscal-calendar",
    text: "Revisar si me afecta: modelo 303.",
    createdAt: "2026-07-15T08:00:00.000Z",
    ...overrides,
  };
}

function putRaw(storage: MemoryStorage, value: unknown): void {
  storage.values.set(
    FISCAL_CALENDAR_REMINDER_STORAGE_KEY,
    typeof value === "string" ? value : JSON.stringify(value),
  );
}

function hasUnpairedSurrogate(value: string): boolean {
  for (let index = 0; index < value.length; index += 1) {
    const code = value.charCodeAt(index);
    if (code >= 0xd800 && code <= 0xdbff) {
      const next = value.charCodeAt(index + 1);
      if (!(next >= 0xdc00 && next <= 0xdfff)) return true;
      index += 1;
    } else if (code >= 0xdc00 && code <= 0xdfff) {
      return true;
    }
  }
  return false;
}

describe("fiscal calendar reminder draft", () => {
  it("usa una ruta constante sin incluir datos del evento", () => {
    expect(FISCAL_CALENDAR_REMINDER_TARGET_HREF).toBe(
      "/avisos?origen=calendario#nuevo-recordatorio",
    );
  });

  it("prepara texto prudente para una fecha publicada", () => {
    const draft = createFiscalCalendarReminderDraft(
      event(),
      new Date("2026-07-15T08:00:00.000Z"),
    );

    expect(draft).toEqual({
      schemaVersion: 1,
      origin: "fiscal-calendar",
      text: "Revisar si me afecta: Autoliquidación: modelo 303 · Fecha publicada por la AEAT: 20 jul 2026.",
      createdAt: "2026-07-15T08:00:00.000Z",
    });
    expect(draft.text).not.toMatch(/debes presentar|plazo confirmado/i);
  });

  it("presenta un periodo all-day con el final exclusivo corregido", () => {
    const draft = createFiscalCalendarReminderDraft(
      event({ startDate: "2026-07-20", endDateExclusive: "2026-07-24" }),
    );

    expect(draft.text).toContain(
      "Periodo publicado por la AEAT: 20 jul 2026 – 23 jul 2026.",
    );
    expect(draft.text).not.toContain("24 jul");
  });

  it("presenta eventos con hora en Europe/Madrid incluso en cambio DST", () => {
    const draft = createFiscalCalendarReminderDraft(
      event({
        allDay: false,
        startDate: "2026-03-29T00:30:00.000Z",
        endDateExclusive: "2026-03-29T01:30:00.000Z",
      }),
    );

    expect(draft.text).toContain("Horario publicado por la AEAT");
    expect(draft.text).toMatch(/1:30.*3:30/);
  });

  it("mantiene texto plano, limita por puntos de código y no rompe Unicode", () => {
    const title = `<b>IVA</b>\n${"🧾".repeat(500)}<script>alerta</script>`;
    const draft = createFiscalCalendarReminderDraft(event({ title }));

    expect(draft.text).not.toMatch(/[<>\n\u0000]/u);
    expect(Array.from(draft.text).length).toBeLessThanOrEqual(600);
    expect(hasUnpairedSurrogate(draft.text)).toBe(false);
    expect(draft.text).toContain("IVA");
  });

  it("guarda y consume el borrador una sola vez", () => {
    const storage = new MemoryStorage();
    const draft = validDraft();

    expect(storeFiscalCalendarReminderDraft(storage, draft)).toEqual({
      ok: true,
    });
    expect(
      consumeFiscalCalendarReminderDraft(
        storage,
        new Date("2026-07-15T08:05:00.000Z"),
      ),
    ).toEqual({ ok: true, draft });
    expect(storage.values.size).toBe(0);
    expect(consumeFiscalCalendarReminderDraft(storage)).toEqual({
      ok: false,
      reason: "MISSING",
    });
  });

  it("elimina y rechaza payloads malformados o con shape no exacta", () => {
    const invalidValues: unknown[] = [
      "{mal json",
      { ...validDraft(), schemaVersion: 2 },
      { ...validDraft(), origin: "otra-ruta" },
      { ...validDraft(), extra: true },
      { ...validDraft(), text: "" },
      { ...validDraft(), text: "texto\ninyectado" },
      { ...validDraft(), text: "x".repeat(601) },
      { ...validDraft(), createdAt: "fecha inválida" },
    ];

    for (const value of invalidValues) {
      const storage = new MemoryStorage();
      putRaw(storage, value);
      expect(
        consumeFiscalCalendarReminderDraft(
          storage,
          new Date("2026-07-15T08:05:00.000Z"),
        ),
      ).toEqual({ ok: false, reason: "INVALID_DRAFT" });
      expect(storage.values.size).toBe(0);
    }
  });

  it("rechaza borradores caducados y relojes futuros fuera de tolerancia", () => {
    const expired = new MemoryStorage();
    putRaw(expired, validDraft({ createdAt: "2026-07-15T07:44:59.999Z" }));
    expect(
      consumeFiscalCalendarReminderDraft(
        expired,
        new Date("2026-07-15T08:00:00.000Z"),
      ),
    ).toEqual({ ok: false, reason: "EXPIRED" });

    const future = new MemoryStorage();
    putRaw(future, validDraft({ createdAt: "2026-07-15T08:01:00.001Z" }));
    expect(
      consumeFiscalCalendarReminderDraft(
        future,
        new Date("2026-07-15T08:00:00.000Z"),
      ),
    ).toEqual({ ok: false, reason: "INVALID_DRAFT" });
  });

  it("cuenta bytes multibyte antes de parsear y elimina el exceso", () => {
    const writeStorage = new MemoryStorage();
    expect(
      storeFiscalCalendarReminderDraft(
        writeStorage,
        validDraft({ text: "🧾".repeat(600) }),
      ),
    ).toEqual({ ok: false, reason: "INVALID_DRAFT" });
    expect(writeStorage.values.size).toBe(0);

    const storage = new MemoryStorage();
    putRaw(storage, `"${"á".repeat(1_100)}"`);

    expect(consumeFiscalCalendarReminderDraft(storage)).toEqual({
      ok: false,
      reason: "INVALID_DRAFT",
    });
    expect(storage.values.size).toBe(0);
  });

  it("falla de forma cerrada si sessionStorage no está disponible", () => {
    const onSet = new MemoryStorage();
    onSet.failSet = true;
    expect(storeFiscalCalendarReminderDraft(onSet, validDraft())).toEqual({
      ok: false,
      reason: "STORAGE_UNAVAILABLE",
    });

    const onGet = new MemoryStorage();
    onGet.failGet = true;
    expect(consumeFiscalCalendarReminderDraft(onGet)).toEqual({
      ok: false,
      reason: "STORAGE_UNAVAILABLE",
    });

    const onRemove = new MemoryStorage();
    putRaw(onRemove, validDraft());
    onRemove.failRemove = true;
    expect(consumeFiscalCalendarReminderDraft(onRemove)).toEqual({
      ok: false,
      reason: "STORAGE_UNAVAILABLE",
    });
  });
});
