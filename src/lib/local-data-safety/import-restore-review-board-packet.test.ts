import { describe, expect, it } from "vitest";
import {
  assertImportRestoreReviewBoardPacketSafe,
  buildImportRestoreReviewBoardPacket,
  redactImportRestoreReviewBoardPacket,
  summarizeImportRestoreReviewBoardPacket,
} from "./import-restore-review-board-packet";

// PHASE2D73_IMPORT_RESTORE_REVIEW_BOARD_PACKET_V1

describe("import/restore review board packet", () => {
  it("organizes board evidence without enabling wiring", () => {
    const packet = buildImportRestoreReviewBoardPacket({ generatedAt: "2026-06-27T00:00:00.000Z" });
    const summary = summarizeImportRestoreReviewBoardPacket(packet);

    expect(assertImportRestoreReviewBoardPacketSafe(packet)).toBe(packet);
    expect(packet.executiveSummary.length).toBeGreaterThan(0);
    expect(packet.testEvidence).toEqual(expect.arrayContaining(["phase2d77 decision package acceptance"]));
    expect(summary.applyImportAllowed).toBe(false);
    expect(summary.applyRestoreAllowed).toBe(false);
    expect(packet.routeAllowed).toBe(false);
  });

  it("redacts to the same safe blocked state", () => {
    const packet = buildImportRestoreReviewBoardPacket({ generatedAt: "2026-06-27T00:00:00.000Z" });
    const redacted = redactImportRestoreReviewBoardPacket(packet);

    expect(redacted.rawDataIncluded).toBe(false);
    expect(redacted.safe).toBe(true);
  });
});
