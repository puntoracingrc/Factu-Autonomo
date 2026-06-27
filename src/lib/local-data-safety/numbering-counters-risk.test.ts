import { describe, expect, it } from "vitest";
import {
  analyzeNumberingCountersRisk,
  compareBackupCounters,
  summarizeNumberingCountersRisk,
} from "./numbering-counters-risk";

// PHASE2D59_NUMBERING_COUNTERS_RISK_ANALYZER_V1

describe("numbering/counters risk analyzer", () => {
  it("detects lower, higher and incomplete incoming counters", () => {
    expect(compareBackupCounters({ counters: { invoice: { next: 50 } } }, { counters: { invoice: { next: 4 } } })[0]?.id).toBe(
      "incoming_counter_lower_than_current",
    );
    expect(compareBackupCounters({ counters: { invoice: { next: 4 } } }, { counters: { invoice: { next: 50 } } })[0]?.id).toBe(
      "incoming_counter_higher_unexpectedly",
    );
    expect(compareBackupCounters({ counters: { invoice: { next: 4 } } }, { counters: { invoice: {} } })[0]?.id).toBe(
      "legacy_numbering_unknown",
    );
  });

  it("detects emitted collisions, missing series and issued gaps without renumbering", () => {
    const assessment = analyzeNumberingCountersRisk(
      {
        counters: { invoice: { next: 20 } },
        documents: [
          {
            id: "SYNTHETIC_ONLY_CURRENT_ISSUED",
            kind: "invoice",
            number: "10",
            year: "2026",
            status: "emitida",
            documentLifecycle: "issued",
          },
        ],
      },
      {
        counters: { invoice: { next: 2 } },
        documents: [
          {
            id: "SYNTHETIC_ONLY_INCOMING_ISSUED",
            kind: "invoice",
            number: "10",
            year: "2026",
            status: "emitida",
            documentLifecycle: "issued",
          },
          {
            id: "SYNTHETIC_ONLY_INCOMING_ISSUED_2",
            kind: "invoice",
            number: "12",
            year: "2026",
            status: "emitida",
            documentLifecycle: "issued",
          },
          { id: "SYNTHETIC_ONLY_MISSING", kind: "invoice" },
        ],
      },
    );
    const summary = summarizeNumberingCountersRisk(assessment);

    expect(summary.riskIds).toEqual(
      expect.arrayContaining([
        "incoming_counter_lower_than_current",
        "emitted_number_conflict",
        "missing_series",
        "gaps_around_issued_documents",
      ]),
    );
    expect(summary.highestSeverity).toBe("blocked");
    expect(summary.applyAllowed).toBe(false);
  });
});
