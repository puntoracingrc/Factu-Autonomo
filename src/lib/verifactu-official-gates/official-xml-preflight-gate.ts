import {
  OFFICIAL_FIELD_MAPPINGS,
  OFFICIAL_SAFE_SYNTHETIC_DATA_CATALOG,
  OFFICIAL_SAFE_SYNTHETIC_DATA_GATE,
} from "../verifactu-official-alignment";
import type { OfficialFieldMapping } from "../verifactu-official-alignment";
import { evaluateOfficialArtifactIntakeGate } from "./artifact-intake-gate";
import type { OfficialGateBlocker } from "./errors";
import { createBlockedOfflineXsdValidator } from "./offline-xsd-validator-contract";
import type {
  OfficialAlignedXmlPreflightInput,
  OfficialAlignedXmlPreflightResult,
} from "./types";

export const PHASE2B7N_OFFICIAL_XML_PREFLIGHT_GATE_MARKER =
  "PHASE2B7N_OFFICIAL_ALIGNED_XML_PREFLIGHT_GATE_V1";

function uniqueBlockers(blockers: readonly OfficialGateBlocker[]): readonly OfficialGateBlocker[] {
  return [...new Set(blockers)];
}

function summarizeMappings(mappings: readonly OfficialFieldMapping[]) {
  const xmlMappings = mappings.filter(
    (mapping) => mapping.mappingStatus !== "not_applicable",
  );
  const ready = xmlMappings.filter(
    (mapping) => mapping.mappingStatus === "verified",
  ).length;
  const pending = xmlMappings.filter(
    (mapping) => mapping.mappingStatus === "pending",
  ).length;
  const blocked = xmlMappings.filter(
    (mapping) => mapping.mappingStatus === "blocked",
  ).length;

  return {
    total: xmlMappings.length,
    ready,
    pending,
    blocked,
  };
}

export function evaluateOfficialAlignedXmlPreflight(
  input: OfficialAlignedXmlPreflightInput = {},
): OfficialAlignedXmlPreflightResult {
  const artifactGate = input.artifactGate ?? evaluateOfficialArtifactIntakeGate();
  const validator = input.validator ?? createBlockedOfflineXsdValidator();
  const syntheticDataGate =
    input.syntheticDataGate ?? OFFICIAL_SAFE_SYNTHETIC_DATA_GATE;
  const syntheticDataCatalog =
    input.syntheticDataCatalog ?? OFFICIAL_SAFE_SYNTHETIC_DATA_CATALOG;
  const mappings = input.mappings ?? OFFICIAL_FIELD_MAPPINGS;

  const mappingSummary = summarizeMappings(mappings);
  const syntheticDataReady =
    syntheticDataGate.usableForXml &&
    syntheticDataGate.completeAltaCaseAvailable &&
    syntheticDataGate.completeAnulacionCaseAvailable &&
    syntheticDataCatalog.some((entry) => entry.usableForXml);
  const mappingReady =
    mappingSummary.total > 0 &&
    mappingSummary.pending === 0 &&
    mappingSummary.blocked === 0 &&
    mappingSummary.ready === mappingSummary.total;

  const blockers: OfficialGateBlocker[] = [
    ...artifactGate.blockers,
    ...validator.blockers,
  ];
  if (!syntheticDataReady) {
    blockers.push("BLOCKED_NO_COMPLETE_OFFICIAL_SAFE_SYNTHETIC_DATA");
  }
  if (!mappingReady) {
    blockers.push("BLOCKED_OFFICIAL_FIELD_MAPPING_NOT_READY");
  }

  const unique = uniqueBlockers(blockers);
  const readyForOfficialXml =
    unique.length === 0 &&
    artifactGate.status === "ready" &&
    validator.status === "ready" &&
    syntheticDataReady &&
    mappingReady;

  return {
    marker: PHASE2B7N_OFFICIAL_XML_PREFLIGHT_GATE_MARKER,
    status: readyForOfficialXml ? "ready" : "blocked",
    blockers: unique,
    canSerializeOfficialAlignedXml: readyForOfficialXml,
    canValidateOfflineXsd:
      readyForOfficialXml && validator.capabilities.canValidateOffline,
    canProceedToQr: false,
    canProceedToSignature: false,
    canProceedToTransport: false,
    artifactGate,
    validatorStatus: validator.status,
    syntheticDataReady,
    mappingReady,
    mappingSummary,
    networkUsed: false,
    supabaseUsed: false,
    transportUsed: false,
    xmlPrinted: false,
  };
}
