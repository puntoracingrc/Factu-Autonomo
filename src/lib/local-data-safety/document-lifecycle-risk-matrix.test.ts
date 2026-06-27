import { describe, expect, it } from "vitest";
import {
  buildDocumentLifecycleRiskMatrix,
  classifyDocumentLifecycleImportRisk,
  summarizeDocumentLifecycleRiskMatrix,
} from "./document-lifecycle-risk-matrix";

// PHASE2D58_DOCUMENT_LIFECYCLE_RISK_MATRIX_V1

describe("document lifecycle risk matrix", () => {
  it("classifies draft documents as reviewable and protected lifecycle states as blocked", () => {
    expect(
      classifyDocumentLifecycleImportRisk({
        id: "SYNTHETIC_ONLY_DRAFT",
        status: "borrador",
        documentLifecycle: "draft",
        integrityLock: "unlocked",
      }).classification,
    ).toBe("reviewable");
    expect(
      classifyDocumentLifecycleImportRisk({
        id: "SYNTHETIC_ONLY_ISSUED",
        status: "emitida",
        documentLifecycle: "issued",
        integrityLock: "locked",
      }).classification,
    ).toBe("blocked");
    expect(
      classifyDocumentLifecycleImportRisk({
        id: "SYNTHETIC_ONLY_CANCELED",
        status: "cancelada",
        documentLifecycle: "canceled",
        integrityLock: "locked",
      }).classification,
    ).toBe("blocked");
  });

  it("covers sent budgets, accepted budgets, paid receipts, emitted receipts and legacy unknowns", () => {
    const matrix = buildDocumentLifecycleRiskMatrix({
      documents: [
        { id: "SYNTHETIC_ONLY_SENT_BUDGET", kind: "budget", status: "enviado", documentLifecycle: "draft" },
        { id: "SYNTHETIC_ONLY_ACCEPTED_BUDGET", kind: "budget", status: "aceptado", documentLifecycle: "issued" },
        { id: "SYNTHETIC_ONLY_PAID_RECEIPT", kind: "receipt", status: "pagado", documentLifecycle: "issued" },
        { id: "SYNTHETIC_ONLY_EMITTED_RECEIPT", kind: "receipt", status: "emitido", documentLifecycle: "issued" },
        { id: "SYNTHETIC_ONLY_LEGACY", status: "emitida" },
        { id: "SYNTHETIC_ONLY_UNKNOWN" },
      ],
    });
    const summary = summarizeDocumentLifecycleRiskMatrix(matrix);

    expect(summary.totals.blocked).toBeGreaterThanOrEqual(4);
    expect(summary.totals.manual_review).toBeGreaterThanOrEqual(1);
    expect(summary.manualReviewRequired).toBe(true);
    expect(summary.applyAllowed).toBe(false);
  });
});
