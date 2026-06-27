import { describe, expect, it } from "vitest";
import {
  assertHiddenImportRestoreUiShellDisabledByDefault,
  evaluateHiddenImportRestoreUiShellFlag,
  summarizeHiddenImportRestoreUiShellFlag,
} from "./hidden-ui-shell-flag";

// PHASE2D81_HIDDEN_IMPORT_RESTORE_UI_SHELL_FLAG_CONTRACT_V1

describe("hidden import/restore UI shell flag", () => {
  it("is disabled by default without reading global environment", () => {
    const flag = evaluateHiddenImportRestoreUiShellFlag({ generatedAt: "2026-06-27T00:00:00.000Z" });

    expect(assertHiddenImportRestoreUiShellDisabledByDefault(flag)).toBe(flag);
    expect(flag.routeAllowed).toBe(false);
    expect(flag.navigationAllowed).toBe(false);
  });

  it("keeps partial injected flags disabled", () => {
    const flag = evaluateHiddenImportRestoreUiShellFlag({
      envLike: { IMPORT_RESTORE_HIDDEN_UI_SHELL_ENABLED: "true" },
      runtime: "local",
    });

    expect(flag.status).toBe("disabled_invalid_flag");
    expect(flag.mode).toBe("disabled");
  });

  it("rejects public flags", () => {
    const flag = evaluateHiddenImportRestoreUiShellFlag({
      envLike: { NEXT_PUBLIC_IMPORT_RESTORE_HIDDEN_UI_SHELL_ENABLED: "true" },
      runtime: "local",
    });

    expect(flag.status).toBe("disabled_public_flag_rejected");
    expect(flag.publicFlagRejected).toBe(true);
  });

  it("keeps production and remote disabled", () => {
    for (const runtime of ["production", "staging", "remote"] as const) {
      const flag = evaluateHiddenImportRestoreUiShellFlag({
        envLike: {
          IMPORT_RESTORE_HIDDEN_UI_SHELL_ENABLED: "true",
          IMPORT_RESTORE_HIDDEN_UI_SHELL_MODE: "routeless_preview_only",
        },
        runtime,
      });

      expect(flag.status).toBe("disabled_production_or_remote");
      expect(flag.mode).toBe("disabled");
    }
  });

  it("enables routeless preview only for safe local injected flags", () => {
    const flag = evaluateHiddenImportRestoreUiShellFlag({
      envLike: {
        IMPORT_RESTORE_HIDDEN_UI_SHELL_ENABLED: "true",
        IMPORT_RESTORE_HIDDEN_UI_SHELL_MODE: "routeless_preview_only",
      },
      runtime: "test",
    });
    const summary = summarizeHiddenImportRestoreUiShellFlag(flag);

    expect(flag.status).toBe("enabled_routeless_preview_only");
    expect(summary.mode).toBe("routeless_preview_only");
    expect(JSON.stringify(summary)).not.toMatch(/SECRET|TOKEN|AUTHORIZATION/i);
  });
});
