import type {
  FiscalCalendarCategory,
  FiscalCalendarDateRange,
  FiscalCalendarProvider,
  FiscalCalendarProviderResult,
} from "./types";

/**
 * Superficie pública informativa. No contiene fixtures ni realiza consultas
 * externas mientras el dataset de vencimientos sigue pendiente de revisión.
 */
export class ReviewOnlyFiscalCalendarProvider
  implements FiscalCalendarProvider
{
  constructor(private readonly now: () => Date = () => new Date()) {}

  async listEvents(
    _dateRange: FiscalCalendarDateRange,
    _categories: readonly FiscalCalendarCategory[],
  ): Promise<FiscalCalendarProviderResult> {
    void _dateRange;
    void _categories;
    return {
      events: [],
      fetchedAt: this.now().toISOString(),
      providerMode: "review-only",
      truncated: false,
    };
  }
}
