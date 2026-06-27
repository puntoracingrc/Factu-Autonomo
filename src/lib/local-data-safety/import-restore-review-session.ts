import { buildImportRestoreDisabledActions, summarizeImportRestoreDisabledActions } from "./import-restore-disabled-actions";
import {
  createImportRestorePreviewFlowState,
  summarizeImportRestorePreviewFlowState,
  transitionImportRestorePreviewFlowState,
  type ImportRestorePreviewFlowEvent,
  type ImportRestorePreviewFlowState,
  type ImportRestorePreviewFlowSummary,
} from "./import-restore-preview-state-machine";
import type { ImportRestoreSyntheticUiFixtureId } from "./import-restore-ui-fixtures";
import type { LocalDataRiskFlag } from "./types";

// PHASE2D48_IMPORT_RESTORE_REVIEW_SESSION_MODEL_V1

export interface ImportRestoreReviewSessionInput {
  fixtureId?: ImportRestoreSyntheticUiFixtureId;
  flowState?: ImportRestorePreviewFlowState;
  sessionId?: string;
  createdAt?: string;
}

export interface ImportRestoreReviewSession {
  marker: "PHASE2D48_IMPORT_RESTORE_REVIEW_SESSION_MODEL_V1";
  sessionId: string;
  fixtureId?: ImportRestoreSyntheticUiFixtureId;
  createdAt: string;
  updatedAt: string;
  currentState: ImportRestorePreviewFlowState["status"];
  flowState: ImportRestorePreviewFlowState;
  flowSummary: ImportRestorePreviewFlowSummary;
  manualReviewFlags: LocalDataRiskFlag[];
  disabledActions: ReturnType<typeof summarizeImportRestoreDisabledActions>;
  auditEvents: Array<{
    eventType: string;
    occurredAt: string;
    from: string;
    to: string;
    safe: true;
  }>;
  persisted: false;
  fullBackupIncluded: false;
  applyImportAllowed: false;
  applyRestoreAllowed: false;
  safe: true;
}

export interface ImportRestoreReviewSessionSummary {
  sessionId: string;
  fixtureId?: ImportRestoreSyntheticUiFixtureId;
  currentState: ImportRestorePreviewFlowState["status"];
  manualReviewFlags: LocalDataRiskFlag[];
  auditEvents: number;
  applyImportAllowed: false;
  applyRestoreAllowed: false;
  persisted: false;
  safe: true;
}

function sessionIdFor(fixtureId: ImportRestoreSyntheticUiFixtureId | undefined, createdAt: string): string {
  return `SYNTHETIC_ONLY_SESSION_${fixtureId ?? "UNSELECTED"}_${createdAt.replace(/[^0-9]/g, "").slice(0, 14)}`;
}

function buildSession(input: ImportRestoreReviewSessionInput, flowState: ImportRestorePreviewFlowState): ImportRestoreReviewSession {
  const createdAt = input.createdAt ?? flowState.generatedAt;
  const disabledActions = buildImportRestoreDisabledActions({
    reviewModel: flowState.reviewModel,
    generatedAt: createdAt,
  });
  const manualReviewFlags = flowState.riskFlags.filter((flag) =>
    /protected|snapshot|counter|manual|malformed|validation|intake/i.test(flag),
  );
  return {
    marker: "PHASE2D48_IMPORT_RESTORE_REVIEW_SESSION_MODEL_V1",
    sessionId: input.sessionId ?? sessionIdFor(input.fixtureId ?? flowState.fixtureId, createdAt),
    fixtureId: input.fixtureId ?? flowState.fixtureId,
    createdAt,
    updatedAt: createdAt,
    currentState: flowState.status,
    flowState,
    flowSummary: summarizeImportRestorePreviewFlowState(flowState),
    manualReviewFlags,
    disabledActions: summarizeImportRestoreDisabledActions(disabledActions),
    auditEvents: flowState.auditTrail.map((event) => ({
      eventType: event.eventType,
      occurredAt: event.occurredAt,
      from: event.from,
      to: event.to,
      safe: true,
    })),
    persisted: false,
    fullBackupIncluded: false,
    applyImportAllowed: false,
    applyRestoreAllowed: false,
    safe: true,
  };
}

export function createImportRestoreReviewSession(
  input: ImportRestoreReviewSessionInput = {},
): ImportRestoreReviewSession {
  const initialState = input.flowState ?? createImportRestorePreviewFlowState(input.createdAt);
  return buildSession(input, initialState);
}

export function updateImportRestoreReviewSession(
  session: ImportRestoreReviewSession,
  event: ImportRestorePreviewFlowEvent,
): ImportRestoreReviewSession {
  const flowState = transitionImportRestorePreviewFlowState(session.flowState, event);
  return {
    ...buildSession(
      {
        fixtureId: flowState.fixtureId ?? session.fixtureId,
        sessionId: session.sessionId,
        createdAt: session.createdAt,
      },
      flowState,
    ),
    updatedAt: event.occurredAt ?? new Date().toISOString(),
  };
}

export function summarizeImportRestoreReviewSession(
  session: ImportRestoreReviewSession,
): ImportRestoreReviewSessionSummary {
  return {
    sessionId: session.sessionId,
    fixtureId: session.fixtureId,
    currentState: session.currentState,
    manualReviewFlags: [...session.manualReviewFlags],
    auditEvents: session.auditEvents.length,
    applyImportAllowed: false,
    applyRestoreAllowed: false,
    persisted: false,
    safe: true,
  };
}
