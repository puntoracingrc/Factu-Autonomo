import { describe, expect, it } from "vitest";

import { evaluateVerifactuPreproductionActivation } from "./config";

const USER_ID = "1bb4023e-97de-4960-9b35-27a3a8a3a0f5";
const DOCUMENT_ID = "synthetic-test-invoice";

function env(overrides: Record<string, string> = {}) {
  return {
    VERIFACTU_AEAT_PREPRODUCTION_ENABLED: "true",
    VERIFACTU_AEAT_PREPRODUCTION_USER_IDS: USER_ID,
    VERIFACTU_AEAT_PREPRODUCTION_DOCUMENT_IDS: DOCUMENT_ID,
    VERIFACTU_ENVIRONMENT: "test",
    ...overrides,
  };
}

describe("VeriFactu preproduction activation", () => {
  it("opens only one exact user and one exact test document", () => {
    expect(
      evaluateVerifactuPreproductionActivation({
        userId: USER_ID,
        localDocumentId: DOCUMENT_ID,
        env: env(),
      }),
    ).toEqual({ enabled: true, reason: "enabled_for_exact_scope" });
  });

  it("fails closed when the environment is absent or not test", () => {
    for (const environment of [undefined, "production", "preview"]) {
      const candidate: Record<string, string> = env();
      if (environment === undefined) {
        delete candidate.VERIFACTU_ENVIRONMENT;
      } else {
        candidate.VERIFACTU_ENVIRONMENT = environment;
      }
      expect(
        evaluateVerifactuPreproductionActivation({
          userId: USER_ID,
          localDocumentId: DOCUMENT_ID,
          env: candidate,
        }),
      ).toEqual({ enabled: false, reason: "environment_not_test" });
    }
  });

  it("refuses broad cohorts during the first controlled test", () => {
    expect(
      evaluateVerifactuPreproductionActivation({
        userId: USER_ID,
        localDocumentId: DOCUMENT_ID,
        env: env({
          VERIFACTU_AEAT_PREPRODUCTION_USER_IDS: `${USER_ID},another-user`,
        }),
      }),
    ).toEqual({ enabled: false, reason: "scope_not_minimal" });
    expect(
      evaluateVerifactuPreproductionActivation({
        userId: USER_ID,
        localDocumentId: DOCUMENT_ID,
        env: env({
          VERIFACTU_AEAT_PREPRODUCTION_DOCUMENT_IDS: `${DOCUMENT_ID},another-document`,
        }),
      }),
    ).toEqual({ enabled: false, reason: "scope_not_minimal" });
  });

  it("gives the kill switch priority over every allowlist", () => {
    expect(
      evaluateVerifactuPreproductionActivation({
        userId: USER_ID,
        localDocumentId: DOCUMENT_ID,
        env: env({ VERIFACTU_AEAT_PREPRODUCTION_KILL_SWITCH: "true" }),
      }),
    ).toEqual({ enabled: false, reason: "kill_switch" });
  });
});
