import { describe, expect, it } from "vitest";
import {
  evaluateHiddenUiEnablementEnvironment,
  summarizeHiddenUiEnablementEnvironment,
} from "./hidden-ui-enablement-environment";

// PHASE2D94_HIDDEN_UI_ENABLEMENT_ENVIRONMENT_CONTRACT_V1

describe("PHASE2D94 hidden UI enablement environment", () => {
  it("is inactive with an empty environment", () => {
    const environment = evaluateHiddenUiEnablementEnvironment({ generatedAt: "2026-06-27T00:00:00.000Z" });

    expect(environment.status).toBe("inactive_by_default");
    expect(environment.requested).toBe(false);
    expect(environment.enablementAllowed).toBe(false);
  });

  it("rejects public flags", () => {
    const environment = evaluateHiddenUiEnablementEnvironment({ envLike: { NEXT_PUBLIC_IMPORT_RESTORE: "true" } });

    expect(environment.status).toBe("rejected_public_flag");
    expect(environment.publicFlagRejected).toBe(true);
  });

  it("rejects production and remote runtimes", () => {
    expect(evaluateHiddenUiEnablementEnvironment({ runtime: "production" }).status).toBe("rejected_production_or_remote");
    expect(evaluateHiddenUiEnablementEnvironment({ runtime: "remote" }).status).toBe("rejected_production_or_remote");
  });

  it("returns dry-run summary only for safe injected values", () => {
    const environment = evaluateHiddenUiEnablementEnvironment({
      runtime: "test",
      envLike: {
        IMPORT_RESTORE_HIDDEN_UI_ENABLEMENT_REQUESTED: "true",
        IMPORT_RESTORE_HIDDEN_UI_ENABLEMENT_MODE: "routeless_preview_only",
        IMPORT_RESTORE_HIDDEN_UI_OWNER_APPROVED: "true",
      },
    });
    const summary = summarizeHiddenUiEnablementEnvironment(environment);

    expect(summary.status).toBe("dry_run_requested");
    expect(summary.ownerApprovedFlag).toBe(true);
    expect(summary.enablementAllowed).toBe(false);
    expect(summary.safe).toBe(true);
  });
});
