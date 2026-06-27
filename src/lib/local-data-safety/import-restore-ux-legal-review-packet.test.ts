import { describe, expect, it } from "vitest";
import {
  assertImportRestoreUxLegalReviewPacketSafe,
  buildImportRestoreUxLegalReviewPacket,
  redactImportRestoreUxLegalReviewPacket,
  summarizeImportRestoreUxLegalReviewPacket,
} from "./import-restore-ux-legal-review-packet";
import { getImportRestoreSyntheticUiFixture } from "./import-restore-ui-fixtures";
import { createImportRestoreReviewSession, updateImportRestoreReviewSession } from "./import-restore-review-session";

// PHASE2D51_IMPORT_RESTORE_UX_LEGAL_REVIEW_PACKET_V1

describe("import/restore UX/legal review packet", () => {
  it("builds a safe packet with false approvals and placeholders only", () => {
    const fixture = getImportRestoreSyntheticUiFixture("SYNTHETIC_ONLY_SAFE_BACKUP_PREVIEW");
    let session = createImportRestoreReviewSession({ createdAt: "2026-06-27T00:00:00.000Z" });
    session = updateImportRestoreReviewSession(session, {
      type: "select_synthetic_fixture",
      fixtureId: fixture.id,
      occurredAt: "2026-06-27T00:00:01.000Z",
    });
    session = updateImportRestoreReviewSession(session, {
      type: "parse_preview",
      occurredAt: "2026-06-27T00:00:02.000Z",
    });
    session = updateImportRestoreReviewSession(session, {
      type: "build_review",
      occurredAt: "2026-06-27T00:00:03.000Z",
    });
    const packet = buildImportRestoreUxLegalReviewPacket({
      fixture,
      session,
      generatedAt: "2026-06-27T00:00:04.000Z",
    });
    const summary = summarizeImportRestoreUxLegalReviewPacket(packet);

    expect(assertImportRestoreUxLegalReviewPacketSafe(packet)).toBe(packet);
    expect(summary.featureStatus).toBe("routeless_synthetic_preview_only");
    expect(Object.values(packet.requiredApprovals).every((value) => value === false)).toBe(true);
    expect(packet.screenshotPlaceholders.every((entry) => entry.imageIncluded === false)).toBe(true);
    expect(packet.rawDataIncluded).toBe(false);
    expect(packet.recoverySnapshotPlaceholder.canStartDownload).toBe(false);
  });

  it("redacts without adding raw data shaped content", () => {
    const packet = buildImportRestoreUxLegalReviewPacket({
      fixture: getImportRestoreSyntheticUiFixture("SYNTHETIC_ONLY_NUMBERING_RISK_MANUAL_REVIEW"),
      generatedAt: "2026-06-27T00:00:00.000Z",
    });
    const redacted = redactImportRestoreUxLegalReviewPacket(packet);
    const serialized = JSON.stringify(redacted);

    expect(redacted.safe).toBe(true);
    expect(serialized).not.toContain("rawJson");
    expect(serialized).not.toContain("currentData");
    expect(serialized).not.toContain("incomingData");
  });
});
