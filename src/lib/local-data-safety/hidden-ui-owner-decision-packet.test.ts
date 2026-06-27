import { describe, expect, it } from "vitest";
import {
  assertHiddenUiOwnerDecisionPacketSafe,
  buildHiddenUiOwnerDecisionPacket,
  summarizeHiddenUiOwnerDecisionPacket,
} from "./hidden-ui-owner-decision-packet";

// PHASE2D99_HIDDEN_UI_OWNER_DECISION_PACKET_V1

describe("PHASE2D99 hidden UI owner decision packet", () => {
  it("describes the owner decision without authorizing enablement", () => {
    const packet = buildHiddenUiOwnerDecisionPacket({ generatedAt: "2026-06-27T00:00:00.000Z" });
    const summary = summarizeHiddenUiOwnerDecisionPacket(packet);

    expect(packet.requestedDecision).toContain("future hidden/routeless enablement");
    expect(summary.authorizesEnablement).toBe(false);
    expect(packet.noActivationConditions.length).toBeGreaterThan(0);
  });

  it("rejects packets that try to authorize by themselves", () => {
    const packet = buildHiddenUiOwnerDecisionPacket();

    const unsafePacket = { ...packet, authorizesEnablement: true } as unknown as Parameters<
      typeof assertHiddenUiOwnerDecisionPacketSafe
    >[0];
    expect(() => assertHiddenUiOwnerDecisionPacketSafe(unsafePacket)).toThrow();
  });
});
