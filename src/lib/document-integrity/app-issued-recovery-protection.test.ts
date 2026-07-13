import { describe, expect, it } from "vitest";
import type { Document } from "@/lib/types";
import { hasAppIssuedRecoveryProtectionClaim } from "./app-issued-recovery-protection";

describe("app-issued recovery protected-action claim", () => {
  it.each([
    ["aplicada", { status: "applied", repairId: "repair-1" }],
    ["revertida", { status: "rolled_back", repairId: "repair-1" }],
    ["malformada nula", null],
    ["malformada escalar", "invalid"],
  ])("bloquea por mera presencia aunque esté %s", (_label, claim) => {
    const document = {
      appIssuedRecoveryAttestation: claim,
    } as unknown as Pick<Document, "appIssuedRecoveryAttestation">;

    expect(hasAppIssuedRecoveryProtectionClaim(document)).toBe(true);
  });

  it("solo permite la ruta ordinaria cuando la atestación está ausente", () => {
    expect(
      hasAppIssuedRecoveryProtectionClaim({
        appIssuedRecoveryAttestation: undefined,
      }),
    ).toBe(false);
  });
});
