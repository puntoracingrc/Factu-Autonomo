import { describe, expect, it } from "vitest";
import {
  analyzeSnapshotPdfHashRisk,
  compareDocumentSnapshotReferences,
  summarizeSnapshotPdfHashRisk,
} from "./snapshot-pdf-hash-risk";

// PHASE2D60_SNAPSHOT_PDF_HASH_RISK_ANALYZER_V1

describe("snapshot/pdf hash risk analyzer", () => {
  it("detects snapshot and PDF hash mismatches on protected documents", () => {
    const risks = compareDocumentSnapshotReferences(
      {
        id: "SYNTHETIC_ONLY_HASHED",
        status: "emitida",
        documentLifecycle: "issued",
        snapshotHash: "SYNTHETIC_ONLY_HASH_A",
        pdfSnapshotHash: "SYNTHETIC_ONLY_PDF_A",
      },
      {
        id: "SYNTHETIC_ONLY_HASHED",
        status: "emitida",
        documentLifecycle: "issued",
        snapshotHash: "SYNTHETIC_ONLY_HASH_B",
        pdfSnapshotHash: "SYNTHETIC_ONLY_PDF_B",
      },
    );

    expect(risks.map((risk) => risk.id)).toEqual(
      expect.arrayContaining(["snapshot_hash_mismatch", "pdf_snapshot_hash_mismatch", "incoming_replaces_frozen_hash"]),
    );
    expect(risks.some((risk) => risk.severity === "blocked")).toBe(true);
  });

  it("detects missing protected hashes and keeps summaries payload-free", () => {
    const assessment = analyzeSnapshotPdfHashRisk(
      {},
      {
        documents: [
          {
            id: "SYNTHETIC_ONLY_PROTECTED_NO_HASH",
            status: "emitida",
            documentLifecycle: "issued",
            integrityLock: "locked",
          },
        ],
      },
    );
    const summary = summarizeSnapshotPdfHashRisk(assessment);

    expect(summary.riskIds).toEqual(
      expect.arrayContaining(["snapshot_missing_on_protected", "pdf_hash_missing_on_protected", "legacy_fallback_required"]),
    );
    expect(JSON.stringify(summary)).not.toMatch(/documentSnapshot|pdfSnapshot|payload/i);
    expect(summary.applyAllowed).toBe(false);
  });
});
