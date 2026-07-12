import { eventOverlapsRange } from "./dates";
import { FISCAL_CALENDAR_FIXTURES } from "./fixtures";
import {
  normalizeGoogleCalendarEvent,
  sortFiscalCalendarEvents,
} from "./normalize-google-event";
import type {
  FiscalCalendarCategory,
  FiscalCalendarDateRange,
  FiscalCalendarProvider,
  FiscalCalendarProviderResult,
} from "./types";

export class FixtureFiscalCalendarProvider
  implements FiscalCalendarProvider
{
  constructor(private readonly now: () => Date = () => new Date()) {}

  async listEvents(
    dateRange: FiscalCalendarDateRange,
    categories: readonly FiscalCalendarCategory[],
  ): Promise<FiscalCalendarProviderResult> {
    const fetchedAt = this.now().toISOString();
    const allowed = new Set(categories);
    const events = FISCAL_CALENDAR_FIXTURES.flatMap((fixture) => {
      if (!allowed.has(fixture.category)) return [];
      const normalized = normalizeGoogleCalendarEvent(
        fixture.event,
        fixture.category,
        fetchedAt,
      );
      if (
        !normalized ||
        normalized.status === "cancelled" ||
        !eventOverlapsRange(normalized, dateRange)
      ) {
        return [];
      }
      return [normalized];
    });

    return {
      events: sortFiscalCalendarEvents(events),
      fetchedAt,
      providerMode: "fixture",
      truncated: false,
    };
  }
}
