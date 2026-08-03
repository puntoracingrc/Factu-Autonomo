import { describe, expect, it } from "vitest";

import {
  centralAuthorityRolloutBucket,
  centralAuthorityRolloutPercent,
  evaluateCentralAuthorityPublicRollout,
  isCentralAuthorityRolloutSelected,
} from "./rollout";

const USER_ID = "00000000-0000-4000-8000-000000000001";

describe("central authority percentage rollout", () => {
  it("asigna una cohorte estable, monotona y sin estado compartido", () => {
    const bucket = centralAuthorityRolloutBucket(USER_ID);
    expect(bucket).not.toBeNull();
    expect(centralAuthorityRolloutBucket(USER_ID)).toBe(bucket);
    expect(isCentralAuthorityRolloutSelected(USER_ID, "0", "*")).toBe(false);
    expect(isCentralAuthorityRolloutSelected(USER_ID, "100", "*")).toBe(true);
    expect(isCentralAuthorityRolloutSelected(USER_ID, "100", "")).toBe(false);
    expect(
      isCentralAuthorityRolloutSelected(USER_ID, "100", USER_ID),
    ).toBe(true);

    const threshold = ((bucket ?? 0) + 1) / 100;
    expect(
      isCentralAuthorityRolloutSelected(USER_ID, String(threshold), "*"),
    ).toBe(true);
  });

  it("limita porcentajes invalidos y el interruptor solo pausa escrituras", () => {
    expect(centralAuthorityRolloutPercent("invalid")).toBe(0);
    expect(centralAuthorityRolloutPercent("-10")).toBe(0);
    expect(centralAuthorityRolloutPercent("120")).toBe(100);
    expect(
      evaluateCentralAuthorityPublicRollout(USER_ID, {
        rolloutPercent: "100",
        killSwitch: "true",
        eligibleUserIds: USER_ID,
      }),
    ).toMatchObject({
      selected: true,
      writesEnabled: false,
      emergencyStopped: true,
    });
  });
});
