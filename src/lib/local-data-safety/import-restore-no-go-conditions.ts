// PHASE2D97_IMPORT_RESTORE_NO_GO_CONDITIONS_REGISTRY_V1

export type ImportRestoreNoGoConditionId =
  | "route_exists"
  | "navigation_connected"
  | "browser_storage_write_enabled"
  | "file_reader_enabled"
  | "download_enabled"
  | "apply_import_enabled"
  | "apply_restore_enabled"
  | "real_data_used"
  | "protected_documents_not_blocked"
  | "forbidden_copy_present"
  | "supabase_imported"
  | "secrets_detected";

export interface ImportRestoreNoGoConditionInput {
  routeExists?: boolean;
  navigationConnected?: boolean;
  browserStorageWriteEnabled?: boolean;
  fileReaderEnabled?: boolean;
  downloadEnabled?: boolean;
  applyImportEnabled?: boolean;
  applyRestoreEnabled?: boolean;
  realDataUsed?: boolean;
  protectedDocumentsNotBlocked?: boolean;
  forbiddenCopyPresent?: boolean;
  supabaseImported?: boolean;
  secretsDetected?: boolean;
}

export interface ImportRestoreNoGoCondition {
  id: ImportRestoreNoGoConditionId;
  label: string;
  active: boolean;
  severity: "blocker";
  requiresNoEnablement: boolean;
}

export interface ImportRestoreNoGoConditionsRegistry {
  marker: "PHASE2D97_IMPORT_RESTORE_NO_GO_CONDITIONS_REGISTRY_V1";
  generatedAt: string;
  conditions: ImportRestoreNoGoCondition[];
  activeConditionIds: ImportRestoreNoGoConditionId[];
  noGo: boolean;
  routeAllowed: false;
  navigationAllowed: false;
  applyImportAllowed: false;
  applyRestoreAllowed: false;
  realDataAllowed: false;
  safe: true;
}

export interface ImportRestoreNoGoConditionsSummary {
  activeConditionIds: ImportRestoreNoGoConditionId[];
  noGo: boolean;
  totalConditions: number;
  routeAllowed: false;
  navigationAllowed: false;
  applyImportAllowed: false;
  applyRestoreAllowed: false;
  safe: true;
}

const definitions: Array<{
  id: ImportRestoreNoGoConditionId;
  label: string;
  inputKey: keyof ImportRestoreNoGoConditionInput;
}> = [
  { id: "route_exists", label: "Route exists", inputKey: "routeExists" },
  { id: "navigation_connected", label: "Navigation connected", inputKey: "navigationConnected" },
  { id: "browser_storage_write_enabled", label: "Browser storage write enabled", inputKey: "browserStorageWriteEnabled" },
  { id: "file_reader_enabled", label: "File reader enabled", inputKey: "fileReaderEnabled" },
  { id: "download_enabled", label: "Download enabled", inputKey: "downloadEnabled" },
  { id: "apply_import_enabled", label: "Import apply enabled", inputKey: "applyImportEnabled" },
  { id: "apply_restore_enabled", label: "Restore apply enabled", inputKey: "applyRestoreEnabled" },
  { id: "real_data_used", label: "Real data used", inputKey: "realDataUsed" },
  { id: "protected_documents_not_blocked", label: "Protected documents not blocked", inputKey: "protectedDocumentsNotBlocked" },
  { id: "forbidden_copy_present", label: "Forbidden copy present", inputKey: "forbiddenCopyPresent" },
  { id: "supabase_imported", label: "Supabase imported", inputKey: "supabaseImported" },
  { id: "secrets_detected", label: "Secrets detected", inputKey: "secretsDetected" },
];

export function listImportRestoreNoGoConditions(
  input: ImportRestoreNoGoConditionInput = {},
): ImportRestoreNoGoCondition[] {
  return definitions.map((definition) => ({
    id: definition.id,
    label: definition.label,
    active: input[definition.inputKey] === true,
    severity: "blocker",
    requiresNoEnablement: true,
  }));
}

export function evaluateImportRestoreNoGoConditions(
  input: ImportRestoreNoGoConditionInput & { generatedAt?: string } = {},
): ImportRestoreNoGoConditionsRegistry {
  const conditions = listImportRestoreNoGoConditions(input);
  const activeConditionIds = conditions.filter((condition) => condition.active).map((condition) => condition.id);
  return {
    marker: "PHASE2D97_IMPORT_RESTORE_NO_GO_CONDITIONS_REGISTRY_V1",
    generatedAt: input.generatedAt ?? new Date().toISOString(),
    conditions,
    activeConditionIds,
    noGo: activeConditionIds.length > 0,
    routeAllowed: false,
    navigationAllowed: false,
    applyImportAllowed: false,
    applyRestoreAllowed: false,
    realDataAllowed: false,
    safe: true,
  };
}

export function summarizeImportRestoreNoGoConditions(
  registry: ImportRestoreNoGoConditionsRegistry,
): ImportRestoreNoGoConditionsSummary {
  return {
    activeConditionIds: [...registry.activeConditionIds],
    noGo: registry.noGo,
    totalConditions: registry.conditions.length,
    routeAllowed: false,
    navigationAllowed: false,
    applyImportAllowed: false,
    applyRestoreAllowed: false,
    safe: true,
  };
}
