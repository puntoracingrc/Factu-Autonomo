export type LocalArtifactInspectionBlocker =
  | "BLOCKED_LOCAL_ARTIFACT_DIRECTORY_NOT_PROVIDED"
  | "BLOCKED_LOCAL_ARTIFACT_DIRECTORY_NOT_FOUND"
  | "BLOCKED_LOCAL_ARTIFACT_DIRECTORY_NOT_ALLOWED"
  | "BLOCKED_LOCAL_ARTIFACT_DIRECTORY_INSIDE_REPO_SOURCE"
  | "BLOCKED_LOCAL_ARTIFACT_SECRET_FILENAME_DETECTED"
  | "BLOCKED_REQUIRED_XSD_FILE_MISSING"
  | "BLOCKED_FORBIDDEN_ARTIFACT_EXTENSION"
  | "BLOCKED_LOCAL_ARTIFACT_EXTENSION_NOT_ALLOWED"
  | "BLOCKED_LOCAL_ARTIFACT_TOO_LARGE"
  | "BLOCKED_LOCAL_ARTIFACT_FILE_NOT_FOUND"
  | "BLOCKED_LOCAL_ARTIFACT_NOT_A_FILE"
  | "BLOCKED_LOCAL_ARTIFACT_CHECKSUM_MISMATCH"
  | "BLOCKED_LOCAL_XSD_REMOTE_REFERENCE"
  | "BLOCKED_LOCAL_XSD_TRAVERSAL_REFERENCE"
  | "BLOCKED_LOCAL_XSD_DEPENDENCY_MISSING"
  | "BLOCKED_LOCAL_XSD_GRAPH_NOT_READY"
  | "BLOCKED_NO_SAFE_OFFLINE_XSD_VALIDATOR"
  | "BLOCKED_NO_COMPLETE_OFFICIAL_SAFE_SYNTHETIC_DATA";

export type LocalArtifactReadinessErrorCode =
  | "LOCAL_ARTIFACT_INTAKE_BLOCKED"
  | "LOCAL_ARTIFACT_CHECKSUM_BLOCKED"
  | "LOCAL_XSD_IMPORT_GRAPH_BLOCKED"
  | "LOCAL_ARTIFACT_READINESS_BLOCKED";

export const LOCAL_ARTIFACT_BLOCKER_MESSAGES = {
  BLOCKED_LOCAL_ARTIFACT_DIRECTORY_NOT_PROVIDED:
    "A local artifact directory must be provided explicitly.",
  BLOCKED_LOCAL_ARTIFACT_DIRECTORY_NOT_FOUND:
    "The local artifact directory was not found.",
  BLOCKED_LOCAL_ARTIFACT_DIRECTORY_NOT_ALLOWED:
    "The local artifact directory is not allowed for readiness inspection.",
  BLOCKED_LOCAL_ARTIFACT_DIRECTORY_INSIDE_REPO_SOURCE:
    "The local artifact directory must not be inside source, docs, public, app or .git.",
  BLOCKED_LOCAL_ARTIFACT_SECRET_FILENAME_DETECTED:
    "A local artifact filename looks like a secret or certificate.",
  BLOCKED_REQUIRED_XSD_FILE_MISSING:
    "A required local XSD file is missing.",
  BLOCKED_FORBIDDEN_ARTIFACT_EXTENSION:
    "A forbidden artifact extension was found in the local artifact directory.",
  BLOCKED_LOCAL_ARTIFACT_EXTENSION_NOT_ALLOWED:
    "Only local .xsd files are allowed for this inspection phase.",
  BLOCKED_LOCAL_ARTIFACT_TOO_LARGE:
    "The local artifact exceeds the configured safe size limit.",
  BLOCKED_LOCAL_ARTIFACT_FILE_NOT_FOUND:
    "The local artifact file was not found.",
  BLOCKED_LOCAL_ARTIFACT_NOT_A_FILE:
    "The local artifact path is not a file.",
  BLOCKED_LOCAL_ARTIFACT_CHECKSUM_MISMATCH:
    "The local artifact checksum does not match the expected checksum.",
  BLOCKED_LOCAL_XSD_REMOTE_REFERENCE:
    "The local XSD import/include graph contains a remote reference.",
  BLOCKED_LOCAL_XSD_TRAVERSAL_REFERENCE:
    "The local XSD import/include graph points outside the base directory.",
  BLOCKED_LOCAL_XSD_DEPENDENCY_MISSING:
    "The local XSD import/include graph has a missing local dependency.",
  BLOCKED_LOCAL_XSD_GRAPH_NOT_READY:
    "The local XSD import/include graph is not ready.",
  BLOCKED_NO_SAFE_OFFLINE_XSD_VALIDATOR:
    "No safe offline XSD validator is selected.",
  BLOCKED_NO_COMPLETE_OFFICIAL_SAFE_SYNTHETIC_DATA:
    "No complete official safe synthetic data set is available.",
} as const satisfies Record<LocalArtifactInspectionBlocker, string>;
