import { validateSyntheticFixtureDescriptor } from "../verifactu-synthetic-fixtures/fixture-policy";
import type {
  SyntheticFixtureDescriptor,
  SyntheticFixtureKind,
} from "../verifactu-synthetic-fixtures/types";
import { syntheticCandidatePipelineErrorMessage } from "./errors";
import type {
  CandidateInputBuildResult,
  SyntheticCandidatePipelineError,
  SyntheticCandidateRecordInput,
  SyntheticCandidateRejectionReason,
} from "./types";

type ControlledScenario = {
  readonly kind: SyntheticFixtureKind;
  readonly issuerReference: string;
  readonly invoiceReference: string;
  readonly issueDateCandidate: string;
  readonly operationReference: string;
  readonly recordSequenceCandidate: number;
  readonly previousCandidateHash: string | null;
  readonly amountMinorCandidate: number;
  readonly currencyCandidate: string;
  readonly expectedOutcome: SyntheticCandidateRecordInput["expectedOutcome"];
  readonly expectedRejectionReason?: SyntheticCandidateRejectionReason;
};

const CONTROLLED_SCENARIOS: Record<string, ControlledScenario> = {
  SYNTHETIC_ONLY_ALTA_BASIC_001: {
    kind: "alta_basic",
    issuerReference: "SYNTHETIC_ONLY_ISSUER_BLUE_STUDIO",
    invoiceReference: "SYNTHETIC_ONLY_DOC_ALTA_BASIC_001",
    issueDateCandidate: "2026-01-15",
    operationReference: "SYNTHETIC_ONLY_OPERATION_ALTA_BASIC_001",
    recordSequenceCandidate: 1,
    previousCandidateHash: null,
    amountMinorCandidate: 12500,
    currencyCandidate: "EUR",
    expectedOutcome: "accepted_candidate",
  },
  SYNTHETIC_ONLY_CHAIN_FIRST_001: {
    kind: "chain_first",
    issuerReference: "SYNTHETIC_ONLY_ISSUER_BLUE_STUDIO",
    invoiceReference: "SYNTHETIC_ONLY_DOC_CHAIN_FIRST_001",
    issueDateCandidate: "2026-01-16",
    operationReference: "SYNTHETIC_ONLY_OPERATION_CHAIN_FIRST_001",
    recordSequenceCandidate: 1,
    previousCandidateHash: null,
    amountMinorCandidate: 9900,
    currencyCandidate: "EUR",
    expectedOutcome: "accepted_candidate",
  },
  SYNTHETIC_ONLY_CHAIN_SECOND_001: {
    kind: "chain_second",
    issuerReference: "SYNTHETIC_ONLY_ISSUER_BLUE_STUDIO",
    invoiceReference: "SYNTHETIC_ONLY_DOC_CHAIN_SECOND_001",
    issueDateCandidate: "2026-01-17",
    operationReference: "SYNTHETIC_ONLY_OPERATION_CHAIN_SECOND_001",
    recordSequenceCandidate: 2,
    previousCandidateHash: "SYNTHETIC_ONLY_PREVIOUS_HASH_CHAIN_FIRST_001",
    amountMinorCandidate: 10100,
    currencyCandidate: "EUR",
    expectedOutcome: "accepted_candidate",
  },
  SYNTHETIC_ONLY_CANCEL_BASIC_001: {
    kind: "cancel_basic",
    issuerReference: "SYNTHETIC_ONLY_ISSUER_BLUE_STUDIO",
    invoiceReference: "SYNTHETIC_ONLY_DOC_CANCEL_BASIC_001",
    issueDateCandidate: "2026-01-18",
    operationReference: "SYNTHETIC_ONLY_OPERATION_CANCEL_BASIC_001",
    recordSequenceCandidate: 3,
    previousCandidateHash: "SYNTHETIC_ONLY_PREVIOUS_HASH_ALTA_BASIC_001",
    amountMinorCandidate: 12500,
    currencyCandidate: "EUR",
    expectedOutcome: "accepted_candidate",
  },
  SYNTHETIC_ONLY_ALTA_INVALID_NIF_001: {
    kind: "alta_invalid_nif",
    issuerReference: "SYNTHETIC_ONLY_ISSUER_RED_WORKSHOP",
    invoiceReference: "SYNTHETIC_ONLY_DOC_ALTA_INVALID_NIF_001",
    issueDateCandidate: "2026-02-10",
    operationReference: "SYNTHETIC_ONLY_OPERATION_ALTA_INVALID_NIF_001",
    recordSequenceCandidate: 1,
    previousCandidateHash: null,
    amountMinorCandidate: 8700,
    currencyCandidate: "EUR",
    expectedOutcome: "rejected_candidate",
    expectedRejectionReason: "invalid_nif_candidate",
  },
  SYNTHETIC_ONLY_ALTA_INVALID_DATE_001: {
    kind: "alta_invalid_date",
    issuerReference: "SYNTHETIC_ONLY_ISSUER_RED_WORKSHOP",
    invoiceReference: "SYNTHETIC_ONLY_DOC_ALTA_INVALID_DATE_001",
    issueDateCandidate: "SYNTHETIC_ONLY_DATE_INVALID_MONTH_13",
    operationReference: "SYNTHETIC_ONLY_OPERATION_ALTA_INVALID_DATE_001",
    recordSequenceCandidate: 1,
    previousCandidateHash: null,
    amountMinorCandidate: 4321,
    currencyCandidate: "EUR",
    expectedOutcome: "rejected_candidate",
    expectedRejectionReason: "invalid_date_candidate",
  },
  SYNTHETIC_ONLY_ALTA_MISSING_SERIES_NUMBER_001: {
    kind: "alta_missing_series_number",
    issuerReference: "SYNTHETIC_ONLY_ISSUER_RED_WORKSHOP",
    invoiceReference: "SYNTHETIC_ONLY_SERIES_NUMBER_MISSING",
    issueDateCandidate: "2026-02-12",
    operationReference:
      "SYNTHETIC_ONLY_OPERATION_ALTA_MISSING_SERIES_NUMBER_001",
    recordSequenceCandidate: 1,
    previousCandidateHash: null,
    amountMinorCandidate: 5550,
    currencyCandidate: "EUR",
    expectedOutcome: "rejected_candidate",
    expectedRejectionReason: "missing_series_number_candidate",
  },
  SYNTHETIC_ONLY_ALTA_HASH_MISMATCH_001: {
    kind: "alta_hash_mismatch",
    issuerReference: "SYNTHETIC_ONLY_ISSUER_RED_WORKSHOP",
    invoiceReference: "SYNTHETIC_ONLY_DOC_ALTA_HASH_MISMATCH_001",
    issueDateCandidate: "2026-02-13",
    operationReference: "SYNTHETIC_ONLY_OPERATION_ALTA_HASH_MISMATCH_001",
    recordSequenceCandidate: 2,
    previousCandidateHash: "SYNTHETIC_ONLY_HASH_OBSERVED_BETA",
    amountMinorCandidate: 6400,
    currencyCandidate: "EUR",
    expectedOutcome: "rejected_candidate",
    expectedRejectionReason: "candidate_hash_mismatch",
  },
};

