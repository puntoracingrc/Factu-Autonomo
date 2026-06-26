export type OfficialGateBlocker =
  | "BLOCKED_XSD_NOT_COMMITTED"
  | "BLOCKED_XSD_CHECKSUM_NOT_VERIFIABLE"
  | "BLOCKED_XSD_IMPORT_GRAPH_NOT_VERIFIED"
  | "BLOCKED_XSD_FIXTURE_PATH_OUTSIDE_ALLOWED_DIR"
  | "BLOCKED_XSD_FIXTURE_EXTENSION_FORBIDDEN"
  | "BLOCKED_NO_SAFE_OFFLINE_XSD_VALIDATOR"
  | "BLOCKED_NO_COMPLETE_OFFICIAL_SAFE_SYNTHETIC_DATA"
  | "BLOCKED_OFFICIAL_FIELD_MAPPING_NOT_READY";

export type OfficialGateErrorCode =
  | "OFFICIAL_ARTIFACT_INTAKE_BLOCKED"
  | "OFFLINE_XSD_VALIDATOR_BLOCKED"
  | "OFFICIAL_XML_PREFLIGHT_BLOCKED"
  | "OFFICIAL_BLOCKER_REPORT_BLOCKED";

export const OFFICIAL_GATE_BLOCKER_MESSAGES = {
  BLOCKED_XSD_NOT_COMMITTED:
    "Official XSD fixtures are not committed for offline use.",
  BLOCKED_XSD_CHECKSUM_NOT_VERIFIABLE:
    "Official XSD checksums cannot be verified locally without committed fixtures.",
  BLOCKED_XSD_IMPORT_GRAPH_NOT_VERIFIED:
    "Official XSD import/include graph is not verified offline.",
  BLOCKED_XSD_FIXTURE_PATH_OUTSIDE_ALLOWED_DIR:
    "Official XSD fixture path is outside the allowed fixture directory.",
  BLOCKED_XSD_FIXTURE_EXTENSION_FORBIDDEN:
    "Official artifact fixture extension is not allowed for executable XML gates.",
  BLOCKED_NO_SAFE_OFFLINE_XSD_VALIDATOR:
    "No safe offline XSD validator is selected.",
  BLOCKED_NO_COMPLETE_OFFICIAL_SAFE_SYNTHETIC_DATA:
    "No complete official safe synthetic data set is available for alta and anulacion.",
  BLOCKED_OFFICIAL_FIELD_MAPPING_NOT_READY:
    "Official field mapping is not fully ready for aligned XML serialization.",
} as const satisfies Record<OfficialGateBlocker, string>;
