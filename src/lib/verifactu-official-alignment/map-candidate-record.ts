import { buildSyntheticCandidateInputFromDescriptor } from "../verifactu-candidate-pipeline";
import type { SyntheticFixtureDescriptor } from "../verifactu-synthetic-fixtures/types";
import { OFFICIAL_ARTIFACT_GATE } from "./artifact-manifest";
import { officialMappingErrorMessage } from "./errors";
import { officialMappingsForRecordKind } from "./field-map";
import type {
  OfficialAlignedMappingResult,
  OfficialMappingError,
  OfficialRecordKind,
} from "./types";

const POSITIVE_KIND_TO_RECORD_KIND = {
  alta_basic: "registro_alta",
  chain_first: "registro_alta",
  chain_second: "registro_alta",
  cancel_basic: "registro_anulacion",
} as const;

function error(
  code: OfficialMappingError["code"],
  descriptor?: Pick<SyntheticFixtureDescriptor, "id" | "kind">,
  path?: string,
): OfficialMappingError {
  return {
    code,
    message: officialMappingErrorMessage(code),
    descriptorId: descriptor?.id,
    kind: descriptor?.kind,
    path,
  };
}

function isPositiveMappableKind(
  kind: string,
): kind is keyof typeof POSITIVE_KIND_TO_RECORD_KIND {
  return Object.hasOwn(POSITIVE_KIND_TO_RECORD_KIND, kind);
}

function mappingErrorsForRecordKind(
  recordKind: OfficialRecordKind,
  descriptor: Pick<SyntheticFixtureDescriptor, "id" | "kind">,
): OfficialMappingError[] {
  const mappings = officialMappingsForRecordKind(recordKind);
  const errors: OfficialMappingError[] = [];

  for (const mapping of mappings) {
    if (mapping.mappingStatus === "pending") {
      errors.push(error("mapping_pending", descriptor, mapping.officialPath));
    }
    if (mapping.mappingStatus === "blocked") {
      errors.push(error("mapping_blocked", descriptor, mapping.officialPath));
    }
  }

  return errors;
}

export function mapSyntheticCandidateToOfficialAlignedModel(
  descriptor: SyntheticFixtureDescriptor,
): OfficialAlignedMappingResult {
  const inputResult = buildSyntheticCandidateInputFromDescriptor(descriptor);
  if (inputResult.status === "rejected") {
    return {
      status: "rejected",
      descriptorId: descriptor.id,
      kind: descriptor.kind,
      syntheticOnly: true,
      finality: "candidate_not_aeat",
      transportable: false,
      errors: [error("candidate_input_rejected", descriptor)],
    };
  }

  if (!isPositiveMappableKind(inputResult.input.kind)) {
    return {
      status: "rejected",
      descriptorId: inputResult.input.descriptorId,
      kind: inputResult.input.kind,
      syntheticOnly: true,
      finality: "candidate_not_aeat",
      transportable: false,
      errors: [error("descriptor_negative_not_mappable", descriptor)],
    };
  }

  const recordKind = POSITIVE_KIND_TO_RECORD_KIND[inputResult.input.kind];
  const mappingErrors = mappingErrorsForRecordKind(recordKind, descriptor);
  const gateBlocked =
    OFFICIAL_ARTIFACT_GATE.status === "blocked"
      ? [error("official_artifact_gate_blocked", descriptor)]
      : [];

  const syntheticValueErrors = [
    inputResult.input.issuerReference,
    inputResult.input.invoiceReference,
    inputResult.input.previousCandidateHash,
  ]
    .filter((value): value is string => typeof value === "string")
    .filter((value) => value.startsWith("SYNTHETIC_ONLY_"))
    .map((value) =>
      error("synthetic_value_not_official_example", descriptor, value),
    );

  const errors = [...gateBlocked, ...mappingErrors, ...syntheticValueErrors];
  if (errors.length > 0) {
    return {
      status: "rejected",
      descriptorId: inputResult.input.descriptorId,
      kind: inputResult.input.kind,
      syntheticOnly: true,
      finality: "candidate_not_aeat",
      transportable: false,
      errors,
    };
  }

  return {
    status: "mapped",
    model: {
      descriptorId: inputResult.input.descriptorId,
      sourceKind: inputResult.input.kind,
      recordKind,
      syntheticOnly: true,
      finality: "candidate_not_aeat",
      transportable: false,
      artifactIds: [],
      fieldValues: [],
    },
    errors: [],
  };
}