function error(
  code: SyntheticCandidatePipelineError["code"],
  descriptor?: Pick<SyntheticFixtureDescriptor, "id" | "kind">,
  path?: string,
): SyntheticCandidatePipelineError {
  return {
    code,
    message: syntheticCandidatePipelineErrorMessage(code),
    phase: "input",
    descriptorId: descriptor?.id,
    kind: descriptor?.kind,
    path,
  };
}

export function buildSyntheticCandidateInputFromDescriptor(
  descriptor: unknown,
): CandidateInputBuildResult {
  const validation = validateSyntheticFixtureDescriptor(descriptor);
  if (validation.status === "rejected") {
    return {
      status: "rejected",
      errors: validation.errors.map((policyError) => ({
        code: "descriptor_policy_rejected",
        message: syntheticCandidatePipelineErrorMessage(
          "descriptor_policy_rejected",
        ),
        phase: "input",
        path: policyError.path,
      })),
    };
  }

  const validatedDescriptor = validation.descriptor;
  const scenario = CONTROLLED_SCENARIOS[validatedDescriptor.id];
  if (!scenario) {
    return {
      status: "rejected",
      errors: [error("descriptor_unknown", validatedDescriptor, "id")],
    };
  }

  if (scenario.kind !== validatedDescriptor.kind) {
    return {
      status: "rejected",
      errors: [
        error("descriptor_kind_mismatch", validatedDescriptor, "kind"),
      ],
    };
  }

  return {
    status: "built",
    input: {
      descriptorId: validatedDescriptor.id,
      kind: scenario.kind,
      syntheticOnly: true,
      sourcePhase: validatedDescriptor.sourcePhase,
      issuerReference: scenario.issuerReference,
      invoiceReference: scenario.invoiceReference,
      issueDateCandidate: scenario.issueDateCandidate,
      operationReference: scenario.operationReference,
      recordSequenceCandidate: scenario.recordSequenceCandidate,
      previousCandidateHash: scenario.previousCandidateHash,
      amountMinorCandidate: scenario.amountMinorCandidate,
      currencyCandidate: scenario.currencyCandidate,
      expectedOutcome: scenario.expectedOutcome,
      expectedRejectionReason: scenario.expectedRejectionReason,
    },
    errors: [],
  };
}
