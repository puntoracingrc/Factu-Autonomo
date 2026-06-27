// PHASE2D81_HIDDEN_IMPORT_RESTORE_UI_SHELL_FLAG_CONTRACT_V1

export type HiddenImportRestoreUiShellFlagStatus =
  | "disabled_by_default"
  | "enabled_routeless_preview_only"
  | "disabled_invalid_flag"
  | "disabled_public_flag_rejected"
  | "disabled_production_or_remote";

export interface HiddenImportRestoreUiShellFlagInput {
  envLike?: Record<string, string | undefined>;
  runtime?: "local" | "test" | "development" | "production" | "staging" | "remote";
  generatedAt?: string;
}

export interface HiddenImportRestoreUiShellFlag {
  marker: "PHASE2D81_HIDDEN_IMPORT_RESTORE_UI_SHELL_FLAG_CONTRACT_V1";
  status: HiddenImportRestoreUiShellFlagStatus;
  mode: "disabled" | "routeless_preview_only";
  generatedAt: string;
  reasons: string[];
  hidden: true;
  routelessOnly: true;
  routeAllowed: false;
  navigationAllowed: false;
  publicFlagRejected: boolean;
  applyImportAllowed: false;
  applyRestoreAllowed: false;
  safe: true;
}

export interface HiddenImportRestoreUiShellFlagSummary {
  status: HiddenImportRestoreUiShellFlagStatus;
  mode: HiddenImportRestoreUiShellFlag["mode"];
  reasons: string[];
  hidden: true;
  routelessOnly: true;
  routeAllowed: false;
  navigationAllowed: false;
  applyImportAllowed: false;
  applyRestoreAllowed: false;
  safe: true;
}

const enabledKey = "IMPORT_RESTORE_HIDDEN_UI_SHELL_ENABLED";
const modeKey = "IMPORT_RESTORE_HIDDEN_UI_SHELL_MODE";

function hasPublicFlag(envLike: Record<string, string | undefined>): boolean {
  return Object.keys(envLike).some((key) => key.startsWith("NEXT_PUBLIC_"));
}

function remoteRuntime(runtime?: HiddenImportRestoreUiShellFlagInput["runtime"]): boolean {
  return runtime === "production" || runtime === "staging" || runtime === "remote";
}

export function evaluateHiddenImportRestoreUiShellFlag(
  input: HiddenImportRestoreUiShellFlagInput = {},
): HiddenImportRestoreUiShellFlag {
  const envLike = input.envLike ?? {};
  const publicFlagRejected = hasPublicFlag(envLike);
  const reasons: string[] = [];
  let status: HiddenImportRestoreUiShellFlagStatus = "disabled_by_default";
  let mode: HiddenImportRestoreUiShellFlag["mode"] = "disabled";

  if (publicFlagRejected) {
    status = "disabled_public_flag_rejected";
    reasons.push("Public UI shell flags are rejected.");
  } else if (remoteRuntime(input.runtime)) {
    status = "disabled_production_or_remote";
    reasons.push("Production, staging and remote runtimes keep the hidden shell disabled.");
  } else if (envLike[enabledKey] === "true" && envLike[modeKey] === "routeless_preview_only") {
    status = "enabled_routeless_preview_only";
    mode = "routeless_preview_only";
    reasons.push("Injected local flag enables hidden routeless preview-only shell.");
  } else if (envLike[enabledKey] !== undefined || envLike[modeKey] !== undefined) {
    status = "disabled_invalid_flag";
    reasons.push("Both injected hidden shell flag values are required.");
  } else {
    reasons.push("Hidden import/restore UI shell is disabled by default.");
  }

  return {
    marker: "PHASE2D81_HIDDEN_IMPORT_RESTORE_UI_SHELL_FLAG_CONTRACT_V1",
    status,
    mode,
    generatedAt: input.generatedAt ?? new Date().toISOString(),
    reasons,
    hidden: true,
    routelessOnly: true,
    routeAllowed: false,
    navigationAllowed: false,
    publicFlagRejected,
    applyImportAllowed: false,
    applyRestoreAllowed: false,
    safe: true,
  };
}

export function assertHiddenImportRestoreUiShellDisabledByDefault(
  flag = evaluateHiddenImportRestoreUiShellFlag(),
): HiddenImportRestoreUiShellFlag {
  if (flag.status !== "disabled_by_default" || flag.mode !== "disabled") {
    throw new Error("Hidden import/restore UI shell must be disabled by default.");
  }
  if (flag.routeAllowed !== false || flag.navigationAllowed !== false) {
    throw new Error("Hidden import/restore UI shell must remain routeless.");
  }
  return flag;
}

export function summarizeHiddenImportRestoreUiShellFlag(
  flag: HiddenImportRestoreUiShellFlag,
): HiddenImportRestoreUiShellFlagSummary {
  return {
    status: flag.status,
    mode: flag.mode,
    reasons: [...flag.reasons],
    hidden: true,
    routelessOnly: true,
    routeAllowed: false,
    navigationAllowed: false,
    applyImportAllowed: false,
    applyRestoreAllowed: false,
    safe: true,
  };
}
