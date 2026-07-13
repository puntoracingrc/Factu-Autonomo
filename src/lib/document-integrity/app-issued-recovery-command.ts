import type { AppDataDurabilityResult } from "@/lib/app-data-durability";
import type { AppData } from "@/lib/types";
import { inspectUsableHistoricalDocumentEvidence } from "./legacy-import-attestation";
import { withDocumentRelationshipIntegritySignals } from "./relationships";
import {
  applyAppIssuedDocumentRecovery,
  inspectAppIssuedDocumentRecovery,
  inspectAppIssuedDocumentRecoveryCollection,
  rollbackAppIssuedDocumentRecovery,
} from "./app-issued-recovery";

type ApplyDomainResult = ReturnType<typeof applyAppIssuedDocumentRecovery>;
type RollbackDomainResult = ReturnType<
  typeof rollbackAppIssuedDocumentRecovery
>;

type ApplyDomainBlockedResult = Extract<
  ApplyDomainResult,
  { status: "blocked" }
>;
type RollbackDomainBlockedResult = Extract<
  RollbackDomainResult,
  { status: "blocked" }
>;

type AppliedDomainResult = Extract<ApplyDomainResult, { status: "applied" }>;
type RolledBackDomainResult = Extract<
  RollbackDomainResult,
  { status: "applied" }
>;

export type AppIssuedDocumentRecoveryPreview = Parameters<
  typeof applyAppIssuedDocumentRecovery
>[1];
export type AppIssuedDocumentRecoveryRollbackPreview = Parameters<
  typeof rollbackAppIssuedDocumentRecovery
>[1];

export type AppliedAppIssuedDocumentRecovery = Omit<
  AppliedDomainResult,
  "status" | "data"
>;
export type RolledBackAppIssuedDocumentRecovery = Omit<
  RolledBackDomainResult,
  "status" | "data"
>;

export type DurableAppIssuedDocumentRecoveryResult =
  | AppDataDurabilityResult<AppliedAppIssuedDocumentRecovery>
  | ApplyDomainBlockedResult;
export type DurableAppIssuedDocumentRecoveryRollbackResult =
  | AppDataDurabilityResult<RolledBackAppIssuedDocumentRecovery>
  | RollbackDomainBlockedResult;

type DurableCommit = <T>(
  expected: AppData,
  build: (previous: AppData) => { data: AppData; value: T },
) => AppDataDurabilityResult<T>;

function withoutTransitionEnvelope<
  T extends { status: "applied"; data: AppData },
>(transition: T): Omit<T, "status" | "data"> {
  const { status: _status, data: _data, ...value } = transition;
  void _status;
  void _data;
  return value;
}

function withFreshRelationshipSignals(data: AppData): AppData {
  return {
    ...data,
    documents: withDocumentRelationshipIntegritySignals(data.documents),
  };
}

function applyTargetDocumentIds(
  preview: AppIssuedDocumentRecoveryPreview,
): Set<string> {
  return new Set(
    (preview.candidates ?? []).flatMap((candidate) =>
      (candidate.members ?? []).map((member) => member.documentId),
    ),
  );
}

function rollbackTargetDocumentIds(
  preview: AppIssuedDocumentRecoveryRollbackPreview,
): Set<string> {
  return new Set(
    (preview.candidates ?? []).flatMap(
      (candidate) => candidate.documentIds ?? [],
    ),
  );
}

function activeTargetsRemainGloballyUsable(
  data: AppData,
  targetDocumentIds: ReadonlySet<string>,
): boolean {
  if (targetDocumentIds.size === 0) return true;
  const collection = inspectAppIssuedDocumentRecoveryCollection(data.documents);
  const documentsById = new Map(
    data.documents.map((document) => [document.id, document] as const),
  );
  return [...targetDocumentIds].every((documentId) => {
    const document = documentsById.get(documentId);
    if (!document || !inspectUsableHistoricalDocumentEvidence(document).ok) {
      return false;
    }
    return document.appIssuedRecoveryAttestation?.status === "applied"
      ? collection.validDocumentIds.has(documentId)
      : true;
  });
}

