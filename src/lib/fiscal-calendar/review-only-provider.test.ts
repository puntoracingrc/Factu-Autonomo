import { describe, expect, it } from "vitest";
import { createFiscalCalendarDateRange } from "./dates";
import { ReviewOnlyFiscalCalendarProvider } from "./review-only-provider";

describe("ReviewOnlyFiscalCalendarProvider", () => {
  it("devuelve una superficie vacía y determinista sin consultar fuentes externas", async () => {
    const provider = new ReviewOnlyFiscalCalendarProvider(
      () => new Date("2026-07-12T18:00:00.000Z"),
    );

    await expect(
      provider.listEvents(
        createFiscalCalendarDateRange("2026-07-01", "2026-07-31"),
        ["iva"],
      ),
    ).resolves.toEqual({
      events: [],
      fetchedAt: "2026-07-12T18:00:00.000Z",
      providerMode: "review-only",
      truncated: false,
    });
  });
});
