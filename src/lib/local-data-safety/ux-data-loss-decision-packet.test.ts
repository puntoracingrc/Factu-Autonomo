import { describe, expect, it } from "vitest";
import {
  assertUxDataLossDecisionPacketSafe,
  buildUxDataLossDecisionPacket,
  redactUxDataLossDecisionPacket,
  summarizeUxDataLossDecisionPacket,
} from "./ux-data-loss-decision-packet";

// PHASE2D71_UX_DATA_LOSS_DECISION_PACKET_BUILDER_V1

describe("UX data-loss decision packet", () => {
  it("builds a safe packet with approvals false and apply blocked", () => {
    const packet = buildUxDataLossDecisionPacket({ generatedAt: "2026-06-27T00:00:00.000Z" });
    const summary = summarizeUxDataLossDecisionPacket(packet);

    expect(assertUxDataLossDecisionPacketSafe(packet)).toBe(packet);
    expect(Object.values(packet.requiredApprovals).every((value) => value === false)).toBe(true);
    expect(summary.applyAllowed).toBe(false);
    expect(summary.restoreAllowed).toBe(false);
    expect(packet.rawDataIncluded).toBe(false);
    expect(packet.recommendedNextStep).toBe("human_product_decision");
  });

  it("redacts without adding raw data shaped content", () => {
    const packet = buildUxDataLossDecisionPacket({ generatedAt: "2026-06-27T00:00:00.000Z" });
    const redacted = redactUxDataLossDecisionPacket(packet);
    const serialized = JSON.stringify(redacted);

    expect(redacted.safe).toBe(true);
    expect(serialized).not.toMatch(/documentSnapshot|authorization|cookie/i);
  });
});