function rolledBackTargetsRemainGloballyValid(
  data: AppData,
  targetDocumentIds: ReadonlySet<string>,
): boolean {
  if (targetDocumentIds.size === 0) return true;
  const collection = inspectAppIssuedDocumentRecoveryCollection(data.documents);
  const documentsById = new Map(
    data.documents.map((document) => [document.id, document] as const),
  );
  return [...targetDocumentIds].every((documentId) => {
    const document = documentsById.get(documentId);
    if (
      !document ||
      !collection.claimedDocumentIds.has(documentId) ||
      collection.issuesByDocumentId.has(documentId)
    ) {
      return false;
    }
    const recovery = inspectAppIssuedDocumentRecovery(document);
    return recovery.ok && !recovery.active;
  });
}

function sameDurableData(left: AppData, right: AppData): boolean {
  try {
    return JSON.stringify(left) === JSON.stringify(right);
  } catch {
    return false;
  }
}

/**
 * Adapta el apply puro al único commit durable de AppStore. El motor valida la
 * vista previa y la evidencia antes de llegar aquí; este comando no publica
 * memoria ni ofrece una ruta de persistencia alternativa.
 */
export function runAppIssuedDocumentRecoveryCommand(input: {
  expected: AppData;
  preview: AppIssuedDocumentRecoveryPreview;
  now: string;
  commit: DurableCommit;
}): DurableAppIssuedDocumentRecoveryResult {
  const transition = applyAppIssuedDocumentRecovery(
    input.expected,
    input.preview,
    input.now,
  );
  if (transition.status === "blocked") return transition;

  const candidate = withFreshRelationshipSignals(transition.data);
  const isReplay =
    transition.appliedRepairIds.length === 0 &&
    transition.data === input.expected;
  if (transition.appliedRepairIds.length === 0) {
    if (!isReplay || !sameDurableData(candidate, input.expected)) {
      return { status: "blocked", reason: "stale_preview" };
    }
  }
  if (
    !activeTargetsRemainGloballyUsable(
      candidate,
      applyTargetDocumentIds(input.preview),
    )
  ) {
    return { status: "blocked", reason: "candidate_invalid" };
  }

  const value = withoutTransitionEnvelope(transition);
  if (isReplay) {
    return {
      status: "applied",
      data: input.expected,
      value,
      replayed: true,
    };
  }

  return input.commit(input.expected, () => ({
    data: candidate,
    value,
  }));
}

/**
 * El rollback comparte la misma frontera durable: o el estado anterior y su
 * evento de auditoría se guardan juntos, o AppStore no publica nada.
 */
export function runAppIssuedDocumentRecoveryRollbackCommand(input: {
  expected: AppData;
  preview: AppIssuedDocumentRecoveryRollbackPreview;
  now: string;
  commit: DurableCommit;
}): DurableAppIssuedDocumentRecoveryRollbackResult {
  const transition = rollbackAppIssuedDocumentRecovery(
    input.expected,
    input.preview,
    input.now,
  );
  if (transition.status === "blocked") return transition;

  const targetDocumentIds = rollbackTargetDocumentIds(input.preview);
  const candidate = withFreshRelationshipSignals(transition.data);
  const isReplay =
    transition.rolledBackRepairIds.length === 0 &&
    transition.data === input.expected;
  if (
    transition.rolledBackRepairIds.length === 0 &&
    (!isReplay || !sameDurableData(candidate, input.expected))
  ) {
    return { status: "blocked", reason: "stale_preview" };
  }
  if (
    isReplay
      ? !rolledBackTargetsRemainGloballyValid(candidate, targetDocumentIds)
      : !activeTargetsRemainGloballyUsable(
          withFreshRelationshipSignals(input.expected),
          targetDocumentIds,
        ) || !rolledBackTargetsRemainGloballyValid(candidate, targetDocumentIds)
  ) {
    return { status: "blocked", reason: "candidate_invalid" };
  }

  const value = withoutTransitionEnvelope(transition);
  if (isReplay) {
    return {
      status: "applied",
      data: input.expected,
      value,
      replayed: true,
    };
  }

  return input.commit(input.expected, () => ({
    data: candidate,
    value,
  }));
}
