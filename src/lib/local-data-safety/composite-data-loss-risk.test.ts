import { describe, expect, it } from "vitest";
import {
  buildCompositeLocalDataLossRiskAssessment,
  summarizeCompositeLocalDataLossRiskAssessment,
} from "./composite-data-loss-risk";

// PHASE2D65_COMPOSITE_DATA_LOSS_RISK_AGGREGATOR_V1

describe("composite local data-loss risk aggregator", () => {
  it("keeps low-risk synthetic drafts reviewable while apply stays disabled", () => {
    const assessment = buildCompositeLocalDataLossRiskAssessment({
      currentData: {
        counters: { invoice: { next: 10 } },
        customers: [{ id: "SYNTHETIC_ONLY_CUSTOMER" }],
        documents: [],
      },
      incomingData: {
        counters: { invoice: { next: 10 } },
        customers: [{ id: "SYNTHETIC_ONLY_CUSTOMER" }],
        documents: [
          {
            id: "SYNTHETIC_ONLY_DRAFT",
            status: "borrador",
            documentLifecycle: "draft",
            integrityLock: "unlocked",
            customerId: "SYNTHETIC_ONLY_CUSTOMER",
            number: "11",
            year: "2026",
          },
        ],
      },
      adversarialCorpus: {
        marker: "PHASE2D63_ADVERSARIAL_MALFORMED_BACKUP_CORPUS_V1",
        totalCases: 0,
        unsafeCases: 0,
        warningCases: 0,
        allRejectedOrSafe: true,
        payloadEchoed: false,
        safe: true,
      },
    });
    const summary = summarizeCompositeLocalDataLossRiskAssessment(assessment);

    expect(summary.severity).toBe("low");
    expect(summary.manualReviewRequired).toBe(false);
    expect(summary.applyAllowed).toBe(false);
  });

  it("aggregates mixed and high risks into blockers and safe next steps", () => {
    const assessment = buildCompositeLocalDataLossRiskAssessment({
      currentData: {
        counters: { invoice: { next: 50 } },
        customers: [{ id: "SYNTHETIC_ONLY_CUSTOMER", displayName: "Cliente original" }],
        documents: [
          {
            id: "SYNTHETIC_ONLY_ISSUED",
            kind: "invoice",
            number: "10",
            year: "2026",
            status: "emitida",
            documentLifecycle: "issued",
            snapshotHash: "SYNTHETIC_ONLY_HASH_A",
            pdfSnapshotHash: "SYNTHETIC_ONLY_PDF_A",
          },
        ],
      },
      incomingData: {
        counters: { invoice: { next: 2 } },
        customers: [{ id: "SYNTHETIC_ONLY_CUSTOMER", displayName: "Cliente cambiado" }],
        documents: [
          {
            id: "SYNTHETIC_ONLY_ISSUED",
            kind: "invoice",
            number: "10",
            year: "2026",
            status: "emitida",
            documentLifecycle: "issued",
            integrityLock: "locked",
            customerId: "SYNTHETIC_ONLY_CUSTOMER",
            snapshotHash: "SYNTHETIC_ONLY_HASH_B",
            pdfSnapshotHash: "SYNTHETIC_ONLY_PDF_B",
          },
        ],
      },
    });
    const summary = summarizeCompositeLocalDataLossRiskAssessment(assessment);

    expect(summary.severity).toBe("blocked");
    expect(summary.blockers).toEqual(
      expect.arrayContaining(["numbering_counter_blocker", "snapshot_pdf_hash_blocker", "customer_identity_blocker"]),
    );
    expect(assessment.restoreAllowed).toBe(false);
    expect(JSON.stringify(assessment)).not.toMatch(/documentSnapshot|rawPayload|authorization|cookie/i);
  });
});
